import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import VendorSettingsForm from '@/components/dashboard/VendorSettingsForm';

export default async function VendorSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: vendors } = await supabase
    .from('vendors')
    .select('*')
    .eq('owner_id', user.id)
    .eq('active', true);

  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const selectedId = cookieStore.get('selected_vendor_id')?.value;

  const vendor = selectedId 
    ? vendors?.find(v => v.id === selectedId) || vendors?.[0]
    : vendors?.[0] || null;

  if (!vendor) redirect('/dashboard/vendor');

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Configurações da Loja</h1>
        <p className="text-sm text-gray-500 mb-6">Ajuste as taxas, tipo de operação e cupons ativos para "{vendor.name}".</p>
        
        <VendorSettingsForm vendor={vendor} />
      </div>
    </main>
  );
}
