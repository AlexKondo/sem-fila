import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import EventList from './EventList';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default async function AdminEventsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'platform_admin') redirect('/dashboard/vendor');

  const { data: events } = await supabase
    .from('events')
    .select('*, organizations(name, created_by)')
    .order('created_at', { ascending: false });

  // Busca perfis dos criadores das organizações
  const creatorIds = [...new Set(
    (events || [])
      .map((e: any) => e.organizations?.created_by)
      .filter(Boolean)
  )];

  let creatorsMap: Record<string, any> = {};
  if (creatorIds.length > 0) {
    const { data: creators } = await supabase
      .from('profiles')
      .select('id, name, full_name, phone, role')
      .in('id', creatorIds);
    if (creators) {
      for (const c of creators) {
        creatorsMap[c.id] = c;
      }
    }
  }

  // Busca emails dos criadores via auth (usando o email do user se disponível)
  // Como não temos acesso direto ao auth.users, vamos buscar o email da tabela profiles
  // Se não tiver, usamos o que tiver disponível

  // Enriquecer eventos com dados do criador
  const enrichedEvents = (events || []).map((event: any) => {
    const creatorId = event.organizations?.created_by;
    const creator = creatorId ? creatorsMap[creatorId] : null;
    return {
      ...event,
      creator: creator ? {
        name: creator.full_name || creator.name || 'Sem nome',
        phone: creator.phone || null,
        role: creator.role || null,
      } : null,
    };
  });

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors duration-300">
      <header className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard/admin" className="p-2 text-gray-400 hover:text-gray-900 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div className="flex-1">
            <h1 className="font-bold text-gray-900 dark:text-white leading-none">Eventos</h1>
            <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase font-bold tracking-tighter">Todos os eventos da plataforma</p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <EventList events={enrichedEvents} />
      </div>
    </main>
  );
}
