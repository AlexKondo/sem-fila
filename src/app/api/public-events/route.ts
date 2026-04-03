import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createAdminClient();

  const { data: invites } = await supabase
    .from('event_vendor_invitations')
    .select('event_id, vendor_id')
    .in('status', ['confirmed', 'accepted', 'paid'])
    .not('vendor_id', 'is', null);

  if (!invites?.length) return NextResponse.json([]);

  const eventIds = [...new Set(invites.map((i: any) => i.event_id).filter(Boolean))];
  const vendorIds = [...new Set(invites.map((i: any) => i.vendor_id).filter(Boolean))];

  const [{ data: events }, { data: vendors }] = await Promise.all([
    supabase
      .from('events')
      .select('id, name, location, start_date, end_date')
      .in('id', eventIds)
      .order('start_date', { ascending: true }),
    supabase
      .from('vendors')
      .select('id, name')
      .in('id', vendorIds),
  ]);

  const vendorsMap: Record<string, string> = {};
  for (const v of (vendors ?? [])) vendorsMap[v.id] = v.name;

  const vendorsByEvent: Record<string, { id: string; name: string }[]> = {};
  for (const inv of invites) {
    if (!inv.vendor_id || !vendorsMap[inv.vendor_id]) continue;
    if (!vendorsByEvent[inv.event_id]) vendorsByEvent[inv.event_id] = [];
    if (!vendorsByEvent[inv.event_id].find((x: any) => x.id === inv.vendor_id)) {
      vendorsByEvent[inv.event_id].push({ id: inv.vendor_id, name: vendorsMap[inv.vendor_id] });
    }
  }

  const result = (events ?? [])
    .map((e: any) => ({ ...e, vendors: vendorsByEvent[e.id] ?? [] }))
    .filter((e: any) => e.vendors.length > 0);

  return NextResponse.json(result);
}
