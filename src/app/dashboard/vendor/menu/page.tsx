// Gestão de cardápio do vendedor

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import MenuManager from '@/components/dashboard/MenuManager';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function VendorMenuPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, name, ai_photo_enabled, ai_photo_credits')
    .eq('owner_id', user.id)
    .eq('active', true);

  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const selectedId = cookieStore.get('selected_vendor_id')?.value;

  const vendor = selectedId
    ? vendors?.find(v => v.id === selectedId) || vendors?.[0]
    : vendors?.[0] || null;

  if (!vendor) redirect('/dashboard/vendor');

  const { data: items } = await supabase
    .from('menu_items')
    .select('*')
    .eq('vendor_id', vendor.id)
    .order('position', { ascending: true });

  return (
    <main className="min-h-screen bg-gray-50">
      <MenuManager 
        initialItems={items ?? []} 
        vendorId={vendor.id} 
        aiEnabled={vendor.ai_photo_enabled} 
        aiCredits={vendor.ai_photo_credits}
      />
    </main>
  );
}
