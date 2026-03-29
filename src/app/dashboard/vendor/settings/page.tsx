import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import VendorSettingsForm from '@/components/dashboard/VendorSettingsForm';
import VendorAccountForm from '@/components/dashboard/VendorAccountForm';
import VendorBusinesses from '@/components/dashboard/VendorBusinesses';
import VendorPremiumStore from '@/components/dashboard/VendorPremiumStore';
import { RevenueReport, EfficiencyPanel } from '@/components/dashboard/VendorPremiumPanels';
import CollapsibleSection from '@/components/dashboard/CollapsibleSection';

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

  return (
    <main className="min-h-screen pb-20 overflow-x-hidden" style={{ backgroundColor: '#f8f6f6' }}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        
        {/* Bloco 1: Meus Negócios */}
        <VendorBusinesses vendors={vendors} currentVendorId={vendor.id} />

        {/* Bloco 2: Minha Conta */}
        <div className="mb-10">
          <VendorAccountForm profile={{ ...profile, email: user.email }} />
        </div>

        {/* Bloco 3: Configurações da Marca Selecionada */}
        <CollapsibleSection
          title={`Configurações para "${vendor.name}"`}
          subtitle="Ajuste as taxas e regras específicas do seu ponto de venda atual."
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          defaultOpen
        >
          <VendorSettingsForm key={vendor.id} vendor={vendor} subscription={subscriptionData} />
        </CollapsibleSection>

        {/* Bloco 4: Recursos Premium (consolidado) */}
        <div className="mt-10">
          <CollapsibleSection
            title="Recursos Premium"
            subtitle="Relatórios, benefícios e metas de desempenho"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l2.4 7.2h7.6l-6.1 4.5 2.3 7.3-6.2-4.5-6.2 4.5 2.3-7.3-6.1-4.5h7.6z" /></svg>}
          >
            <div className="space-y-4">
              <RevenueReport vendorId={vendor.id} />
              <EfficiencyPanel vendorId={vendor.id} />
              <VendorPremiumStore vendorId={vendor.id} />
            </div>
          </CollapsibleSection>
        </div>
      </div>
    </main>
  );
}
