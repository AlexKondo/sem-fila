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

  const { data: vendor } = await supabase
    .from('vendors')
    .select('id, name')
    .eq('owner_id', user.id)
    .single();

  if (!vendor) redirect('/dashboard/vendor');

  const { data: items } = await supabase
    .from('menu_items')
    .select('*')
    .eq('vendor_id', vendor.id)
    .order('position', { ascending: true });

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard/vendor" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-bold text-gray-900">Cardápio</h1>
            <p className="text-xs text-gray-500">{vendor.name}</p>
          </div>
        </div>
      </header>

      <MenuManager initialItems={items ?? []} vendorId={vendor.id} />
    </main>
  );
}
