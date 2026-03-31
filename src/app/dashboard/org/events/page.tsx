import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import OrgEventsClient from '@/components/org/OrgEventsClient';

export default async function OrgEventsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Busca org do usuário
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  let orgId = membership?.organization_id;
  if (!orgId) {
    const { data: ownedOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('created_by', user.id)
      .limit(1)
      .single();
    orgId = ownedOrg?.id;
  }

  if (!orgId) redirect('/dashboard/org');

  const { data: events } = await supabase
    .from('events')
    .select('id, name, location, address, description, start_date, end_date, start_time, end_time, active, booth_selection_mode, default_booth_fee')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard/org" className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-bold text-gray-900 dark:text-white">Meus Eventos</h1>
        </div>
      </header>

      <OrgEventsClient initialEvents={events ?? []} orgId={orgId} />
    </main>
  );
}
