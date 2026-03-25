// Painel do garçom — pedidos prontos + chamadas de mesa em tempo real

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import WaiterBoard from '@/components/dashboard/WaiterBoard';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function WaiterPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { createAdminClient } = await import('@/lib/supabase/server');
  const adminSupabase = await createAdminClient();

  const { data: vendors } = await adminSupabase
    .from('vendors')
    .select('id, name')
    .eq('owner_id', user.id)
    .limit(1);

  const vendor = vendors?.[0] || null;

  if (!vendor) redirect('/dashboard/vendor');

  // Pedidos prontos para entrega na mesa
  const { data: readyOrders } = await adminSupabase
    .from('orders')
    .select(`*, order_items(id, quantity, menu_items(name))`)
    .eq('vendor_id', vendor.id)
    .eq('status', 'ready')
    .not('table_number', 'is', null)
    .order('created_at', { ascending: true });

  // Chamadas de garçom pendentes
  const { data: waiterCalls } = await adminSupabase
    .from('waiter_calls')
    .select('*')
    .eq('vendor_id', vendor.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard/vendor" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-bold text-gray-900">Painel do Garçom</h1>
            <p className="text-xs text-gray-500">{vendor.name}</p>
          </div>
        </div>
      </header>

      <WaiterBoard
        initialReadyOrders={readyOrders ?? []}
        initialWaiterCalls={waiterCalls ?? []}
        vendorId={vendor.id}
      />
    </main>
  );
}
