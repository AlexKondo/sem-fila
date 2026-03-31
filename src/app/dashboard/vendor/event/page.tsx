import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolveVendor } from '@/lib/vendor-resolver';
import VendorEventClient from '@/components/dashboard/VendorEventClient';

export default async function VendorEventPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { vendor } = await resolveVendor(supabase, user.id, { select: 'id, name, event_id' });
  if (!vendor) redirect('/dashboard/vendor');

  // Busca o email do perfil para capturar convites enviados apenas por email
  const { data: profile } = await supabase.from('profiles').select('email').eq('id', user.id).single();
  const userEmail = profile?.email;

  // Busca o evento atual do vendor, convites pendentes e atribuição de barraca
  const [
    { data: activeEvent },
    { data: invitations },
    { data: booth }
  ] = await Promise.all([
    vendor.event_id 
      ? supabase.from('events').select('*, organizations(name)').eq('id', vendor.event_id).single()
      : Promise.resolve({ data: null }),
    supabase
      .from('event_vendor_invitations')
      .select('*, events(name, location, start_date, start_time, organization_id, organizations(name))')
      .or(`vendor_id.eq.${vendor.id}${userEmail ? `,vendor_email.eq.${userEmail}` : ''}`)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    supabase.from('event_booths').select('*').eq('vendor_id', vendor.id).maybeSingle()
  ]);

  return (
    <div className="py-4">
      <VendorEventClient 
        vendorId={vendor.id}
        activeEvent={activeEvent}
        invitations={invitations ?? []}
        booth={booth}
      />
    </div>
  );
}
