import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import EventHubClient from '@/components/org/EventHubClient';
import EventNameHeader from '@/components/org/EventNameHeader';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default async function OrgEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Busca evento
  const { data: event } = await supabase
    .from('events')
    .select('*, organizations(name)')
    .eq('id', eventId)
    .single();

  if (!event) redirect('/dashboard/org/events');

  // Busca booths
  const { data: booths } = await supabase
    .from('event_booths')
    .select('*, vendors(name)')
    .eq('event_id', eventId)
    .order('label');

  // Busca células estruturais do layout
  const { data: layoutCells } = await supabase
    .from('event_layout_cells')
    .select('*')
    .eq('event_id', eventId);

  // Busca layouts de canvas
  const { data: canvasLayouts } = await supabase
    .from('event_canvas_layouts')
    .select('id, name, canvas_data')
    .eq('event_id', eventId)
    .order('created_at');

  // Busca convites
  const { data: invitations } = await supabase
    .from('event_vendor_invitations')
    .select('*, vendors(name)')
    .eq('event_id', eventId)
    .order('invited_at', { ascending: false });

  // Busca vendors do evento (para receita)
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, name')
    .eq('event_id', eventId);

  // Busca todos os vendors convidáveis (kiosk e food_truck, não restaurant)
  const { data: allVendors } = await supabase
    .from('vendors')
    .select('id, name, owner_id, profiles!vendors_owner_id_fkey(email)')
    .eq('active', true)
    .in('vendor_type', ['kiosk', 'food_truck'])
    .order('name');

  // Receita por vendor
  const vendorRevenue: Record<string, number> = {};
  if (vendors && vendors.length > 0) {
    const vendorIds = vendors.map(v => v.id);
    const { data: orders } = await supabase
      .from('orders')
      .select('vendor_id, total')
      .in('vendor_id', vendorIds)
      .in('status', ['delivered', 'ready']);

    if (orders) {
      for (const o of orders) {
        vendorRevenue[o.vendor_id] = (vendorRevenue[o.vendor_id] || 0) + Number(o.total);
      }
    }
  }

  const revenueData = (vendors ?? []).map(v => ({
    vendorId: v.id,
    vendorName: v.name,
    revenue: vendorRevenue[v.id] || 0,
  }));

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard/org" className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <EventNameHeader
            eventId={event.id}
            initialName={event.name}
            initialLocation={event.location || ''}
          />
          <ThemeToggle />
        </div>
      </header>

      <EventHubClient
        event={event}
        initialBooths={booths ?? []}
        initialInvitations={invitations ?? []}
        initialLayoutCells={layoutCells ?? []}
        initialCanvasLayouts={canvasLayouts ?? []}
        revenueData={revenueData}
        availableVendors={(allVendors ?? []).map(v => ({
          id: v.id,
          name: v.name,
          email: (v.profiles as any)?.email ?? '',
        }))}
      />
    </main>
  );
}
