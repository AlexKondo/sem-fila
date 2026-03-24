// API Route — Criação de pedidos
// skill: 4-data-security, 14-zero-trust-security
// Valida no servidor com Zod + verifica disponibilidade de itens via RLS

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CreateOrderSchema } from '@/lib/validations/order';

// Rate limiting simples por IP (em produção use Redis/Upstash)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(request: Request) {
  // Rate limit por IP
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Muitas requisições. Tente em 1 minuto.' }, { status: 429 });
  }

  // Parse e validação com Zod (skill: 4-data-security)
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 });
  }

  const parsed = CreateOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 422 });
  }

  const { vendor_id, table_number, notes, items } = parsed.data;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Verifica se o vendor existe e está ativo
  const { data: vendor, error: vendorError } = await supabase
    .from('vendors')
    .select('id, active, avg_prep_time')
    .eq('id', vendor_id)
    .eq('active', true)
    .single();

  if (vendorError || !vendor) {
    return NextResponse.json({ error: 'Barraca não encontrada ou inativa.' }, { status: 404 });
  }

  // Busca os menu_items para calcular preço real no servidor (NUNCA confie no preço do cliente)
  const menuItemIds = items.map((i) => i.menu_item_id);
  const { data: menuItems, error: menuError } = await supabase
    .from('menu_items')
    .select('id, price, available, vendor_id')
    .in('id', menuItemIds)
    .eq('vendor_id', vendor_id)
    .eq('available', true);

  if (menuError || !menuItems || menuItems.length !== menuItemIds.length) {
    return NextResponse.json({ error: 'Um ou mais itens não estão disponíveis.' }, { status: 422 });
  }

  // Calcula total no servidor
  const safeMenuItems = menuItems as unknown as { id: string; price: number }[];
  const priceMap = Object.fromEntries(safeMenuItems.map((m) => [m.id, m.price]));
  const total_price = items.reduce((sum, item) => {
    return sum + (priceMap[item.menu_item_id] ?? 0) * item.quantity;
  }, 0);

  // Cria o pedido
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      vendor_id,
      user_id: user?.id ?? null,
      table_number: table_number ?? null,
      notes: notes ?? null,
      total_price,
      status: 'received',
      payment_status: 'pending',
    })
    .select('id, pickup_code')
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: 'Erro ao criar pedido.' }, { status: 500 });
  }

  // Insere os itens do pedido
  const { error: itemsError } = await supabase.from('order_items').insert(
    items.map((item) => ({
      order_id: order.id,
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
      unit_price: priceMap[item.menu_item_id],
    }))
  );

  if (itemsError) {
    // Rollback: remove o pedido criado
    await supabase.from('orders').delete().eq('id', order.id);
    return NextResponse.json({ error: 'Erro ao registrar itens do pedido.' }, { status: 500 });
  }

  return NextResponse.json({ order_id: order.id, pickup_code: order.pickup_code }, { status: 201 });
}
