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

  // Busca convites com join direto nos dados do evento e organização
  const { data: enrichedInvitations } = await supabase
    .from('event_vendor_invitations')
    .select('*, events(id, name, location, start_date, end_date, start_time, end_time, layout_url, rules, address, organizations(name))')
    .eq('vendor_id', vendor.id)
    .order('invited_at', { ascending: false });

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
