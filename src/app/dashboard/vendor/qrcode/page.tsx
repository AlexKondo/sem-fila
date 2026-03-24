import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import QrCodeDisplay from '@/components/dashboard/QrCodeDisplay';
import Link from 'next/link';
import { headers } from 'next/headers';

export default async function QrCodePage() {
  const headerList = await headers();
  const host = headerList.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('cnpj, name')
    .eq('id', user.id)
    .single();

  const { data: vendor } = await supabase
    .from('vendors')
    .select('id, name')
    .eq('owner_id', user.id)
    .single();

  if (!vendor) redirect('/dashboard/vendor');

  const menuUrl = `${protocol}://${host}/menu/${vendor.id}`;

  const cnpjFormatted = profile?.cnpj
    ? profile.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
    : null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8f6f6' }}>
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard/vendor" className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="font-bold text-slate-900 text-sm">Meu QR Code</h1>
            <p className="text-[11px] text-slate-400">{vendor.name}</p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        <QrCodeDisplay vendorName={vendor.name} menuUrl={menuUrl} cnpj={cnpjFormatted} />
      </div>
    </div>
  );
}
