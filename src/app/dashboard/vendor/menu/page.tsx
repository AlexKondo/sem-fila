// Gestão de cardápio do vendedor

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import MenuManager from '@/components/dashboard/MenuManager';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { resolveVendor } from '@/lib/vendor-resolver';

export default async function VendorMenuPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { vendor } = await resolveVendor(supabase, user.id);

  if (!vendor) redirect('/dashboard/vendor');

  const { data: items } = await supabase
    .from('menu_items')
    .select('*')
    .eq('vendor_id', vendor.id)
    .order('position', { ascending: true });

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
      <MenuManager 
        initialItems={items ?? []} 
        vendorId={vendor.id} 
        aiEnabled={vendor.ai_photo_enabled} 
        aiCredits={vendor.ai_photo_credits}
      />
    </main>
  );
}
