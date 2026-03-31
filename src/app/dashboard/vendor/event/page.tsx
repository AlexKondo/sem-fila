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

  const { data: profile } = await supabase.from('profiles').select('email').eq('id', user.id).single();
  const profileEmail = profile?.email;
  const authEmail = user.email;

  const orConditions = [`vendor_id.eq.${vendor.id}`];
  if (authEmail) orConditions.push(`vendor_email.eq.${authEmail}`);
  if (profileEmail) orConditions.push(`vendor_email.eq.${profileEmail}`);

  // 1. Busca convites SEM join (evita falha por RLS na tabela events)
  const { data: rawInvitations } = await supabase
    .from('event_vendor_invitations')
    .select('*')
    .or(orConditions.join(','))
    .eq('status', 'pending')
    .order('invited_at', { ascending: false });

  // 2. Busca dados dos eventos separadamente (sem depender de RLS do vendor)
  const eventIds = [...new Set((rawInvitations ?? []).map(i => i.event_id).filter(Boolean))];

  let eventsMap: Record<string, any> = {};
  if (eventIds.length > 0) {
    const { data: events } = await supabase
      .from('events')
      .select('id, name, location, start_date, start_time, organization_id, layout_url, rules, address')
      .in('id', eventIds);

    if (events) {
      const orgIds = [...new Set(events.map(e => e.organization_id).filter(Boolean))];
      let orgsMap: Record<string, any> = {};

      if (orgIds.length > 0) {
        const { data: orgs } = await supabase
          .from('organizations')
          .select('id, name')
          .in('id', orgIds);
        if (orgs) {
          for (const org of orgs) orgsMap[org.id] = org;
        }
      }

      for (const ev of events) {
        eventsMap[ev.id] = {
          ...ev,
          organizations: orgsMap[ev.organization_id] || null,
        };
      }
    }
  }

  // 3. Monta os convites com dados do evento embutidos
  const invitations = (rawInvitations ?? []).map(inv => ({
    ...inv,
    events: eventsMap[inv.event_id] || null,
  }));

  // 4. Busca evento ativo e barraca
  const [
    { data: activeEvent },
    { data: booth }
  ] = await Promise.all([
    vendor.event_id
      ? supabase.from('events').select('*, organizations(name)').eq('id', vendor.event_id).single()
      : Promise.resolve({ data: null }),
    supabase.from('event_booths').select('*').eq('vendor_id', vendor.id).maybeSingle()
  ]);

  return (
    <div className="py-4">
      <VendorEventClient
        vendorId={vendor.id}
        activeEvent={activeEvent}
        invitations={invitations}
        booth={booth}
      />
    </div>
  );
}
