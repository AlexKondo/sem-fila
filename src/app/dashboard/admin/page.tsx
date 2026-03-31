import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Users, Building2, CalendarDays, Store, ShoppingBag, TrendingUp, DollarSign, Settings, Award, Trophy, BarChart2, Sparkles } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import LogoutButton from '@/components/ui/LogoutButton';
import ThemeToggle from '@/components/ui/ThemeToggle';

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
    { count: totalAffiliates },
    { data: revenueData },
    { data: eventPerformance },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('organizations').select('*', { count: 'exact', head: true }),
    supabase.from('events').select('*', { count: 'exact', head: true }),
    supabase.from('vendors').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'affiliate'),
    supabase.from('orders').select('total_price').eq('payment_status', 'paid'),
    // Simplificando o performance por evento (últimos 5)
    supabase.from('events').select('id, name, created_at').order('created_at', { ascending: false }).limit(5),
  ]);

  const totalRevenue = revenueData?.reduce((sum, o) => sum + (o.total_price ?? 0), 0) ?? 0;

  const stats = [
    { label: 'Usuários', value: totalUsers ?? 0, icon: Users, color: 'bg-blue-50 text-blue-600', href: '/dashboard/admin/users' },
    { label: 'Afiliados', value: totalAffiliates ?? 0, icon: Award, color: 'bg-pink-50 text-pink-600', href: '/dashboard/admin/users' },
    { label: 'Eventos', value: totalEvents ?? 0, icon: CalendarDays, color: 'bg-green-50 text-green-600', href: '/dashboard/admin/events' },
    { label: 'Barracas', value: totalVendors ?? 0, icon: Store, color: 'bg-orange-50 text-orange-600', href: '/dashboard/admin/vendors' },
    { label: 'Pedidos', value: totalOrders ?? 0, icon: ShoppingBag, color: 'bg-yellow-50 text-yellow-600', href: null },
    { label: 'Receita Total', value: formatCurrency(totalRevenue), icon: TrendingUp, color: 'bg-emerald-50 text-emerald-600', isText: true, href: null },
  ];

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
      <header className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center font-black text-white">M</div>
             <div>
              <h1 className="font-bold text-gray-900 dark:text-white leading-none">Master Admin</h1>
              <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase font-bold tracking-tighter">Visão Global do Sistema</p>
             </div>
          </div>
          <nav className="flex items-center gap-1">
            <ThemeToggle />
            <Link href="/dashboard/admin/settings" className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition">
              <Settings className="w-5 h-5" />
            </Link>
            <LogoutButton />
          </nav>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Métricas */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Status da Plataforma</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {stats.map(({ label, value, icon: Icon, color, isText, href }) => {
              const content = (
                <>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <p className={`font-black text-gray-900 dark:text-white ${isText ? 'text-base' : 'text-2xl'}`}>{value}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">{label}</p>
                </>
              );
              return href ? (
                <Link key={label} href={href} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4 border border-gray-100 dark:border-slate-700 hover:shadow-md hover:border-orange-200 dark:hover:border-orange-900 transition cursor-pointer">
                  {content}
                </Link>
              ) : (
                <div key={label} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4 border border-gray-100 dark:border-slate-700">
                  {content}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Performance de Eventos */}
          <div>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">Performance de Eventos</h2>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
               {eventPerformance?.length === 0 ? (
                 <p className="p-6 text-sm text-gray-400 text-center">Nenhum evento ativo.</p>
               ) : (
                 <div className="divide-y divide-gray-50">
                    {eventPerformance?.map(event => (
                      <div key={event.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                        <div>
                          <p className="text-sm font-bold text-gray-800 dark:text-slate-200">{event.name}</p>
                          <p className="text-[10px] text-gray-400 dark:text-slate-500">{new Date(event.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
                        </div>
                        <Link href={`/dashboard/admin/events/${event.id}`} className="text-[10px] font-black text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full uppercase">Relatórios</Link>
                      </div>
                    ))}
                 </div>
               )}
            </div>
          </div>

          {/* Atalhos Rápidos */}
          <div>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">Configurações</h2>
            <div className="grid grid-cols-1 gap-3">
              {[
                { href: '/dashboard/admin/organizations', label: 'Organizações', icon: Building2, desc: 'Empresas e grandes organizadores' },
                { href: '/dashboard/admin/gamification', label: 'Níveis de Bonificação', icon: Trophy, desc: 'Configure bronze, prata, ouro e platina' },
                { href: '/dashboard/admin/ranking', label: 'Ranking & Monetização', icon: BarChart2, desc: 'Rankings globais e assinaturas premium' },
                { href: '/dashboard/admin/benefits', label: 'Benefícios & Metas', icon: Sparkles, desc: 'Benefícios premium e metas automáticas em uma tela' },
                { href: '/dashboard/admin/settings', label: 'Planos e Preços', icon: DollarSign, desc: 'Gerencie quanto cada quiosque paga' },
              ].map(({ href, label, icon: Icon, desc }) => (
                <Link
                  key={href}
                  href={href}
                  className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition border border-gray-100 dark:border-slate-700"
                >
                  <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white leading-none mb-1">{label}</p>
                    <p className="text-[11px] text-gray-400 dark:text-slate-500 line-clamp-1">{desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
