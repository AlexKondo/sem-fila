// Webhook do Stripe — confirma pagamento e atualiza payment_status no banco
// Requer SUPABASE_SERVICE_ROLE_KEY para atualizar sem sessão de usuário

import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServerClient } from '@supabase/ssr';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Assinatura ausente.' }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: 'Webhook inválido.' }, { status: 400 });
  }

  // Apenas processa eventos de pagamento confirmado
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const order_id = session.metadata?.order_id;

    if (!order_id) {
      return NextResponse.json({ error: 'order_id ausente nos metadados.' }, { status: 400 });
    }

    // Aqui usamos o service role para bypassar RLS (sem sessão de usuário no webhook)
    const supabase = // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createServerClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );

    await supabase
      .from('orders')
      .update({ payment_status: 'paid' })
      .eq('id', order_id);
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object;
    const order_id = session.metadata?.order_id;
    if (order_id) {
      const supabase = // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createServerClient<any>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { getAll: () => [], setAll: () => {} } }
      );
      await supabase
        .from('orders')
        .update({ payment_status: 'failed', status: 'cancelled' })
        .eq('id', order_id);
    }
  }

  return NextResponse.json({ received: true });
}
