import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import VendorSettingsForm from '@/components/dashboard/VendorSettingsForm';
import VendorAccountForm from '@/components/dashboard/VendorAccountForm';
import VendorBusinesses from '@/components/dashboard/VendorBusinesses';

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
        <section>
          <div className="mb-6 px-2">
            <h2 className="text-xl font-bold text-slate-900">Configurações para "{vendor.name}"</h2>
            <p className="text-sm text-slate-500 font-medium">Ajuste as taxas e regras específicas do seu ponto de venda atual.</p>
          </div>
          <VendorSettingsForm vendor={vendor} subscription={subscriptionData} />
        </section>
      </div>
    </main>
  );
}
