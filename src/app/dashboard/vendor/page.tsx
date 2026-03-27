import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import VendorOrdersBoard from '@/components/dashboard/VendorOrdersBoard';
import VendorOverview from '@/components/dashboard/VendorOverview';

const P = '#ec5b13'; // used in JSX below

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

  // Usa RPC SECURITY DEFINER para evitar bloqueio recursivo de RLS
  const { data: rpcOrders } = await supabase.rpc('get_vendor_orders', {
    p_vendor_id: vendor.id,
    p_since: today.toISOString(),
  });

  const activeOrders = (rpcOrders || []) as any[];

  return (
    <>
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

