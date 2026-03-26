import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import VendorOrdersBoard from '@/components/dashboard/VendorOrdersBoard';
import VendorOverview from '@/components/dashboard/VendorOverview';

const P = '#ec5b13';

export default async function VendorDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [profileRes, vendorsRes] = await Promise.all([
    supabase.from('profiles').select('role, name, cnpj, phone').eq('id', user.id).single(),
    supabase.from('vendors').select('*').eq('owner_id', user.id).eq('active', true)
  ]);

  const profile = profileRes.data;
  const vendors = vendorsRes.data || [];

  if (profile?.role === 'platform_admin') redirect('/dashboard/admin');

  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const selectedId = cookieStore.get('selected_vendor_id')?.value;

  // Visão geral de todas as marcas
  if (selectedId === 'all' && vendors.length > 1) {
    return <VendorOverview vendors={vendors} userId={user.id} />;
  }

  const vendor = selectedId
    ? vendors.find(v => v.id === selectedId) || vendors[0]
    : vendors[0] || null;

  if (!vendor) {
    const VendorOnboarding = (await import('@/components/dashboard/VendorOnboarding')).default;
    return <VendorOnboarding userId={user.id} />;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [todayRes, activeRes] = await Promise.all([
    supabase.from('orders').select('total_price, status').eq('vendor_id', vendor.id).gte('created_at', today.toISOString()),
    supabase.from('orders')
      .select('*, order_items(id, quantity, unit_price, menu_items(id, name))')
      .eq('vendor_id', vendor.id)
      .in('status', ['received', 'preparing', 'almost_ready', 'ready', 'delivered', 'cancelled'])
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: true })
  ]);

  const todayOrders = todayRes.data || [];
  const activeOrders = (activeRes.data || []).filter((o: any) => o.status !== 'cancelled' || o.payment_status === 'paid');
  const todayRevenue = todayOrders.reduce((s, o) => s + Number(o.total_price || 0), 0);
  const todayCount = todayOrders.length;

  return (
    <>
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-2">
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Pedidos hoje"
            value={String(todayCount)}
            icon={
              <svg className="w-5 h-5" style={{ color: P }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            }
          />
          <StatCard
            label="Receita hoje"
            value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(todayRevenue)}
            icon={
              <svg className="w-5 h-5" style={{ color: P }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-900">Fila em tempo real</span>
          {activeOrders.length > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: P }}>
              {activeOrders.length}
            </span>
          )}
        </div>
      </div>

      <VendorOrdersBoard initialOrders={activeOrders} vendorId={vendor.id} />
    </>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        {icon}
      </div>
      <p className="text-xl font-bold text-slate-900 leading-tight">{value}</p>
    </div>
  );
}
