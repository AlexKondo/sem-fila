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

  let payload: { event: string; payment?: { id: string; externalReference?: string; billingType?: string } };
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
      // Idempotência: verifica se já foi processado (ex: cartão creditado no checkout)
      const paymentId = payment?.id;
      if (paymentId) {
        const { data: existing } = await supabase
          .from('vendor_payment_log')
          .select('id')
          .eq('asaas_payment_id', paymentId)
          .maybeSingle();
        if (existing) {
          return NextResponse.json({ received: true, already_processed: true });
        }
      }
      await handleVendorPayment(supabase, ref, paymentId);
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

async function handleVendorPayment(supabase: any, ref: string, asaasPaymentId?: string) {
  const parts = ref.split(':');
  let creditsAdded = 0;
  let vendorId = parts[1];

  if (parts[0] === 'vendor_plan') {
    const planId = parts[2];

    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (!plan) return;

    const vendorUpdates: Record<string, any> = {};
    if (plan.ia_included) {
      vendorUpdates.ai_photo_enabled = true;
    }
    if (Object.keys(vendorUpdates).length > 0) {
      await supabase.from('vendors').update(vendorUpdates).eq('id', vendorId);
    }

    // Salva o plano no PERFIL do usuário (vale para todas as marcas)
    const { data: vendor } = await supabase
      .from('vendors')
      .select('owner_id')
      .eq('id', vendorId)
      .single();

    if (vendor?.owner_id) {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);
      await supabase.from('profiles').update({
        plan_id: planId,
        plan_expires_at: expiresAt.toISOString(),
      }).eq('id', vendor.owner_id);
    }

  } else if (parts[0] === 'vendor_ai') {
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

    creditsAdded = credits;
  }

  // Registra para idempotência
  if (asaasPaymentId && vendorId) {
    await supabase.from('vendor_payment_log').insert({
      asaas_payment_id: asaasPaymentId,
      vendor_id: vendorId,
      external_reference: ref,
      credits_added: creditsAdded,
    }).catch(() => {});
  }
}
