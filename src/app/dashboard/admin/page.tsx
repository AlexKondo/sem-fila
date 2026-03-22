import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Users, Building2, CalendarDays, Store, ShoppingBag, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import LogoutButton from '@/components/ui/LogoutButton';

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Verifica role platform_admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, name')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'platform_admin') redirect('/dashboard/vendor');

  // Busca métricas globais em paralelo
  const [
    { count: totalUsers },
    { count: totalOrgs },
    { count: totalEvents },
    { count: totalVendors },
    { count: totalOrders },
    { data: revenueData },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('organizations').select('*', { count: 'exact', head: true }),
    supabase.from('events').select('*', { count: 'exact', head: true }),
    supabase.from('vendors').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('total_price').eq('payment_status', 'paid'),
  ]);

  const totalRevenue = revenueData?.reduce((sum, o) => sum + (o.total_price ?? 0), 0) ?? 0;

  const stats = [
    { label: 'Usuários', value: totalUsers ?? 0, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: 'Organizações', value: totalOrgs ?? 0, icon: Building2, color: 'bg-purple-50 text-purple-600' },
    { label: 'Eventos', value: totalEvents ?? 0, icon: CalendarDays, color: 'bg-green-50 text-green-600' },
    { label: 'Barracas', value: totalVendors ?? 0, icon: Store, color: 'bg-orange-50 text-orange-600' },
    { label: 'Pedidos', value: totalOrders ?? 0, icon: ShoppingBag, color: 'bg-yellow-50 text-yellow-600' },
    { label: 'Receita (pago)', value: formatCurrency(totalRevenue), icon: TrendingUp, color: 'bg-emerald-50 text-emerald-600', isText: true },
  ];

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-gray-900">Painel Admin</h1>
            <p className="text-xs text-gray-500">Olá, {profile?.name ?? user.email}</p>
          </div>
          <nav className="flex items-center gap-1">
            <Link href="/dashboard/admin/organizations" className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition">Organizações</Link>
            <Link href="/dashboard/admin/vendors" className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition">Barracas</Link>
            <Link href="/dashboard/admin/users" className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition">Usuários</Link>
            <LogoutButton />
          </nav>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Métricas */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Visão geral</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {stats.map(({ label, value, icon: Icon, color, isText }) => (
              <div key={label} className="bg-white rounded-2xl shadow-sm p-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className={`font-bold text-gray-900 ${isText ? 'text-base' : 'text-2xl'}`}>{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Atalhos */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Ações rápidas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { href: '/dashboard/admin/organizations', label: 'Gerenciar organizações e eventos', icon: Building2 },
              { href: '/dashboard/admin/vendors', label: 'Gerenciar barracas e vincular donos', icon: Store },
              { href: '/dashboard/admin/users', label: 'Gerenciar usuários e cargos', icon: Users },
            ].map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition"
              >
                <div className="w-9 h-9 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-sm font-medium text-gray-800">{label}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
