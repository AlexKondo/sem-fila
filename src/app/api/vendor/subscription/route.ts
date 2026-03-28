import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  // Busca perfil com plan_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan_id, plan_expires_at')
    .eq('id', user.id)
    .single();

  // Busca plano atual (null = gratuito)
  let plan = null;
  if (profile?.plan_id) {
    const { data } = await supabase
      .from('subscription_plans')
      .select('id, name, price, order_limit, features, ia_included')
      .eq('id', profile.plan_id)
      .single();
    plan = data;
  }

  // Se não tem plano pago, busca o plano gratuito para referência
  if (!plan) {
    const { data } = await supabase
      .from('subscription_plans')
      .select('id, name, price, order_limit, features, ia_included')
      .eq('price', 0)
      .limit(1)
      .single();
    plan = data;
  }

  // Busca todos os vendors do usuário
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id')
    .eq('owner_id', user.id);

  const vendorIds = vendors?.map(v => v.id) || [];

  // Conta pedidos do mês atual (todas as marcas)
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  let ordersThisMonth = 0;
  if (vendorIds.length > 0) {
    const { count } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .in('vendor_id', vendorIds)
      .gte('created_at', monthStart)
      .lte('created_at', monthEnd)
      .neq('status', 'cancelled');
    ordersThisMonth = count || 0;
  }

  const orderLimit = plan?.order_limit || 50;
  const exceeded = ordersThisMonth > orderLimit;

  return NextResponse.json({
    plan: plan ? {
      id: plan.id,
      name: plan.name,
      price: Number(plan.price),
      orderLimit: plan.order_limit,
      features: plan.features,
      iaIncluded: plan.ia_included,
    } : null,
    isPaid: profile?.plan_id != null,
    expiresAt: profile?.plan_expires_at || null,
    ordersThisMonth,
    orderLimit,
    exceeded,
  });
}
