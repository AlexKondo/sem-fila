import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { formatCurrency } from '@/lib/utils';
import VendorDashboardClient from '@/components/dashboard/VendorDashboardClient';

export default async function VendorDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const cookieStore = await cookies();
  const selectedId = cookieStore.get('selected_vendor_id')?.value;

  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, name')
    .eq('owner_id', user.id)
    .eq('active', true);

  if (!vendors?.length) redirect('/dashboard/vendor');

  const vendor = selectedId && selectedId !== 'all'
    ? vendors.find(v => v.id === selectedId) ?? vendors[0]
    : vendors[0];

  // Hoje
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Últimos 7 dias
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const [todayRes, weekRes, customersRes] = await Promise.all([
    supabase
      .from('orders')
      .select('id, total_price, status, created_at, updated_at')
      .eq('vendor_id', vendor.id)
      .gte('created_at', todayStart.toISOString()),
    supabase
      .from('orders')
      .select('id, total_price, status, created_at, updated_at')
      .eq('vendor_id', vendor.id)
      .gte('created_at', weekStart.toISOString())
      .order('created_at', { ascending: true }),
    supabase
      .from('orders')
      .select('user_id')
      .eq('vendor_id', vendor.id)
      .not('user_id', 'is', null),
  ]);

  const todayOrders = todayRes.data ?? [];
  const weekOrders = weekRes.data ?? [];

  const todayRevenue = todayOrders.reduce((s, o) => s + Number(o.total_price || 0), 0);
  const activeCount = todayOrders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length;
  const uniqueCustomers = new Set(customersRes.data?.map(o => o.user_id)).size;

  // Tempo médio por pedido (delivered): updated_at - created_at em minutos
  const deliveredToday = todayOrders.filter(o => o.status === 'delivered' && o.updated_at);
  const avgMinutes = deliveredToday.length > 0
    ? Math.round(
        deliveredToday.reduce((s, o) => {
          const diff = (new Date(o.updated_at).getTime() - new Date(o.created_at).getTime()) / 60000;
          return s + diff;
        }, 0) / deliveredToday.length
      )
    : null;

  // Eficiência: prontos / total de hoje (excluindo cancelados)
  const validToday = todayOrders.filter(o => o.status !== 'cancelled');
  const readyToday = validToday.filter(o => ['ready', 'delivered'].includes(o.status));
  const efficiency = validToday.length > 0 ? Math.round((readyToday.length / validToday.length) * 100) : null;

  // Receita por hora hoje (0–23h)
  const revenueByHour = Array.from({ length: 24 }, (_, h) => {
    const total = todayOrders
      .filter(o => new Date(o.created_at).getHours() === h && o.status !== 'cancelled')
      .reduce((s, o) => s + Number(o.total_price || 0), 0);
    return { hour: h, total };
  });

  // Receita por dia últimos 7 dias
  const revenueByDay = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const label = d.toLocaleDateString('pt-BR', { weekday: 'short' });
    const total = weekOrders
      .filter(o => {
        const od = new Date(o.created_at);
        return od.getDate() === d.getDate() && od.getMonth() === d.getMonth() && o.status !== 'cancelled';
      })
      .reduce((s, o) => s + Number(o.total_price || 0), 0);
    return { label, total };
  });

  return (
    <VendorDashboardClient
      vendorName={vendor.name}
      todayRevenue={todayRevenue}
      activeCount={activeCount}
      avgMinutes={avgMinutes}
      uniqueCustomers={uniqueCustomers}
      efficiency={efficiency}
      readyCount={readyToday.length}
      validCount={validToday.length}
      revenueByHour={revenueByHour}
      revenueByDay={revenueByDay}
    />
  );
}
