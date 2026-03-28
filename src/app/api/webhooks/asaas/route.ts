// Webhook do Asaas — atualiza payment_status dos pedidos e processa pagamentos de vendor
// Requer SUPABASE_SERVICE_ROLE_KEY para atualizar sem sessão de usuário
// Requer ASAAS_WEBHOOK_TOKEN para validar a origem da requisição

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function POST(request: Request) {
  // Valida o token de segurança configurado no painel do Asaas
  const token = request.headers.get('asaas-access-token');
  if (process.env.ASAAS_WEBHOOK_TOKEN && token !== process.env.ASAAS_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });
  }

  let payload: { event: string; payment?: { id: string; externalReference?: string } };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
  }

  const { event, payment } = payload;
  const ref = payment?.externalReference;

  if (!ref) {
    // Evento sem referência — ignorar silenciosamente
    return NextResponse.json({ received: true });
  }

  const supabase = createServerClient<any>( // eslint-disable-line @typescript-eslint/no-explicit-any
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  // Pagamentos de vendor (planos e pacotes IA)
  if (ref.startsWith('vendor_plan:') || ref.startsWith('vendor_ai:')) {
    if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
      await handleVendorPayment(supabase, ref);
    }
    return NextResponse.json({ received: true });
  }

  // Pagamentos de pedidos (fluxo original)
  const orderId = ref;

  switch (event) {
    case 'PAYMENT_CONFIRMED':
    case 'PAYMENT_RECEIVED':
      await supabase
        .from('orders')
        .update({ payment_status: 'paid' })
        .eq('id', orderId);
      break;

    case 'PAYMENT_REFUNDED':
      await supabase
        .from('orders')
        .update({ payment_status: 'refunded' })
        .eq('id', orderId);
      break;

    case 'PAYMENT_OVERDUE':
    case 'PAYMENT_DELETED':
      await supabase
        .from('orders')
        .update({ payment_status: 'failed', status: 'cancelled' })
        .eq('id', orderId);
      break;
  }

  return NextResponse.json({ received: true });
}

async function handleVendorPayment(supabase: any, ref: string) {
  const parts = ref.split(':');

  if (parts[0] === 'vendor_plan') {
    // vendor_plan:<vendorId>:<planId>
    const vendorId = parts[1];
    const planId = parts[2];

    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (!plan) return;

    // Habilita IA se incluso no plano
    const updates: Record<string, any> = {};
    if (plan.ia_included) {
      updates.ai_photo_enabled = true;
    }
    if (Object.keys(updates).length > 0) {
      await supabase.from('vendors').update(updates).eq('id', vendorId);
    }

  } else if (parts[0] === 'vendor_ai') {
    // vendor_ai:<vendorId>:<credits>
    const vendorId = parts[1];
    const credits = parseInt(parts[2]) || 50;

    const { data: vendor } = await supabase
      .from('vendors')
      .select('ai_photo_credits')
      .eq('id', vendorId)
      .single();

    const currentCredits = vendor?.ai_photo_credits || 0;

    await supabase
      .from('vendors')
      .update({
        ai_photo_enabled: true,
        ai_photo_credits: currentCredits + credits,
      })
      .eq('id', vendorId);
  }
}
