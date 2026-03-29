import { NextResponse } from 'next/server';

/**
 * Cron job: avalia métricas dos vendors e concede/revoga benefícios automáticos.
 * Deve ser chamado periodicamente (ex: a cada hora ou diariamente via Vercel Cron).
 * GET /api/cron/auto-benefits?key=CRON_SECRET
 */
export async function GET(request: Request) {
  // Validação de segurança via header ou query param
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key') || request.headers.get('authorization')?.replace('Bearer ', '');

  if (key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { createAdminClient } = await import('@/lib/supabase/server');
  const admin = await createAdminClient();

  // 1. Busca regras ativas
  const { data: rules } = await admin
    .from('auto_benefit_rules')
    .select('*')
    .eq('active', true);

  if (!rules || rules.length === 0) {
    return NextResponse.json({ message: 'Nenhuma regra ativa.', granted: 0, revoked: 0 });
  }

  // 2. Busca todos os vendors ativos
  const { data: vendors } = await admin
    .from('vendors')
    .select('id, name, order_count, rating_avg, avg_prep_time')
    .eq('active', true);

  if (!vendors || vendors.length === 0) {
    return NextResponse.json({ message: 'Nenhum vendor ativo.', granted: 0, revoked: 0 });
  }

  // 3. Calcula métricas dinâmicas (faturamento mensal e taxa de cancelamento)
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const vendorIds = vendors.map(v => v.id);

  // Faturamento mensal por vendor
  const { data: revenueRows } = await admin
    .from('orders')
    .select('vendor_id, total_price')
    .in('vendor_id', vendorIds)
    .eq('payment_status', 'paid')
    .gte('created_at', monthStart)
    .lte('created_at', monthEnd);

  const revenueByVendor: Record<string, number> = {};
  for (const row of revenueRows || []) {
    revenueByVendor[row.vendor_id] = (revenueByVendor[row.vendor_id] || 0) + Number(row.total_price || 0);
  }

  // Pedidos do mês por vendor (total e cancelados)
  const { data: orderRows } = await admin
    .from('orders')
    .select('vendor_id, status')
    .in('vendor_id', vendorIds)
    .gte('created_at', monthStart)
    .lte('created_at', monthEnd);

  const orderStats: Record<string, { total: number; cancelled: number }> = {};
  for (const row of orderRows || []) {
    if (!orderStats[row.vendor_id]) orderStats[row.vendor_id] = { total: 0, cancelled: 0 };
    orderStats[row.vendor_id].total++;
    if (row.status === 'cancelled') orderStats[row.vendor_id].cancelled++;
  }

  // 4. Avalia cada vendor contra cada regra
  let granted = 0;
  let revoked = 0;

  for (const vendor of vendors) {
    for (const rule of rules) {
      const metricValue = getMetricValue(vendor, rule.metric, revenueByVendor, orderStats);

      if (metricValue === null) continue; // métrica indisponível

      const qualifies = evaluateCondition(metricValue, rule.operator, Number(rule.threshold));

      if (qualifies) {
        // Conceder benefício (upsert)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + rule.duration_days);

        const { error } = await admin.from('vendor_subscriptions').upsert({
          vendor_id: vendor.id,
          feature: rule.benefit_slug,
          active: true,
          price_paid: 0, // gratuito — concedido automaticamente
          expires_at: expiresAt.toISOString(),
        }, { onConflict: 'vendor_id,feature' });

        if (!error) granted++;
      } else {
        // Se o vendor tinha o benefício auto-concedido (price_paid = 0) e não qualifica mais, desativar
        const { data: existing } = await admin
          .from('vendor_subscriptions')
          .select('id, price_paid, active')
          .eq('vendor_id', vendor.id)
          .eq('feature', rule.benefit_slug)
          .single();

        if (existing && existing.active && Number(existing.price_paid) === 0) {
          await admin.from('vendor_subscriptions')
            .update({ active: false })
            .eq('id', existing.id);
          revoked++;
        }
      }
    }
  }

  return NextResponse.json({
    message: `Auto-benefits processados. ${granted} concedidos, ${revoked} revogados.`,
    granted,
    revoked,
    vendorsEvaluated: vendors.length,
    rulesEvaluated: rules.length,
  });
}

function getMetricValue(
  vendor: { id: string; order_count: number | null; rating_avg: number | null; avg_prep_time: number | null },
  metric: string,
  revenueByVendor: Record<string, number>,
  orderStats: Record<string, { total: number; cancelled: number }>,
): number | null {
  switch (metric) {
    case 'monthly_revenue':
      return revenueByVendor[vendor.id] ?? 0;
    case 'order_count': {
      const stats = orderStats[vendor.id];
      return stats ? stats.total : 0;
    }
    case 'rating_avg':
      return vendor.rating_avg != null ? Number(vendor.rating_avg) : null;
    case 'cancellation_rate': {
      const stats = orderStats[vendor.id];
      if (!stats || stats.total === 0) return 0;
      return (stats.cancelled / stats.total) * 100;
    }
    case 'avg_prep_time':
      return vendor.avg_prep_time != null ? Number(vendor.avg_prep_time) : null;
    default:
      return null;
  }
}

function evaluateCondition(value: number, operator: string, threshold: number): boolean {
  switch (operator) {
    case '>=': return value >= threshold;
    case '<=': return value <= threshold;
    case '>':  return value > threshold;
    case '<':  return value < threshold;
    case '=':  return value === threshold;
    default:   return false;
  }
}
