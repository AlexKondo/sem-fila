import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { findOrCreateCustomer, createPixCharge, createCreditCardCharge } from '@/lib/asaas';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  let body: {
    type: 'plan' | 'ai_package';
    planId?: string;
    vendorId: string;
    paymentMethod: 'pix' | 'credit_card';
    card?: { number: string; holder: string; expiryMonth: string; expiryYear: string; cvv: string };
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
  }

  const { type, planId, vendorId, paymentMethod, card } = body;
  if (!vendorId) return NextResponse.json({ error: 'vendorId obrigatório.' }, { status: 400 });
  if (!paymentMethod) return NextResponse.json({ error: 'Forma de pagamento obrigatória.' }, { status: 400 });

  // Verifica que o vendor pertence ao usuário
  const { data: vendor } = await supabase
    .from('vendors')
    .select('id, name')
    .eq('id', vendorId)
    .eq('owner_id', user.id)
    .single();

  if (!vendor) return NextResponse.json({ error: 'Estabelecimento não encontrado.' }, { status: 404 });

  // Busca perfil do dono
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, cnpj, phone')
    .eq('id', user.id)
    .single();

  const cpfCnpj = profile?.cnpj?.replace(/\D/g, '');
  if (!cpfCnpj) {
    return NextResponse.json({
      error: 'CPF/CNPJ não cadastrado no seu perfil. Atualize em Configurações antes de prosseguir.',
    }, { status: 400 });
  }

  // Resolve produto e valor
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

  // Cria customer no Asaas
  let customerId: string;
  try {
    customerId = await findOrCreateCustomer({
      name: profile?.name || vendor.name,
      cpfCnpj,
      email: user.email,
    });
  } catch {
    return NextResponse.json({
      error: 'O CPF/CNPJ cadastrado no seu perfil é inválido. Atualize em Configurações antes de prosseguir.',
    }, { status: 400 });
  }

  try {
    if (paymentMethod === 'pix') {
      const pix = await createPixCharge({
        customerId,
        value,
        orderId: externalReference,
        description,
      });

      return NextResponse.json({
        paymentId: pix.paymentId,
        pix: {
          qr_code: pix.pixQrCode,
          copy_paste: pix.pixCopyPaste,
        },
      });
    }

    if (paymentMethod === 'credit_card') {
      if (!card || !card.number || !card.holder || !card.expiryMonth || !card.expiryYear || !card.cvv) {
        return NextResponse.json({ error: 'Dados do cartão incompletos.' }, { status: 400 });
      }

      const result = await createCreditCardCharge({
        customerId,
        value,
        orderId: externalReference,
        description,
        card: {
          holderName: card.holder,
          number: card.number,
          expiryMonth: card.expiryMonth,
          expiryYear: card.expiryYear,
          ccv: card.cvv,
        },
        holderInfo: {
          name: profile?.name || vendor.name,
          cpfCnpj,
          email: user.email || undefined,
          phone: profile?.phone || undefined,
        },
        remoteIp: request.headers.get('x-forwarded-for') || '127.0.0.1',
      });

      // Cartão aprovado instantaneamente — credita agora (sem esperar webhook)
      const { createAdminClient } = await import('@/lib/supabase/server');
      const admin = await createAdminClient();

      let creditsAdded = 0;
      if (type === 'ai_package') {
        const packageSize = parseInt(externalReference.split(':')[2]) || 50;
        const { data: current } = await admin
          .from('vendors')
          .select('ai_photo_credits')
          .eq('id', vendorId)
          .single();
        await admin.from('vendors').update({
          ai_photo_enabled: true,
          ai_photo_credits: (current?.ai_photo_credits || 0) + packageSize,
        }).eq('id', vendorId);
        creditsAdded = packageSize;
      } else if (type === 'plan') {
        const { data: planData } = await admin
          .from('subscription_plans')
          .select('ia_included')
          .eq('id', planId!)
          .single();
        if (planData?.ia_included) {
          await admin.from('vendors').update({ ai_photo_enabled: true }).eq('id', vendorId);
        }
        // Salva plano no perfil do usuário (vale para todas as marcas)
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);
        await admin.from('profiles').update({
          plan_id: planId,
          plan_expires_at: expiresAt.toISOString(),
        }).eq('id', user.id);
      }

      // Registra para idempotência (webhook não vai creditar de novo)
      try {
        await admin.from('vendor_payment_log').insert({
          asaas_payment_id: result.paymentId,
          vendor_id: vendorId,
          external_reference: externalReference,
          credits_added: creditsAdded,
        });
      } catch { /* ignora se já existe */ }

      return NextResponse.json({
        paymentId: result.paymentId,
        paid: true,
      });
    }

    return NextResponse.json({ error: 'Forma de pagamento inválida.' }, { status: 400 });
  } catch (err: any) {
    const msg = err?.message?.includes('UNAUTHORIZED') || err?.message?.includes('card')
      ? 'Cartão recusado. Verifique os dados e tente novamente.'
      : 'Não foi possível processar o pagamento. Tente novamente.';
    return NextResponse.json({ error: msg }, { status: 402 });
  }
}
