import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { formatCurrency } from '@/lib/utils';
import VendorDashboardClient from '@/components/dashboard/VendorDashboardClient';

interface Props {
  searchParams: Promise<{ period?: string; start?: string; end?: string }>;
}

export default async function VendorDashboardPage({ searchParams }: Props) {
  const params = await searchParams;
  const period = params.period || 'today';
  const customStart = params.start;
  const customEnd = params.end;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const cookieStore = await cookies();
  const selectedId = cookieStore.get('selected_vendor_id')?.value;

  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, name')
    .eq('owner_id', user.id);

  if (!vendors?.length) redirect('/dashboard/vendor');

  const vendor = selectedId && selectedId !== 'all'
    ? vendors.find(v => v.id === selectedId) ?? vendors[0]
    : vendors[0];

  // Cálculo do Início do Período
  const now = new Date();
  let startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  let endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  if (customStart && customEnd) {
    startDate = new Date(customStart + 'T00:00:00');
    endDate = new Date(customEnd + 'T23:59:59');
  } else {
    if (period === '7d') startDate.setDate(now.getDate() - 6);
    else if (period === '30d') startDate.setDate(now.getDate() - 29);
    else if (period === 'all') startDate.setFullYear(2020);
  }

  const periodStart = startDate.toISOString();
  const periodEnd = endDate.toISOString();

  const allVendorIds = vendors.map(v => v.id);

  const [periodRes, customersRes, allPeriodRes, allCustomersRes] = await Promise.all([
    supabase
      .from('orders')
      .select('id, total_price, status, created_at, updated_at')
      .eq('vendor_id', vendor.id)
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd)
      .order('created_at', { ascending: true }),
    supabase
      .from('orders')
      .select('user_id')
      .eq('vendor_id', vendor.id)
      .not('user_id', 'is', null),
    // Dados agregados de TODOS os negócios
    supabase
      .from('orders')
      .select('id, total_price, status, vendor_id, created_at, updated_at')
      .in('vendor_id', allVendorIds)
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd),
    supabase
      .from('orders')
      .select('user_id, vendor_id')
      .in('vendor_id', allVendorIds)
      .not('user_id', 'is', null),
  ]);

  const periodOrders = periodRes.data ?? [];
  const revenue = periodOrders.reduce((s, o) => s + Number(o.total_price || 0), 0);
  const activeCount = periodOrders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length;
  const uniqueCustomers = new Set(customersRes.data?.map(o => o.user_id)).size;

  const delivered = periodOrders.filter(o => o.status === 'delivered' && o.updated_at);
  const avgMinutes = delivered.length > 0
    ? Math.round(
        delivered.reduce((s, o) => {
          const diff = (new Date(o.updated_at).getTime() - new Date(o.created_at).getTime()) / 60000;
          return s + diff;
        }, 0) / delivered.length
      )
    : null;

  const validOrders = periodOrders.filter(o => o.status !== 'cancelled');
  const readyOrders = validOrders.filter(o => ['ready', 'delivered'].includes(o.status));
  const efficiency = validOrders.length > 0 ? Math.round((readyOrders.length / validOrders.length) * 100) : null;

  // CHART LOGIC
  let chartData: { label: string; total: number; isNow?: boolean; hour?: number }[] = [];
  const isSingleDay = startDate.toDateString() === endDate.toDateString();

  if (isSingleDay) {
    chartData = Array.from({ length: 24 }, (_, h) => {
      const total = periodOrders
        .filter(o => new Date(o.created_at).getHours() === h && o.status !== 'cancelled')
        .reduce((s, o) => s + Number(o.total_price || 0), 0);
      return { label: `${h}h`, total, isNow: now.getHours() === h && now.toDateString() === startDate.toDateString(), hour: h };
    });
  } else {
    // Calculando diferença de dias
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const maxChartPoints = 31; // Limite para não explodir o gráfico
    
    chartData = Array.from({ length: Math.min(diffDays, maxChartPoints) }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const total = periodOrders
        .filter(o => {
          const od = new Date(o.created_at);
          return od.getDate() === d.getDate() && od.getMonth() === d.getMonth();
        })
        .reduce((s, o) => s + Number(o.total_price || 0), 0);
      return { label, total };
    });
  }

  // Sumário geral de TODOS os negócios (só mostra se tiver mais de 1)
  const allOrders = allPeriodRes.data ?? [];
  const allRevenue = allOrders.reduce((s, o) => s + Number(o.total_price || 0), 0);
  const allActive = allOrders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length;
  const allCustomers = new Set(allCustomersRes.data?.map(o => o.user_id)).size;
  const allOrdersCount = allOrders.length;

  // Resumo por vendor
  const vendorsSummary = vendors.length > 1
    ? vendors.map(v => {
        const vOrders = allOrders.filter(o => o.vendor_id === v.id);
        const vRevenue = vOrders.reduce((s, o) => s + Number(o.total_price || 0), 0);
        const vActive = vOrders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length;
        const vDelivered = vOrders.filter(o => o.status === 'delivered' && o.updated_at);
        const vAvgPrep = vDelivered.length > 0
          ? Math.round(vDelivered.reduce((s, o) => {
              const diff = (new Date(o.updated_at).getTime() - new Date(o.created_at).getTime()) / 60000;
              return s + diff;
            }, 0) / vDelivered.length)
          : null;
        const vCustomers = new Set(
          (allCustomersRes.data ?? []).filter(c => c.vendor_id === v.id).map(c => c.user_id)
        ).size;
        return { id: v.id, name: v.name, revenue: vRevenue, orders: vOrders.length, active: vActive, avgPrepTime: vAvgPrep, customers: vCustomers };
      })
    : null;

  return (
    <VendorDashboardClient
      vendorName={vendor.name}
      revenue={revenue}
      activeCount={activeCount}
      avgMinutes={avgMinutes}
      uniqueCustomers={uniqueCustomers}
      efficiency={efficiency}
      readyCount={readyOrders.length}
      validCount={validOrders.length}
      chartData={chartData}
      currentPeriod={period}
      startDate={startDate.toISOString().split('T')[0]}
      endDate={endDate.toISOString().split('T')[0]}
      globalSummary={vendors.length > 1 ? {
        totalRevenue: allRevenue,
        totalOrders: allOrdersCount,
        totalActive: allActive,
        totalCustomers: allCustomers,
        vendors: vendorsSummary!,
      } : undefined}
    />
  );
}
