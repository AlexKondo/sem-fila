// Forçado: mudando arquivo para garantir visibilidade no git
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolveVendor } from '@/lib/vendor-resolver';
import VendorEventClient from '@/components/dashboard/VendorEventClient';

export const dynamic = 'force-dynamic';

export default async function VendorEventPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { vendor } = await resolveVendor(supabase, user.id, { select: 'id, name, event_id' });
  if (!vendor) redirect('/dashboard/vendor');

  // Busca o email por várias fontes para garantir que o convite seja encontrado
  const { data: profile } = await supabase.from('profiles').select('email').eq('id', user.id).single();
  const profileEmail = profile?.email;
  const authEmail = user.email;

  // Busca o evento atual do vendor, convites pendentes e atribuição de barraca
  const orConditions = [`vendor_id.eq.${vendor.id}`];
  if (authEmail) orConditions.push(`vendor_email.eq.${authEmail}`);
  if (profileEmail) orConditions.push(`vendor_email.eq.${profileEmail}`);

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
      .select('*, events(name, location, start_date, start_time, organization_id, organizations(name), layout_url, rules, address)')
      .or(orConditions.join(','))
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
