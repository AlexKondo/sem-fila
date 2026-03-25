import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import VendorHeader from '@/components/dashboard/VendorHeader';

export default async function VendorDashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, cnpj')
    .eq('id', user.id)
    .single();

  const { createAdminClient } = await import('@/lib/supabase/server');
  const adminSupabase = await createAdminClient();

  const { data: vendors } = await adminSupabase
    .from('vendors')
    .select('*')
    .eq('owner_id', user.id)
    .eq('active', true);

  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const selectedId = cookieStore.get('selected_vendor_id')?.value;

  // Se houver múltiplos vendors e nenhum salvo no cookie, renderiza seletor
  if (vendors && vendors.length > 1 && !selectedId) {
    const VendorSelector = (await import('@/components/dashboard/VendorSelector')).default;
    return <VendorSelector vendors={vendors} />;
  }

  // Se houver cookie, pega o correto. Do contrário, o primeiro.
  const vendor = selectedId 
    ? vendors?.find(v => v.id === selectedId) || vendors?.[0]
    : vendors?.[0] || null;

  const cnpjFormatted = profile?.cnpj
    ? profile.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
    : null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8f6f6' }}>
      {vendor && (
        <VendorHeader 
          vendorName={vendor.name} 
          cnpjFormatted={cnpjFormatted} 
          vendorId={vendor.id}
        />
      )}
      {children}
    </div>
  );
}
