import { SupabaseClient } from '@supabase/supabase-js';

interface DashboardData {
  vendorName: string;
  revenue: number;
  activeCount: number;
  avgMinutes: number | null;
  uniqueCustomers: number;
  efficiency: number | null;
  readyCount: number;
  validCount: number;
  chartData: { label: string; total: number; isNow?: boolean; hour?: number }[];
  currentPeriod: string;
  startDate: string;
  endDate: string;
  globalSummary?: {
    totalRevenue: number;
    totalOrders: number;
    totalActive: number;
    totalCustomers: number;
    vendors: any[];
  };
  orderLimitAlert?: {
    planName: string;
    ordersThisMonth: number;
    orderLimit: number;
  };
}

export async function fetchDashboardData(
  supabase: SupabaseClient,
  vendor: any,
  vendors: any[],
  userId: string,
  period = 'today',
  customStart?: string,
  customEnd?: string
): Promise<DashboardData> {
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
    ? Math.round(delivered.reduce((s, o) => {
        const diff = (new Date(o.updated_at).getTime() - new Date(o.created_at).getTime()) / 60000;
        return s + diff;
      }, 0) / delivered.length)
    : null;

  const validOrders = periodOrders.filter(o => o.status !== 'cancelled');
  const readyOrders = validOrders.filter(o => ['ready', 'delivered'].includes(o.status));
  const efficiency = validOrders.length > 0 ? Math.round((readyOrders.length / validOrders.length) * 100) : null;

  // Chart
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
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    chartData = Array.from({ length: Math.min(diffDays, 31) }, (_, i) => {
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

  // Global summary
  const allOrders = allPeriodRes.data ?? [];
  const allRevenue = allOrders.reduce((s, o) => s + Number(o.total_price || 0), 0);
  const allActive = allOrders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length;
  const allCustomers = new Set(allCustomersRes.data?.map(o => o.user_id)).size;

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
        const vValid = vOrders.filter(o => o.status !== 'cancelled');
        const vReady = vValid.filter(o => ['ready', 'delivered'].includes(o.status));
        const vEfficiency = vValid.length > 0 ? Math.round((vReady.length / vValid.length) * 100) : null;
        return { id: v.id, name: v.name, revenue: vRevenue, orders: vOrders.length, active: vActive, avgPrepTime: vAvgPrep, customers: vCustomers, efficiency: vEfficiency, readyCount: vReady.length, validCount: vValid.length };
      })
    : null;

  // Order limit
  const { data: profileData } = await supabase
    .from('profiles').select('plan_id').eq('id', userId).single();
  let userPlan: { name: string; order_limit: number } | null = null;
  if (profileData?.plan_id) {
    const { data } = await supabase.from('subscription_plans').select('name, order_limit').eq('id', profileData.plan_id).single();
    userPlan = data;
  }
  if (!userPlan) {
    const { data } = await supabase.from('subscription_plans').select('name, order_limit').eq('price', 0).limit(1).single();
    userPlan = data;
  }

  const mStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
  const { count: monthlyOrderCount } = await supabase
    .from('orders').select('id', { count: 'exact', head: true })
    .in('vendor_id', allVendorIds)
    .gte('created_at', mStart).lte('created_at', mEnd)
    .neq('status', 'cancelled');

  const orderLimit = userPlan?.order_limit || 50;
  const ordersMonth = monthlyOrderCount || 0;
  const limitExceeded = ordersMonth > orderLimit;

  return {
    vendorName: vendor.name,
    revenue,
    activeCount,
    avgMinutes,
    uniqueCustomers,
    efficiency,
    readyCount: readyOrders.length,
    validCount: validOrders.length,
    chartData,
    currentPeriod: period,
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    globalSummary: vendors.length > 1 ? {
      totalRevenue: allRevenue,
      totalOrders: allOrders.length,
      totalActive: allActive,
      totalCustomers: allCustomers,
      vendors: vendorsSummary!,
    } : undefined,
    orderLimitAlert: limitExceeded ? {
      planName: userPlan?.name || 'Iniciante',
      ordersThisMonth: ordersMonth,
      orderLimit,
    } : undefined,
  };
}
