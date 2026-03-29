import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import QrCodeDisplay from '@/components/dashboard/QrCodeDisplay';
import Link from 'next/link';
import { headers } from 'next/headers';
import { resolveVendor } from '@/lib/vendor-resolver';

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

  const { vendor } = await resolveVendor(supabase, user.id, { select: 'id, name' });

  if (!vendor) redirect('/dashboard/vendor');

  const menuUrl = `${protocol}://${host}/menu/${vendor.id}`;

  const cnpjFormatted = profile?.cnpj
    ? profile.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
    : null;

  return (
    <>
      <div className="max-w-lg mx-auto px-4 py-6">
        <QrCodeDisplay vendorName={vendor.name} menuUrl={menuUrl} cnpj={cnpjFormatted} />
      </div>
    </>
  );
}
