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

  const {
    vendor_id, table_number, notes, items,
    payment_method, customer_name, customer_cpf, customer_email,
    use_saved_card, card_number, card_holder, card_expiry_month, card_expiry_year, card_cvv,
  } = parsed.data;

  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();

  const { createAdminClient } = await import('@/lib/supabase/server');
  const supabase = await createAdminClient();

  // Verifica se o vendor existe e está ativo
  const { data: vendor, error: vendorError } = await supabase
    .from('vendors')
    .select('id, active, avg_prep_time, service_fee_percentage, couvert_fee')
    .eq('id', vendor_id)
    .eq('active', true)
    .single();

  if (vendorError || !vendor) {
    return NextResponse.json({ error: 'Barraca não encontrada ou inativa.' }, { status: 404 });
  }

  // Verifica limite de pedidos do plano (bloqueia apenas se excedeu no dia anterior)
  const { data: vendorOwner } = await supabase
    .from('vendors')
    .select('owner_id')
    .eq('id', vendor_id)
    .single();

  if (vendorOwner?.owner_id) {
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('plan_id')
      .eq('id', vendorOwner.owner_id)
      .single();

    // Busca o plano (null = gratuito)
    let planLimit = 50;
    if (ownerProfile?.plan_id) {
      const { data: plan } = await supabase
        .from('subscription_plans')
        .select('order_limit')
        .eq('id', ownerProfile.plan_id)
        .single();
      if (plan) planLimit = plan.order_limit;
    } else {
      const { data: freePlan } = await supabase
        .from('subscription_plans')
        .select('order_limit')
        .eq('price', 0)
        .limit(1)
        .single();
      if (freePlan) planLimit = freePlan.order_limit;
    }

    // Conta pedidos do mês até ONTEM (bloqueia só no dia seguinte)
    const { data: ownerVendors } = await supabase
      .from('vendors')
      .select('id')
      .eq('owner_id', vendorOwner.owner_id);

    if (ownerVendors && ownerVendors.length > 0) {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(23, 59, 59, 999);
      const yesterdayEnd = yesterday.toISOString();

      // Só bloqueia se ontem já era neste mês
      if (yesterday.getMonth() === now.getMonth()) {
        const { count } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .in('vendor_id', ownerVendors.map(v => v.id))
          .gte('created_at', monthStart)
          .lte('created_at', yesterdayEnd)
          .neq('status', 'cancelled');

        if ((count || 0) > planLimit && planLimit < 99999) {
          return NextResponse.json({
            error: 'Limite de pedidos do plano excedido. O proprietário precisa fazer upgrade do plano para continuar recebendo pedidos.',
          }, { status: 403 });
        }
      }
    }
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
  const subtotal = items.reduce((sum, item) => {
    const itemPrice = priceMap[item.menu_item_id] ?? 0;
    const extrasPrice = (item.extras || []).reduce((s, e) => s + (e.price ?? 0), 0);
    return sum + (itemPrice + extrasPrice) * item.quantity;
  }, 0);

  const serviceFee = (subtotal * (vendor.service_fee_percentage || 0)) / 100;
  const total_price = subtotal + serviceFee + (vendor.couvert_fee || 0);

  function generatePickupCode() {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Sem 'I' e 'O' para evitar confundir com 1 e 0
    const numbers = '123456789'; 
    const L1 = letters[Math.floor(Math.random() * letters.length)];
    const L2 = letters[Math.floor(Math.random() * letters.length)];
    const N1 = numbers[Math.floor(Math.random() * numbers.length)];
    const N2 = numbers[Math.floor(Math.random() * numbers.length)];
    return `${L1}${L2}${N1}${N2}`;
  }

  const isPix = payment_method === 'pix';
  const isCard = payment_method === 'cartão';

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
      payment_status: (isPix || isCard) ? 'pending' : 'paid',
      pickup_code: generatePickupCode(),
    })
    .select('id, pickup_code')
    .single();

  if (orderError || !order) {
    console.error("Erro ao criar pedido no Supabase:", orderError);
    return NextResponse.json({ error: `Erro ao criar pedido: ${orderError?.message || 'Erro desconhecido'}` }, { status: 500 });
  }

  // Insere os itens do pedido
  const { error: itemsError } = await supabase.from('order_items').insert(
    items.map((item) => ({
      order_id: order.id,
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
      unit_price: priceMap[item.menu_item_id],
      extras: item.extras || [],
    }))
  );

  if (itemsError) {
    // Rollback: remove o pedido criado
    await supabase.from('orders').delete().eq('id', order.id);
    return NextResponse.json({ error: 'Erro ao registrar itens do pedido.' }, { status: 500 });
  }

  // Se PIX, gera cobrança no Asaas
  if (isPix && customer_name && customer_cpf) {
    try {
      const { findOrCreateCustomer, createPixCharge } = await import('@/lib/asaas');
      const customerId = await findOrCreateCustomer({
        name: customer_name,
        cpfCnpj: customer_cpf,
        email: customer_email,
      });
      const pix = await createPixCharge({
        customerId,
        value: total_price,
        orderId: order.id,
        description: `Pedido ${order.pickup_code} — ${vendor.id}`,
      });
      return NextResponse.json({
        order_id: order.id,
        pickup_code: order.pickup_code,
        payment_confirmed: false,
        pix: {
          payment_id: pix.paymentId,
          qr_code: pix.pixQrCode,
          copy_paste: pix.pixCopyPaste,
        },
      }, { status: 201 });
    } catch (err) {
      console.error('Asaas PIX error:', err);
      // Não bloqueia o pedido — segue sem PIX (fallback)
    }
  }

  // Pagamento por cartão via Asaas
  if (isCard && customer_name && customer_cpf) {
    try {
      const { findOrCreateCustomer, createCreditCardCharge, createCreditCardChargeWithToken } = await import('@/lib/asaas');

      // Busca customer_id e token salvos no perfil (se logado)
      let asaasCustomerId: string | null = null;
      let savedToken: string | null = null;
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('asaas_customer_id, asaas_card_token')
          .eq('id', user.id)
          .single();
        asaasCustomerId = profile?.asaas_customer_id ?? null;
        savedToken = profile?.asaas_card_token ?? null;
      }

      // Usa token salvo
      if (use_saved_card && savedToken && asaasCustomerId) {
        await createCreditCardChargeWithToken({
          customerId: asaasCustomerId,
          value: total_price,
          orderId: order.id,
          description: `Pedido ${order.pickup_code}`,
          cardToken: savedToken,
        });
        await supabase.from('orders').update({ payment_status: 'paid' }).eq('id', order.id);
        return NextResponse.json({ order_id: order.id, pickup_code: order.pickup_code, payment_confirmed: true }, { status: 201 });
      }

      // Novo cartão
      if (card_number && card_holder && card_expiry_month && card_expiry_year && card_cvv) {
        if (!asaasCustomerId) {
          asaasCustomerId = await findOrCreateCustomer({ name: customer_name, cpfCnpj: customer_cpf, email: customer_email });
          if (user) await supabase.from('profiles').update({ asaas_customer_id: asaasCustomerId }).eq('id', user.id);
        }

        const result = await createCreditCardCharge({
          customerId: asaasCustomerId,
          value: total_price,
          orderId: order.id,
          description: `Pedido ${order.pickup_code}`,
          card: { holderName: card_holder, number: card_number, expiryMonth: card_expiry_month, expiryYear: card_expiry_year, ccv: card_cvv },
          holderInfo: { name: customer_name, cpfCnpj: customer_cpf, email: customer_email },
          remoteIp: request.headers.get('x-forwarded-for') || '127.0.0.1',
        });

        // Salva token para próximas compras (apenas usuários logados)
        if (user && result.cardToken) {
          await supabase.from('profiles').update({
            asaas_customer_id: asaasCustomerId,
            asaas_card_token: result.cardToken,
            asaas_card_last4: result.cardLast4 ?? null,
          }).eq('id', user.id);
        }

        await supabase.from('orders').update({ payment_status: 'paid' }).eq('id', order.id);
        return NextResponse.json({ order_id: order.id, pickup_code: order.pickup_code, payment_confirmed: true }, { status: 201 });
      }
    } catch (err: any) {
      // Cancela pedido se cartão recusado
      await supabase.from('orders').update({ payment_status: 'failed', status: 'cancelled' }).eq('id', order.id);
      const msg = err?.message?.includes('UNAUTHORIZED') ? 'Cartão recusado. Verifique os dados.' : 'Erro ao processar cartão. Tente novamente.';
      return NextResponse.json({ error: msg }, { status: 402 });
    }
  }

  return NextResponse.json({ order_id: order.id, pickup_code: order.pickup_code, payment_confirmed: !(isPix || isCard) }, { status: 201 });
}
