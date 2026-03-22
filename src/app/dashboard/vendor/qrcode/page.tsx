// Página de geração de QR Code para a barraca

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import QrCodeDisplay from '@/components/dashboard/QrCodeDisplay';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function QrCodePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: vendor } = await supabase
    .from('vendors')
    .select('id, name')
    .eq('owner_id', user.id)
    .single();

  if (!vendor) redirect('/dashboard/vendor');

  const menuUrl = `${process.env.NEXT_PUBLIC_APP_URL}/menu/${vendor.id}`;

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard/vendor" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-bold text-gray-900">QR Code</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8">
        <QrCodeDisplay vendorName={vendor.name} menuUrl={menuUrl} />
      </div>
    </main>
  );
}
