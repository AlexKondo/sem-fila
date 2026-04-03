import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import VendorSettingsForm from '@/components/dashboard/VendorSettingsForm';
import VendorAccountForm from '@/components/dashboard/VendorAccountForm';
import VendorBusinesses from '@/components/dashboard/VendorBusinesses';
import VendorPremiumStore from '@/components/dashboard/VendorPremiumStore';
import { RevenueReport, EfficiencyPanel, MenuAnalysisPanel, SupportPanel } from '@/components/dashboard/VendorPremiumPanels';
import CollapsibleSection from '@/components/dashboard/CollapsibleSection';
import VendorDashboardClient from '@/components/dashboard/VendorDashboardClient';
import StaffPage from '@/app/dashboard/vendor/staff/page';
import VendorEventPage from '@/app/dashboard/vendor/event/page';
import { fetchDashboardData } from '@/lib/dashboard-data';

const P = '#ec5b13';

export default async function VendorSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [profileRes, vendorsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('vendors').select('*').eq('owner_id', user.id)
  ]);

  const profile = profileRes.data;
  const vendors = vendorsRes.data || [];

  // Busca plano do usuário e consumo do mês
  let userPlan = null;
  if (profile?.plan_id) {
    const { data } = await supabase
      .from('subscription_plans')
      .select('id, name, price, order_limit, features, ia_included')
      .eq('id', profile.plan_id)
      .single();
    userPlan = data;
  }
  if (!userPlan) {
    const { data } = await supabase
      .from('subscription_plans')
      .select('id, name, price, order_limit, features, ia_included')
      .eq('price', 0)
      .limit(1)
      .single();
    userPlan = data;
  }

  // Conta pedidos do mês atual (todas as marcas)
  const vendorIds = vendors.map(v => v.id);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  let ordersThisMonth = 0;
  if (vendorIds.length > 0) {
    const { count } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .in('vendor_id', vendorIds)
      .gte('created_at', monthStart)
      .lte('created_at', monthEnd)
      .neq('status', 'cancelled');
    ordersThisMonth = count || 0;
  }

  const subscriptionData = {
    plan: userPlan ? {
      name: userPlan.name,
      price: Number(userPlan.price),
      orderLimit: userPlan.order_limit,
      features: userPlan.features,
      iaIncluded: userPlan.ia_included,
    } : null,
    isPaid: profile?.plan_id != null,
    ordersThisMonth,
    orderLimit: userPlan?.order_limit || 50,
    exceeded: ordersThisMonth > (userPlan?.order_limit || 50),
    expiresAt: profile?.plan_expires_at || null,
  };

  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const selectedId = cookieStore.get('selected_vendor_id')?.value;

  const vendor = selectedId
    ? vendors.find(v => v.id === selectedId) || vendors[0]
    : vendors[0] || null;

  if (!vendor) redirect('/dashboard/vendor');

  // Convites pendentes para badge
  const { count: pendingInvites } = await supabase
    .from('event_vendor_invitations')
    .select('id', { count: 'exact', head: true })
    .eq('vendor_id', vendor.id)
    .eq('status', 'pending');

  // Dados do Dashboard (hoje por padrão)
  const dashboardData = await fetchDashboardData(supabase, vendor, vendors, user.id);

  return (
    <main className="min-h-screen pb-20 overflow-x-hidden bg-gray-50 dark:bg-slate-950 transition-colors duration-300">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Bloco 1: Meus Negócios */}
        <VendorBusinesses vendors={vendors} currentVendorId={vendor.id} />

        {/* Bloco 2: Minha Conta */}
        <div className="mb-10">
          <VendorAccountForm profile={{ ...profile, email: user.email }} />
        </div>

        {/* Dashboard (expandível) */}
        <div className="mb-6">
          <CollapsibleSection
            title="Dashboard"
            subtitle="Relatórios e vendas do dia"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
          >
            <VendorDashboardClient
              vendorName={dashboardData.vendorName}
              revenue={dashboardData.revenue}
              activeCount={dashboardData.activeCount}
              avgMinutes={dashboardData.avgMinutes}
              uniqueCustomers={dashboardData.uniqueCustomers}
              efficiency={dashboardData.efficiency}
              readyCount={dashboardData.readyCount}
              validCount={dashboardData.validCount}
              chartData={dashboardData.chartData}
              currentPeriod={dashboardData.currentPeriod}
              startDate={dashboardData.startDate}
              endDate={dashboardData.endDate}
              globalSummary={dashboardData.globalSummary}
              orderLimitAlert={dashboardData.orderLimitAlert}
            />
          </CollapsibleSection>
        </div>

        {/* Evento (expandível) */}
        <div className="mb-6">
          <CollapsibleSection
            title="Evento"
            subtitle="Convites e barraca no evento"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
            glow={!!pendingInvites && pendingInvites > 0}
            badge={pendingInvites && pendingInvites > 0 ? `${pendingInvites} pendente${pendingInvites > 1 ? 's' : ''}` : undefined}
          >
            <VendorEventPage />
          </CollapsibleSection>
        </div>

        {/* Equipe (expandível) */}
        <div className="mb-6">
          <CollapsibleSection
            title="Equipe"
            subtitle="Garçons e entregadores"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
          >
            <StaffPage />
          </CollapsibleSection>
        </div>

        {/* Configurações da Marca Selecionada */}
        <div className="mb-6">
          <CollapsibleSection
            title={`Configurações para "${vendor.name}"`}
            subtitle="Ajuste as taxas e regras específicas do seu ponto de venda atual."
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            defaultOpen
          >
            <VendorSettingsForm key={vendor.id} vendor={vendor} subscription={subscriptionData} />
          </CollapsibleSection>
        </div>

        {/* Recursos Premium */}
        <div className="mb-6">
          <CollapsibleSection
            title="Recursos Premium"
            subtitle="Relatórios, benefícios e metas de desempenho"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l2.4 7.2h7.6l-6.1 4.5 2.3 7.3-6.2-4.5-6.2 4.5 2.3-7.3-6.1-4.5h7.6z" /></svg>}
          >
            <div className="space-y-4">
              <RevenueReport vendorId={vendor.id} />
              <EfficiencyPanel vendorId={vendor.id} />
              <MenuAnalysisPanel vendorId={vendor.id} />
              <SupportPanel vendorId={vendor.id} />
              <VendorPremiumStore vendorId={vendor.id} />
            </div>
          </CollapsibleSection>
        </div>
      </div>
    </main>
  );
}
