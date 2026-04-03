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

  // 1. Busca TODOS os convites deste vendor
  const { data: rawInvitations } = await supabase
    .from('event_vendor_invitations')
    .select('*')
    .eq('vendor_id', vendor.id)
    .order('invited_at', { ascending: false });

  // 2. Busca eventos e enriquece (query separada para não depender do join do PostgREST)
  const invitations = rawInvitations ?? [];
  const eventIds = [...new Set(invitations.map((i: any) => i.event_id).filter(Boolean))];

  let enrichedInvitations: any[] = invitations;
  if (eventIds.length > 0) {
    const { data: events } = await supabase
      .from('events')
      .select('id, name, location, start_date, end_date, start_time, end_time, layout_url, rules, address, organization_id')
      .in('id', eventIds);

    if (events && events.length > 0) {
      const orgIds = [...new Set(events.map((e: any) => e.organization_id).filter(Boolean))];
      let orgsMap: Record<string, any> = {};
      if (orgIds.length > 0) {
        const { data: orgs } = await supabase.from('organizations').select('id, name').in('id', orgIds);
        if (orgs) for (const org of orgs) orgsMap[org.id] = org;
      }
      const eventsMap: Record<string, any> = {};
      for (const ev of events) eventsMap[ev.id] = { ...ev, organizations: orgsMap[ev.organization_id] || null };
      enrichedInvitations = invitations.map((inv: any) => ({ ...inv, events: eventsMap[inv.event_id] || null }));
    }
  }

  // 3. Busca evento ativo e barraca
  const [{ data: activeEvent }, { data: booth }] = await Promise.all([
    vendor.event_id
      ? supabase.from('events').select('*, organizations(name), start_date, end_date, start_time, end_time, address').eq('id', vendor.event_id).single()
      : Promise.resolve({ data: null }),
    supabase.from('event_booths').select('*').eq('vendor_id', vendor.id).maybeSingle()
  ]);

  return (
    <div className="py-4">
      <VendorEventClient
        vendorId={vendor.id}
        activeEvent={activeEvent}
        invitations={enrichedInvitations ?? []}
        booth={booth}
      />
    </div>
  );
}
