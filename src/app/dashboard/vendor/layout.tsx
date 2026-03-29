import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import VendorHeader from '@/components/dashboard/VendorHeader';

const STAFF_ROLES = ['waitstaff', 'deliverer', 'org_admin'];

export default async function VendorDashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [profileRes, vendorsRes] = await Promise.all([
    supabase.from('profiles').select('role, cnpj, name').eq('id', user.id).single(),
    supabase.from('vendors').select('*').eq('owner_id', user.id)
  ]);

  const profile = profileRes.data;
  const userRole = profile?.role || 'vendor';
  const isStaff = STAFF_ROLES.includes(userRole);
  let vendors = vendorsRes.data || [];

  // Staff: busca vendor via staff_schedules
  if (isStaff && vendors.length === 0) {
    const { data: staffSchedule } = await supabase
      .from('staff_schedules')
      .select('vendor_id, vendors(*)')
      .eq('user_id', user.id)
      .eq('active', true)
      .limit(1)
      .single();

    if (staffSchedule?.vendors) {
      vendors = [staffSchedule.vendors as any];
    }
  }

  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const selectedId = cookieStore.get('selected_vendor_id')?.value;

  // Se tem múltiplos vendors e não escolheu nenhum ainda, mostra seletor
  if (vendors.length > 1 && !selectedId && !isStaff) {
    const VendorSelector = (await import('@/components/dashboard/VendorSelector')).default;
    return <VendorSelector vendors={vendors} />;
  }

  // 'all' = visão geral de todas as marcas
  const isOverview = selectedId === 'all' && !isStaff;
  const vendor = isOverview
    ? null
    : selectedId
      ? vendors.find(v => v.id === selectedId) || vendors[0]
      : vendors[0] || null;

  const cnpjFormatted = !isStaff && profile?.cnpj
    ? String(profile.cnpj).replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
    : null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8f6f6' }}>
      <VendorHeader
        vendorName={isOverview ? 'Visão Geral' : (vendor?.name ?? 'Meu Negócio')}
        userName={profile?.name || ''}
        cnpjFormatted={cnpjFormatted}
        vendorId={vendor?.id ?? null}
        multiVendor={vendors.length > 1 && !isStaff}
        isOverview={isOverview}
        userRole={userRole}
      />
      <main>
        {children}
      </main>
    </div>
  );
}
