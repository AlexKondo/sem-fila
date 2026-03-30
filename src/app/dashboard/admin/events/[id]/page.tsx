import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EventReportPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'platform_admin') redirect('/dashboard/vendor');

  // Busca o evento
  const { data: event } = await supabase
    .from('events')
    .select('*, organizations(name)')
    .eq('id', id)
    .single();

  if (!event) notFound();

  // Busca vendors do evento
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, name, active, rating_avg, order_count, avg_prep_time')
    .eq('event_id', id);

  const vendorIds = (vendors || []).map(v => v.id);

  // Busca pedidos e faturamento em paralelo
  const [
    { data: orders },
    { count: totalOrders },
    { count: cancelledOrders },
  ] = await Promise.all([
    vendorIds.length > 0
      ? supabase.from('orders')
          .select('vendor_id, total_price, status, payment_status, created_at, updated_at')
          .in('vendor_id', vendorIds)
      : Promise.resolve({ data: [] as any[] }),
    vendorIds.length > 0
      ? supabase.from('orders')
          .select('*', { count: 'exact', head: true })
          .in('vendor_id', vendorIds)
      : Promise.resolve({ count: 0 }),
    vendorIds.length > 0
      ? supabase.from('orders')
          .select('*', { count: 'exact', head: true })
          .in('vendor_id', vendorIds)
          .eq('status', 'cancelled')
      : Promise.resolve({ count: 0 }),
  ]);

  const allOrders = orders || [];

  // Calcula métricas
  const paidOrders = allOrders.filter(o => o.payment_status === 'paid');
  const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.total_price ?? 0), 0);
  const avgTicket = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

  // Tempo médio de preparo
  let totalPrepTime = 0;
  let prepCount = 0;
  for (const o of allOrders) {
    if (o.status === 'delivered' && o.updated_at) {
      const mins = (new Date(o.updated_at).getTime() - new Date(o.created_at).getTime()) / 60000;
      if (mins > 0.5 && mins < 120) { totalPrepTime += mins; prepCount++; }
    }
  }
  const avgPrepTime = prepCount > 0 ? Math.round(totalPrepTime / prepCount) : 0;

  // Faturamento por vendor
  const revenueByVendor: Record<string, number> = {};
  const ordersByVendor: Record<string, number> = {};
  for (const o of paidOrders) {
    revenueByVendor[o.vendor_id] = (revenueByVendor[o.vendor_id] || 0) + (o.total_price ?? 0);
    ordersByVendor[o.vendor_id] = (ordersByVendor[o.vendor_id] || 0) + 1;
  }

  // Ranking de vendors por faturamento
  const vendorRanking = (vendors || [])
    .map(v => ({
      ...v,
      revenue: revenueByVendor[v.id] || 0,
      orders: ordersByVendor[v.id] || 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const cancelRate = (totalOrders || 0) > 0 ? Math.round(((cancelledOrders || 0) / (totalOrders || 1)) * 100) : 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgName = (event as any).organizations?.name;

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard/admin" className="p-2 text-gray-400 hover:text-gray-900 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div className="flex-1">
            <h1 className="font-bold text-gray-900 leading-none">{event.name}</h1>
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">
              {orgName ? `${orgName} — ` : ''}Relatório do Evento
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Info do evento */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {event.start_date && (
              <div>
                <p className="text-gray-400 font-bold uppercase text-[10px]">Data</p>
                <p className="font-bold text-gray-900">
                  {new Date(event.start_date).toLocaleDateString('pt-BR')}
                  {event.end_date ? ` - ${new Date(event.end_date).toLocaleDateString('pt-BR')}` : ''}
                </p>
              </div>
            )}
            {event.start_time && (
              <div>
                <p className="text-gray-400 font-bold uppercase text-[10px]">Horario</p>
                <p className="font-bold text-gray-900">
                  {event.start_time?.slice(0, 5)}{event.end_time ? ` - ${event.end_time.slice(0, 5)}` : ''}
                </p>
              </div>
            )}
            {event.location && (
              <div>
                <p className="text-gray-400 font-bold uppercase text-[10px]">Local</p>
                <p className="font-bold text-gray-900">{event.location}</p>
              </div>
            )}
            <div>
              <p className="text-gray-400 font-bold uppercase text-[10px]">Status</p>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${event.active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                {event.active ? 'Ativo' : 'Encerrado'}
              </span>
            </div>
          </div>
        </div>

        {/* Métricas gerais */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-black text-emerald-700">{formatCurrency(totalRevenue)}</p>
            <p className="text-[10px] text-gray-500 font-bold uppercase">Faturamento total</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-black text-gray-900">{totalOrders || 0}</p>
            <p className="text-[10px] text-gray-500 font-bold uppercase">Pedidos</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-black text-blue-700">{formatCurrency(avgTicket)}</p>
            <p className="text-[10px] text-gray-500 font-bold uppercase">Ticket medio</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-black text-orange-600">{vendorIds.length}</p>
            <p className="text-[10px] text-gray-500 font-bold uppercase">Barracas</p>
          </div>
        </div>

        {/* Métricas de operação */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-xl font-black text-green-700">{avgPrepTime > 0 ? `${avgPrepTime}min` : '--'}</p>
            <p className="text-[10px] text-gray-500 font-bold uppercase">Tempo medio preparo</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-xl font-black text-red-600">{cancelledOrders || 0}</p>
            <p className="text-[10px] text-gray-500 font-bold uppercase">Cancelamentos</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-xl font-black text-red-600">{cancelRate}%</p>
            <p className="text-[10px] text-gray-500 font-bold uppercase">Taxa cancelamento</p>
          </div>
        </div>

        {/* Ranking de barracas */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Ranking de Barracas</h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {vendorRanking.length === 0 ? (
              <p className="p-6 text-sm text-gray-400 text-center">Nenhuma barraca vinculada a este evento.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {vendorRanking.map((v, i) => (
                  <div key={v.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                        i === 0 ? 'bg-amber-100 text-amber-700' :
                        i === 1 ? 'bg-gray-100 text-gray-600' :
                        i === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-50 text-gray-400'
                      }`}>
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{v.name}</p>
                        <p className="text-[10px] text-gray-400">
                          {v.orders} pedidos
                          {v.rating_avg ? ` | ${Number(v.rating_avg).toFixed(1)} estrelas` : ''}
                          {v.avg_prep_time ? ` | ${v.avg_prep_time}min preparo` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-emerald-700">{formatCurrency(v.revenue)}</p>
                      <p className="text-[10px] text-gray-400">
                        {v.orders > 0 ? `${formatCurrency(v.revenue / v.orders)} / pedido` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}
