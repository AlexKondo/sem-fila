import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { findOrCreateCustomer } from '@/lib/asaas';

const BASE_URL = process.env.ASAAS_API_KEY?.startsWith('$aact_hmlg')
  ? 'https://sandbox.asaas.com/api/v3'
  : 'https://api.asaas.com/api/v3';

const h = {
  'access_token': process.env.ASAAS_API_KEY!,
  'Content-Type': 'application/json',
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  let body: { type: 'plan' | 'ai_package'; planId?: string; vendorId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
  }

  const { type, planId, vendorId } = body;
  if (!vendorId) return NextResponse.json({ error: 'vendorId obrigatório.' }, { status: 400 });

  // Verifica que o vendor pertence ao usuário
  const { data: vendor } = await supabase
    .from('vendors')
    .select('id, name')
    .eq('id', vendorId)
    .eq('owner_id', user.id)
    .single();

  if (!vendor) return NextResponse.json({ error: 'Vendor não encontrado.' }, { status: 404 });

  // Busca perfil do dono para criar customer no Asaas
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, cnpj, phone')
    .eq('id', user.id)
    .single();

  const cpfCnpj = profile?.cnpj?.replace(/\D/g, '');
  if (!cpfCnpj) {
    return NextResponse.json({ error: 'CNPJ não cadastrado no perfil. Atualize em Configurações.' }, { status: 400 });
  }

  let value: number;
  let description: string;
  let externalReference: string;

  if (type === 'plan') {
    if (!planId) return NextResponse.json({ error: 'planId obrigatório para planos.' }, { status: 400 });

    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .eq('active', true)
      .single();

    if (!plan) return NextResponse.json({ error: 'Plano não encontrado.' }, { status: 404 });

    value = Number(plan.price);
    description = `Plano ${plan.name} — ${vendor.name}`;
    externalReference = `vendor_plan:${vendorId}:${planId}`;
  } else if (type === 'ai_package') {
    // Busca preço do pacote IA na config
    const { data: configs } = await supabase
      .from('platform_config')
      .select('key, value');

    const price = configs?.find(c => c.key === 'ai_photo_package_price')?.value || '199.00';
    const size = configs?.find(c => c.key === 'ai_photo_package_size')?.value || '50';

    value = Number(price);
    description = `Pacote IA (${size} fotos) — ${vendor.name}`;
    externalReference = `vendor_ai:${vendorId}:${size}`;
  } else {
    return NextResponse.json({ error: 'Tipo inválido.' }, { status: 400 });
  }

  if (value <= 0) {
    return NextResponse.json({ error: 'Plano gratuito — não requer pagamento.' }, { status: 400 });
  }

  try {
    // Cria/busca customer no Asaas
    const customerId = await findOrCreateCustomer({
      name: profile?.name || vendor.name,
      cpfCnpj,
      email: user.email,
    });

    // Cria cobrança com todas as formas de pagamento
    const due = new Date();
    due.setDate(due.getDate() + 3);
    const dueDate = due.toISOString().split('T')[0];

    const res = await fetch(`${BASE_URL}/payments`, {
      method: 'POST',
      headers: h,
      body: JSON.stringify({
        customer: customerId,
        billingType: 'UNDEFINED', // permite PIX, boleto e cartão no checkout
        value,
        dueDate,
        description,
        externalReference,
      }),
    });

    const payment = await res.json();
    if (!payment.id) {
      return NextResponse.json({ error: 'Erro ao criar cobrança no Asaas.', details: payment }, { status: 500 });
    }

    return NextResponse.json({ invoiceUrl: payment.invoiceUrl, paymentId: payment.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno.' }, { status: 500 });
  }
}
