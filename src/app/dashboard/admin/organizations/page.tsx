import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ArrowLeft, Plus, CalendarDays } from 'lucide-react';
import OrgManager from '@/components/admin/OrgManager';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default async function AdminOrgsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'platform_admin') redirect('/dashboard/vendor');

  const { data: orgs } = await supabase
    .from('organizations')
    .select(`
      *,
      events (id, name, location, start_date, end_date, active,
        vendors (id, name, active)
      )
    `)
    .order('created_at', { ascending: false });

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors duration-300">
      <header className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard/admin" className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="font-bold text-gray-900 dark:text-white">Organizações & Eventos</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <OrgManager initialOrgs={orgs ?? []} />
    </main>
  );
}
