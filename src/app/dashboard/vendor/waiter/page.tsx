// Painel do garçom — integrado ao layout do vendor
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import WaiterBoard from '@/components/dashboard/WaiterBoard';
import { resolveVendor } from '@/lib/vendor-resolver';

export default async function WaiterPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { vendor } = await resolveVendor(supabase, user.id, { select: 'id, name, business_type' });

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
      ? supabase.from('vendor_tables').select('*').eq('vendor_id', vendor.id)
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
        initialTables={[...(vendorTables ?? [])].sort((a, b) => Number(a.table_number) - Number(b.table_number))}
        initialQueue={queueEntries ?? []}
        vendorId={vendor.id}
        hasTableManagement={hasTableManagement}
      />
    </div>
  );
}
