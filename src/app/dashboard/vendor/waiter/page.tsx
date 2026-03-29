// Painel do garçom — integrado ao layout do vendor
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import WaiterBoard from '@/components/dashboard/WaiterBoard';

export default async function WaiterPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, name, business_type')
    .eq('owner_id', user.id);

  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const selectedId = cookieStore.get('selected_vendor_id')?.value;

  const vendor = selectedId
    ? vendors?.find(v => v.id === selectedId) || vendors?.[0]
    : vendors?.[0] || null;

  if (!vendor) redirect('/dashboard/vendor');

  const businessType = (vendor as any).business_type || 'kiosk';
  const hasTableManagement = ['restaurant', 'restaurant_kilo', 'bar'].includes(businessType);

  // Busca tudo em paralelo
  const [
    { data: readyOrders },
    { data: waiterCalls },
    { data: vendorTables },
    { data: queueEntries },
  ] = await Promise.all([
    supabase
      .from('orders')
      .select(`*, order_items(id, quantity, menu_items(name))`)
      .eq('vendor_id', vendor.id)
      .eq('status', 'ready')
      .not('table_number', 'is', null)
      .order('created_at', { ascending: true }),
    supabase
      .from('waiter_calls')
      .select('*')
      .eq('vendor_id', vendor.id)
      .order('created_at', { ascending: false })
      .limit(50),
    hasTableManagement
      ? supabase.from('vendor_tables').select('*').eq('vendor_id', vendor.id).order('table_number')
      : Promise.resolve({ data: [] }),
    hasTableManagement
      ? supabase.from('queue_entries').select('*').eq('vendor_id', vendor.id).in('status', ['waiting', 'called']).order('position', { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <div className="py-2">
      <WaiterBoard
        initialReadyOrders={readyOrders ?? []}
        initialWaiterCalls={waiterCalls ?? []}
        initialTables={vendorTables ?? []}
        initialQueue={queueEntries ?? []}
        vendorId={vendor.id}
        hasTableManagement={hasTableManagement}
      />
    </div>
  );
}
