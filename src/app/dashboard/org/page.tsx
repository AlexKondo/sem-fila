import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Calendar, Users, MapPin, DollarSign, Plus, ChevronRight } from 'lucide-react';
import LogoutButton from '@/components/ui/LogoutButton';
import ThemeToggle from '@/components/ui/ThemeToggle';
import EditOrgName from './EditOrgName';

export default async function OrgDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Busca organização do usuário
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, organizations(id, name)')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  const org = (membership?.organizations as any);

  // Se não tem org, pode ter sido criada via created_by
  let orgId = org?.id;
  let orgName = org?.name;

  if (!orgId) {
    const { data: ownedOrg } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('created_by', user.id)
      .limit(1)
      .single();
    orgId = ownedOrg?.id;
    orgName = ownedOrg?.name;
  }

  // Busca eventos da organização
  const { data: events } = orgId
    ? await supabase
        .from('events')
        .select('id, name, location, start_date, end_date, active')
        .eq('organization_id', orgId)
        .order('start_date', { ascending: false })
    : { data: [] };

  const activeEvents = events?.filter(e => e.active) ?? [];
  const totalEvents = events?.length ?? 0;

  // Conta convites enviados
  const eventIds = events?.map(e => e.id) ?? [];
  let totalInvites = 0;
  let paidInvites = 0;
  if (eventIds.length > 0) {
    const { count: invCount } = await supabase
      .from('event_vendor_invitations')
      .select('*', { count: 'exact', head: true })
      .in('event_id', eventIds);
    totalInvites = invCount ?? 0;

    const { count: paidCount } = await supabase
      .from('event_vendor_invitations')
      .select('*', { count: 'exact', head: true })
      .in('event_id', eventIds)
      .eq('status', 'paid');
    paidInvites = paidCount ?? 0;
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <EditOrgName orgId={orgId} currentName={orgName ?? 'Minha Organização'} />
            <p className="text-xs text-gray-400 dark:text-slate-500">Painel do Organizador</p>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Cards de resumo */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-purple-500" />
              <p className="text-xs text-gray-500 dark:text-slate-400">Eventos</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalEvents}</p>
            <p className="text-xs text-green-600 dark:text-green-500">{activeEvents.length} ativo{activeEvents.length !== 1 ? 's' : ''}</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-blue-500" />
              <p className="text-xs text-gray-500 dark:text-slate-400">Convites</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalInvites}</p>
            <p className="text-xs text-green-600 dark:text-green-500">{paidInvites} confirmado{paidInvites !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Ações rápidas */}
        <div className="space-y-2">
          <Link
            href="/dashboard/org/events"
            className="flex items-center justify-between bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-4 shadow-sm hover:shadow-md transition group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">Meus Eventos</p>
                <p className="text-xs text-gray-400 dark:text-slate-500">Criar, editar e gerenciar eventos</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-purple-500 transition" />
          </Link>
        </div>

        {/* Lista de eventos recentes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 dark:text-white">Eventos recentes</h2>
            <Link href="/dashboard/org/events" className="text-xs text-purple-600 dark:text-purple-400 font-semibold">Ver todos →</Link>
          </div>

          {(!events || events.length === 0) ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center shadow-sm border border-gray-100 dark:border-slate-700">
              <Calendar className="w-10 h-10 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-slate-400 text-sm font-medium">Nenhum evento criado ainda</p>
              <Link
                href="/dashboard/org/events"
                className="inline-flex items-center gap-1 mt-3 text-sm font-semibold text-purple-600 dark:text-purple-400"
              >
                <Plus className="w-4 h-4" /> Criar primeiro evento
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {events.slice(0, 5).map((event) => (
                <Link
                  key={event.id}
                  href={`/dashboard/org/events/${event.id}`}
                  className="flex items-center justify-between bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-4 shadow-sm hover:shadow-md transition"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{event.name}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors ${
                        event.active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400'
                      }`}>
                        {event.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    {event.location && (
                      <p className="text-xs text-gray-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {event.location}
                      </p>
                    )}
                    {event.start_date && (
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                        {new Date(event.start_date).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
