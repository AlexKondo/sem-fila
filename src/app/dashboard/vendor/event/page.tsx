import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolveVendor } from '@/lib/vendor-resolver';
import VendorEventClient from '@/components/dashboard/VendorEventClient';

export const dynamic = 'force-dynamic';

export default async function VendorEventPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { vendor, vendors } = await resolveVendor(supabase, user.id, { select: 'id, name, event_id' });
  if (!vendor) redirect('/dashboard/vendor');

  // 1. Busca convites pendentes (por vendor_id OU e-mail do perfil)
  const { data: profile } = await supabase.from('profiles').select('email').eq('id', user.id).single();
  const userEmail = profile?.email;

  // Busca convites APENAS para os vendors que este usuário é dono ou para o seu e-mail
  const allVendorIds = vendors.map(v => v.id);
  
  const query = supabase
    .from('event_vendor_invitations')
    .select('*')
    .eq('status', 'pending');

  const orConditions = [`vendor_id.in.(${allVendorIds.join(',')})`];
  if (userEmail) orConditions.push(`vendor_email.eq.${userEmail}`);
  query.or(orConditions.join(','));

  const { data: rawInvitations } = await query.order('invited_at', { ascending: false });

  // Filtra convites que pertencem especificamente ao vendor ATUAL selecionado
  const currentVendorInvites = rawInvitations?.filter(inv => 
    inv.vendor_id === vendor.id || (inv.vendor_id === null && inv.vendor_email === userEmail)
  ) || [];

  // Verifica se existem convites para OUTRAS marcas do mesmo dono
  const hasInvitesForOtherBrands = (rawInvitations?.length || 0) > currentVendorInvites.length;

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

  // Filtra convites de eventos que o vendor já participa
  const enrichedInvitations = invitations
    .filter(inv => inv.event_id !== vendor.event_id)
    .map(inv => ({
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
        invitations={currentVendorInvites.map(inv => ({
          ...inv,
          events: eventsMap[inv.event_id] || null,
        }))}
        booth={booth}
        hasInvitesForOtherBrands={hasInvitesForOtherBrands}
      />
    </div>
  );
}
