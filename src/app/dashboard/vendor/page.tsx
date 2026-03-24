import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import VendorOrdersBoard from '@/components/dashboard/VendorOrdersBoard';
import Link from 'next/link';
import LogoutButton from '@/components/ui/LogoutButton';

const P = '#ec5b13';

export default async function VendorDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, name, cnpj, phone')
    .eq('id', user.id)
    .single();

  if (profile?.role === 'platform_admin') redirect('/dashboard/admin');

  const { data: vendor, error: vendorErr } = await supabase
    .from('vendors')
    .select('*')
    .eq('owner_id', user.id)
    .eq('active', true)
    .single();

  if (vendorErr) {
    console.error("Erro ao buscar vendor:", vendorErr);
  }

  // Conta pedidos ativos e calcula receita do dia
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let todayOrders: any[] = [];
  try {
    if (vendor) {
      const { data } = await supabase
        .from('orders')
        .select('total_price, status')
        .eq('vendor_id', vendor.id)
        .gte('created_at', today.toISOString());
      todayOrders = data || [];
    }
  } catch (e) {
    console.error("Erro ao processar todayOrders:", e);
  }

  const todayRevenue = todayOrders.reduce((s, o) => s + Number(o.total_price || 0), 0);
  const todayCount = todayOrders.length;

  let activeOrders: any[] = [];
  try {
    if (vendor) {
      const { data } = await supabase
        .from('orders')
        .select(`*, order_items(id, quantity, unit_price, menu_items(id, name))`)
        .eq('vendor_id', vendor.id)
        .in('status', ['received', 'preparing', 'almost_ready', 'ready'])
        .order('created_at', { ascending: true });
      activeOrders = data || [];
    }
  } catch (e) {
    console.error("Erro ao buscar activeOrders:", e);
  }

  if (!vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: '#f8f6f6' }}>
        <div className="bg-white rounded-3xl p-10 text-center max-w-sm w-full shadow-sm border border-slate-100">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: P + '15' }}>
            <svg className="w-8 h-8" style={{ color: P }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Configurando seu negócio…</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            Seu perfil foi criado. Entre em contato com o suporte para vincular sua barraca.
          </p>
          <LogoutButton className="mx-auto flex items-center gap-1.5 text-sm font-semibold" style={{ color: P }} />
        </div>
      </div>
    );
  }

  const cnpjFormatted = profile?.cnpj
    ? profile.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
    : null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8f6f6' }}>
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo + vendor name */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: P }}>
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
                </svg>
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm leading-tight">{vendor.name}</p>
                {cnpjFormatted && <p className="text-[11px] text-slate-400">CNPJ {cnpjFormatted}</p>}
              </div>
            </div>
            <LogoutButton />
          </div>

          {/* Nav tabs */}
          <nav className="flex gap-1 mt-3 overflow-x-auto no-scrollbar">
            <NavTab href="/dashboard/vendor" active label="Pedidos" icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            } />
            <NavTab href="/dashboard/vendor/menu" label="Cardápio" icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            } />
            <NavTab href="/dashboard/vendor/qrcode" label="QR Code" icon={
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M3 3h7v7H3V3zm2 2v3h3V5H5zm7-2h7v7h-7V3zm2 2v3h3V5h-3zM3 13h7v7H3v-7zm2 2v3h3v-3H5zm10 0h2v2h-2v-2zm-2 2h2v2h-2v-2zm4 0h2v2h-2v-2zm0-4h2v2h-2v-2zm-4 0h2v2h-2v-2zm2 2h2v2h-2v-2z"/></svg>
            } />
            <NavTab href="/dashboard/waiter" label="Garçom" icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            } />
          </nav>
        </div>
      </header>

      {/* Stats cards */}
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

      {/* Active orders label */}
      <div className="max-w-2xl mx-auto px-4 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-900">Fila em tempo real</span>
          {(activeOrders ?? []).length > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: P }}>
              {(activeOrders ?? []).length}
            </span>
          )}
        </div>
      </div>

      <VendorOrdersBoard initialOrders={activeOrders ?? []} vendorId={vendor.id} />
    </div>
  );
}

function NavTab({ href, label, icon, active }: { href: string; label: string; icon: React.ReactNode; active?: boolean }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shrink-0 transition-colors"
      style={active
        ? { backgroundColor: P + '15', color: P }
        : { color: '#64748b' }
      }
    >
      {icon}
      {label}
    </Link>
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
