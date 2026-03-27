import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { formatCurrency } from '@/lib/utils';
import VendorDashboardClient from '@/components/dashboard/VendorDashboardClient';

interface Props {
  searchParams: Promise<{ period?: string }>;
}

export default async function VendorDashboardPage({ searchParams }: Props) {
  const { period = 'today' } = await searchParams;
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

  // Cálculo do Início do Período
  const now = new Date();
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);

  if (period === '7d') startDate.setDate(now.getDate() - 6);
  else if (period === '30d') startDate.setDate(now.getDate() - 29);
  else if (period === 'all') startDate.setFullYear(2020); // Data genérica antiga

  // No caso de "hoje", usamos o hojeStart real. Para outros, o startDate calculado.
  const periodStart = startDate.toISOString();

  // Para o gráfico de histórico (últimos 7 dias fixos ou conforme período)
  const weekStart = new Date();
  weekStart.setDate(now.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const [periodRes, customersRes] = await Promise.all([
    supabase
      .from('orders')
      .select('id, total_price, status, created_at, updated_at')
      .eq('vendor_id', vendor.id)
      .gte('created_at', periodStart)
      .order('created_at', { ascending: true }),
    supabase
      .from('orders')
      .select('user_id')
      .eq('vendor_id', vendor.id)
      .not('user_id', 'is', null),
  ]);

  const periodOrders = periodRes.data ?? [];

  const revenue = periodOrders.reduce((s, o) => s + Number(o.total_price || 0), 0);
  const activeCount = periodOrders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length;
  const uniqueCustomers = new Set(customersRes.data?.map(o => o.user_id)).size;

  // Tempo médio por pedido (delivered) no período
  const delivered = periodOrders.filter(o => o.status === 'delivered' && o.updated_at);
  const avgMinutes = delivered.length > 0
    ? Math.round(
        delivered.reduce((s, o) => {
          const diff = (new Date(o.updated_at).getTime() - new Date(o.created_at).getTime()) / 60000;
          return s + diff;
        }, 0) / delivered.length
      )
    : null;

  // Eficiência: prontos / total (excluindo cancelados) no período
  const validOrders = periodOrders.filter(o => o.status !== 'cancelled');
  const readyOrders = validOrders.filter(o => ['ready', 'delivered'].includes(o.status));
  const efficiency = validOrders.length > 0 ? Math.round((readyOrders.length / validOrders.length) * 100) : null;

  // Dados para o gráfico de barras (Receita por hora se for HOJE, ou por dia se for período maior)
  let chartData: { label: string; total: number; isNow?: boolean }[] = [];

  if (period === 'today') {
    chartData = Array.from({ length: 24 }, (_, h) => {
      const total = periodOrders
        .filter(o => new Date(o.created_at).getHours() === h && o.status !== 'cancelled')
        .reduce((s, o) => s + Number(o.total_price || 0), 0);
      return { label: `${h}h`, total, isNow: now.getHours() === h, hour: h } as any;
    });
  } else {
    // Agrupar por dia para períodos longos
    const daysCount = period === '7d' ? 7 : 30;
    chartData = Array.from({ length: daysCount }, (_, i) => {
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
    />
  );
}
