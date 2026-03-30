import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

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
    .select('*, organizations(name)')
    .order('created_at', { ascending: false });

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard/admin" className="p-2 text-gray-400 hover:text-gray-900 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="font-bold text-gray-900 leading-none">Eventos</h1>
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Todos os eventos da plataforma</p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {!events || events.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <p className="text-gray-400 text-sm">Nenhum evento cadastrado.</p>
          </div>
        ) : (
          events.map((event: any) => (
            <div key={event.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-gray-900">{event.name}</h3>
                  <p className="text-xs text-gray-400">
                    {(event as any).organizations?.name || 'Sem organização'}
                    {event.location ? ` — ${event.location}` : ''}
                  </p>
                  {event.start_date && (
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(event.start_date.includes('T') ? event.start_date : `${event.start_date}T12:00:00`).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                      {event.end_date ? ` a ${new Date(event.end_date.includes('T') ? event.end_date : `${event.end_date}T12:00:00`).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}` : ''}
                      {event.start_time ? ` • ${event.start_time.slice(0, 5)}` : ''}
                      {event.end_time ? ` - ${event.end_time.slice(0, 5)}` : ''}
                    </p>
                  )}
                  {event.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{event.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${event.active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                    {event.active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
