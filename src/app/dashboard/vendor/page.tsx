// Dashboard do Vendedor — página principal
// Mostra fila de pedidos em tempo real + link para cardápio e QR Code

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import VendorOrdersBoard from '@/components/dashboard/VendorOrdersBoard';
import Link from 'next/link';
import { QrCode, UtensilsCrossed, Users } from 'lucide-react';
import LogoutButton from '@/components/ui/LogoutButton';

export default async function VendorDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // platform_admin não tem vendor — manda para o painel correto
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role === 'platform_admin') redirect('/dashboard/admin');

  const { data: vendor } = await supabase
    .from('vendors')
    .select('*')
    .eq('owner_id', user.id)
    .eq('active', true)
    .single();

  if (!vendor) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-4">🏪</p>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Nenhuma barraca encontrada</h2>
          <p className="text-gray-500 text-sm mb-4">
            Seu perfil ainda não possui uma barraca vinculada. Contate o administrador do evento.
          </p>
          <LogoutButton className="mx-auto flex items-center gap-1.5 text-sm text-red-500 hover:underline" />
        </div>
      </main>
    );
  }

  const { data: orders } = await supabase
    .from('orders')
    .select(`*, order_items(id, quantity, unit_price, menu_items(id, name))`)
    .eq('vendor_id', vendor.id)
    .in('status', ['received', 'preparing', 'almost_ready', 'ready'])
    .order('created_at', { ascending: true });

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold text-gray-900 text-base">{vendor.name}</h1>
              <p className="text-xs text-gray-400">Fila de pedidos em tempo real</p>
            </div>
            <LogoutButton />
          </div>

          {/* Navegação rápida com labels */}
          <div className="flex gap-2 mt-3">
            <Link
              href="/dashboard/vendor/menu"
              className="flex-1 flex items-center justify-center gap-1.5 bg-orange-500 text-white text-xs font-semibold py-2 rounded-xl hover:bg-orange-600 transition"
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              Cadastrar produtos
            </Link>
            <Link
              href="/dashboard/vendor/qrcode"
              className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 text-gray-700 text-xs font-semibold py-2 rounded-xl hover:bg-gray-200 transition"
            >
              <QrCode className="w-3.5 h-3.5" />
              Meu QR Code
            </Link>
            <Link
              href="/dashboard/waiter"
              className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 text-gray-700 text-xs font-semibold py-2 rounded-xl hover:bg-gray-200 transition"
            >
              <Users className="w-3.5 h-3.5" />
              Garçom
            </Link>
          </div>
        </div>
      </header>

      <VendorOrdersBoard initialOrders={orders ?? []} vendorId={vendor.id} />
    </main>
  );
}
