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

  const { createAdminClient } = await import('@/lib/supabase/server');
  const adminSupabase = await createAdminClient();

  const { data: vendors } = await adminSupabase
    .from('vendors')
    .select('id, name')
    .eq('owner_id', user.id)
    .limit(1);

  const vendor = vendors?.[0] || null;

  if (!vendor) redirect('/dashboard/vendor');

  const { data: items } = await adminSupabase
    .from('menu_items')
    .select('*')
    .eq('vendor_id', vendor.id)
    .order('position', { ascending: true });

  return (
    <main className="min-h-screen bg-gray-50">


      <MenuManager initialItems={items ?? []} vendorId={vendor.id} />
    </main>
  );
}
