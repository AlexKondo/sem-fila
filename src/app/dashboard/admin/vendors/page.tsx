import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import VendorAdminManager from '@/components/admin/VendorAdminManager';

export default async function AdminVendorsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'platform_admin') redirect('/dashboard/vendor');

  // Busca todos os eventos (para o select ao criar barraca)
  const { data: events } = await supabase
    .from('events')
    .select('id, name, organizations(name)')
    .eq('active', true)
    .order('created_at', { ascending: false });

  // Busca todos os vendors com dono e evento
  const { data: vendors, error: vendorsError } = await supabase
    .from('vendors')
    .select(`
      id, name, description, active, avg_prep_time, payment_mode, created_at,
      events (id, name),
      profiles (id, name, phone)
    `)
    .order('created_at', { ascending: false });

  if (vendorsError) {
    console.error('VENDORS_QUERY_ERROR:', vendorsError);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard/admin" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-bold text-gray-900">Barracas / Lojas</h1>
        </div>
      </header>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <VendorAdminManager initialVendors={(vendors ?? []) as any} events={(events ?? []) as any} />
    </main>
  );
}
