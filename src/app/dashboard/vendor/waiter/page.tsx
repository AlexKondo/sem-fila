// Painel do garçom — integrado ao layout do vendor
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import WaiterBoard from '@/components/dashboard/WaiterBoard';

export default async function WaiterPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Busca o vendor selecionado
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, name')
    .eq('owner_id', user.id)
    .eq('active', true);

  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const selectedId = cookieStore.get('selected_vendor_id')?.value;

  const vendor = selectedId 
    ? vendors?.find(v => v.id === selectedId) || vendors?.[0]
    : vendors?.[0] || null;

  if (!vendor) redirect('/dashboard/vendor');

  // Pedidos prontos para entrega na mesa
  const { data: readyOrders } = await supabase
    .from('orders')
    .select(`*, order_items(id, quantity, menu_items(name))`)
    .eq('vendor_id', vendor.id)
    .eq('status', 'ready')
    .not('table_number', 'is', null)
    .order('created_at', { ascending: true });

  // Chamadas de garçom pendentes
  const { data: waiterCalls } = await supabase
    .from('waiter_calls')
    .select('*')
    .eq('vendor_id', vendor.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  return (
    <div className="py-2">
      <WaiterBoard
        initialReadyOrders={readyOrders ?? []}
        initialWaiterCalls={waiterCalls ?? []}
        vendorId={vendor.id}
      />
    </div>
  );
}
