// Cria uma Stripe Checkout Session para pagar o pedido
// Chamado após criação do pedido, quando payment_mode = 'prepaid'

import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';
import { z } from 'zod';
import type { OrderWithItems } from '@/types/database';

const CheckoutSchema = z.object({
  order_id: z.string().uuid(),
});

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
  }

  const parsed = CheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 422 });
  }

  const supabase = await createAdminClient();

  // Busca o pedido com os itens
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(`
      id, total_price, payment_status, pickup_code, vendor_id,
      order_items (
        quantity, unit_price,
        menu_items (name)
      ),
      vendors (name)
    `)
    .eq('id', parsed.data.order_id)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
  }

  const orderData = order as unknown as OrderWithItems;

  if (orderData.payment_status === 'paid') {
    return NextResponse.json({ error: 'Este pedido já foi pago.' }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // SIMULAÇÃO LOCAL CASO NÃO TENHA STRIPE CONFIGURADO
  if (!process.env.STRIPE_SECRET_KEY) {
    console.log("Simulação de Checkout (Stripe desligado)");
    // Atualiza o banco para dar baixa no pagamento!
    await supabase.from('orders').update({ payment_status: 'paid' }).eq('id', orderData.id);
    return NextResponse.json({ checkout_url: `${appUrl}/order/${orderData.id}?payment=success` });
  }

  // Monta os line_items do Stripe a partir dos itens reais do pedido
  const lineItems = orderData.order_items.map((item) => ({
    price_data: {
      currency: 'brl',
      unit_amount: Math.round(item.unit_price * 100), // Stripe usa centavos
      product_data: {
        name: item.menu_items?.name ?? 'Item',
        description: `Pedido #${orderData.pickup_code} — ${orderData.vendors?.name}`,
      },
    },
    quantity: item.quantity,
  }));

  // Adiciona taxas (serviço/couvert) se houver diferença no total
  const itemsTotal = orderData.order_items.reduce((acc, i) => acc + (i.unit_price * i.quantity), 0);
  const fees = orderData.total_price - itemsTotal;
  
  if (fees > 0.01) {
    lineItems.push({
      price_data: {
        currency: 'brl',
        unit_amount: Math.round(fees * 100),
        product_data: {
          name: 'Taxas e Serviços',
          description: 'Taxa de serviço e/ou couvert artístico',
        },
      },
      quantity: 1,
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    metadata: { order_id: orderData.id },
    success_url: `${appUrl}/order/${orderData.id}?payment=success`,
    cancel_url: `${appUrl}/order/${orderData.id}?payment=cancelled`,
    payment_method_types: ['card'],
    locale: 'pt-BR',
  });

  return NextResponse.json({ checkout_url: session.url });
}
