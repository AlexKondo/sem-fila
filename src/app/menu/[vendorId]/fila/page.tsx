// Página pública de fila de espera — acessada via QR Code. Não exige login.
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import QueueClient from '@/components/menu/QueueClient';

interface Props {
  params: Promise<{ vendorId: string }>;
}

export default async function QueuePage({ params }: Props) {
  const { vendorId } = await params;
  const supabase = await createClient();

  // Busca vendor
  const { data: vendor } = await supabase
    .from('vendors')
    .select('id, name, logo_url, business_type')
    .eq('id', vendorId)
    .eq('active', true)
    .single();

  if (!vendor) notFound();

  // Fila só existe para restaurante/bar
  if (!['restaurant', 'bar'].includes(vendor.business_type || '')) {
    const { redirect } = await import('next/navigation');
    redirect(`/menu/${vendorId}`);
  }

  // Busca dados iniciais da fila e mesas
  const [
    { data: tables },
    { data: queue },
  ] = await Promise.all([
    supabase
      .from('vendor_tables')
      .select('id, table_number, capacity, status')
      .eq('vendor_id', vendor.id)
      .order('table_number'),
    supabase
      .from('queue_entries')
      .select('id, customer_name, party_size, status, position, created_at')
      .eq('vendor_id', vendor.id)
      .in('status', ['waiting', 'called'])
      .order('position', { ascending: true }),
  ]);

  const totalTables = tables?.length ?? 0;
  const freeTables = tables?.filter(t => t.status === 'free').length ?? 0;
  const waitingCount = queue?.filter(q => q.status === 'waiting').length ?? 0;

  return (
    <QueueClient
      vendorId={vendor.id}
      vendorName={vendor.name}
      vendorLogo={vendor.logo_url}
      totalTables={totalTables}
      freeTables={freeTables}
      waitingCount={waitingCount}
      queueEntries={queue ?? []}
    />
  );
}
