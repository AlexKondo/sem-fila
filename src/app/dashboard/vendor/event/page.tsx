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

  // 1. Busca convites pendentes DESTE vendor específico
  //    - Por vendor_id (convite vinculado direto)
  //    - Ou por email sem vendor_id (convite genérico por email)
  const { data: profile } = await supabase.from('profiles').select('email').eq('id', user.id).single();
  const emails = [...new Set([user.email, profile?.email].filter(Boolean))];

  const conditions = [`vendor_id.eq.${vendor.id}`];
  for (const email of emails) {
    conditions.push(`and(vendor_email.eq.${email},vendor_id.is.null)`);
  }

  const { data: rawInvitations } = await supabase
    .from('event_vendor_invitations')
    .select('*')
    .or(conditions.join(','))
    .eq('status', 'pending')
    .order('invited_at', { ascending: false });

  // 2. Enriquece convites com dados do evento (queries separadas por causa de RLS)
  const invitations = rawInvitations ?? [];
  const eventIds = [...new Set(invitations.map(i => i.event_id).filter(Boolean))];

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
        const { data: orgs } = await supabase.from('organizations').select('id, name').in('id', orgIds);
        if (orgs) for (const org of orgs) orgsMap[org.id] = org;
      }
      for (const ev of events) {
        eventsMap[ev.id] = { ...ev, organizations: orgsMap[ev.organization_id] || null };
      }
    }
  }

  const enrichedInvitations = invitations.map(inv => ({
    ...inv,
    events: eventsMap[inv.event_id] || null,
  }));

  // 3. Busca evento ativo e barraca
  const [{ data: activeEvent }, { data: booth }] = await Promise.all([
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
        invitations={enrichedInvitations}
        booth={booth}
      />
    </div>
  );
}
