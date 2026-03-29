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
    supabase.from('vendors').select('*').eq('owner_id', user.id)
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
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <p className="text-slate-500 font-medium">Nenhum negócio vinculado a esta conta.</p>
        <p className="text-slate-400 text-sm mt-2">Certifique-se de que o cadastro foi concluído com sucesso.</p>
      </div>
    );
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Usa RPC SECURITY DEFINER para evitar bloqueio recursivo de RLS
  const { data: rpcOrders } = await supabase.rpc('get_vendor_orders', {
    p_vendor_id: vendor.id,
    p_since: today.toISOString(),
  });

  const allOrders = (rpcOrders || []) as any[];
  const pendingCount = allOrders.filter((o: any) => !['delivered', 'cancelled'].includes(o.status)).length;

  return (
    <>
      <div className="max-w-2xl mx-auto px-4 pb-2 text-center">
        <div className="inline-flex items-center gap-2">
          <span className="text-sm font-bold text-slate-900">Pedidos</span>
          {pendingCount > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: P }}>
              {pendingCount}
            </span>
          )}
        </div>
      </div>

      <VendorOrdersBoard initialOrders={allOrders} vendorId={vendor.id} />
    </>
  );
}

