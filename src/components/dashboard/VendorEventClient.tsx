'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Mail, Calendar, MapPin, FileText, Layout as LayoutIcon, Check, X, Building, ChevronRight, ArrowLeft, DollarSign } from 'lucide-react';

interface VendorEventClientProps {
  vendorId: string;
  activeEvent: any | null;
  invitations: any[];
  booth: any | null;
}

type View = 'list' | 'invite-detail' | 'event-detail';

export default function VendorEventClient({ vendorId, activeEvent, invitations: initialInvites, booth }: VendorEventClientProps) {
  const router = useRouter();
  const [invites, setInvites] = useState(initialInvites || []);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [view, setView] = useState<View>('list');
  const [selectedInvite, setSelectedInvite] = useState<any | null>(null);

  useEffect(() => {
    setInvites(initialInvites || []);
  }, [initialInvites]);

  const handleInvite = useCallback(async (inviteId: string, status: 'accepted' | 'rejected') => {
    setActingOn(inviteId);
    const supabase = createClient();

    const invite = invites.find(i => i.id === inviteId);
    if (!invite) return;

    const { error: updateInviteError } = await supabase
      .from('event_vendor_invitations')
      .update({
        status,
        responded_at: new Date().toISOString()
      })
      .eq('id', inviteId);

    if (updateInviteError) {
      alert(`Erro: ${updateInviteError.message}`);
      setActingOn(null);
      return;
    }

    if (status === 'accepted') {
      const { error: updateVendorError } = await supabase
        .from('vendors')
        .update({ event_id: invite.event_id })
        .eq('id', vendorId);

      if (updateVendorError) {
        alert(`Erro ao vincular evento: ${updateVendorError.message}`);
      } else {
        setSelectedInvite(null);
        setView('list');
        setInvites(prev => prev.filter(i => i.id !== inviteId));
        router.refresh();
      }
    } else {
      setSelectedInvite(null);
      setView('list');
      setInvites(prev => prev.filter(i => i.id !== inviteId));
    }
    setActingOn(null);
  }, [invites, vendorId, router]);

  const backButton = (
    <button
      onClick={() => { setView('list'); setSelectedInvite(null); }}
      className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors py-2"
    >
      <ArrowLeft className="w-4 h-4" /> Voltar
    </button>
  );

  // ── Detalhe do convite ──
  if (view === 'invite-detail' && selectedInvite) {
    const ev = selectedInvite.events;
    return (
      <div className="max-w-2xl mx-auto px-4 pb-12 space-y-4">
        {backButton}

        <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <Mail className="w-24 h-24" />
          </div>
          <div className="relative z-10">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-white/20 px-3 py-1 rounded-full">Convite para Evento</span>
            <h1 className="text-2xl font-black mt-3 leading-tight">{ev?.name || 'Evento'}</h1>
            {ev?.organizations?.name && (
              <p className="text-orange-100 flex items-center gap-2 mt-1 font-medium text-sm">
                <Building className="w-4 h-4" /> {ev.organizations.name}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-3">
          {(ev?.start_date || ev?.location) && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 grid grid-cols-2 gap-3 shadow-sm transition-colors">
              {ev?.start_date && (
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Data</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-orange-500" />
                    {new Date(ev.start_date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}
              {ev?.location && (
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Local</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-orange-500" />
                    {ev.location}
                  </p>
                </div>
              )}
            </div>
          )}

          {ev?.address && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm transition-colors">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Endereço</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">{ev.address}</p>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm transition-colors">
            <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Taxa de Participação</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <DollarSign className="w-5 h-5 text-orange-500" />
              R$ {Number(selectedInvite.fee_amount).toFixed(2)}
            </p>
          </div>

          {ev?.rules && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm transition-colors space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-500" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Regras e Orientações</p>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">{ev.rules}</p>
            </div>
          )}

          {ev?.layout_url && (
            <a
              href={ev.layout_url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm transition-colors flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <div className="flex items-center gap-3">
                <LayoutIcon className="w-5 h-5 text-orange-500" />
                <span className="text-sm font-bold text-slate-900 dark:text-white">Ver Mapa / Layout do Evento</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </a>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => handleInvite(selectedInvite.id, 'accepted')}
            disabled={actingOn === selectedInvite.id}
            className="flex-1 bg-orange-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition flex items-center justify-center gap-2 disabled:opacity-50 text-base"
          >
            <Check className="w-5 h-5" /> ACEITAR CONVITE
          </button>
          <button
            onClick={() => handleInvite(selectedInvite.id, 'rejected')}
            disabled={actingOn === selectedInvite.id}
            className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold py-4 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center justify-center gap-2 disabled:opacity-50 text-base"
          >
            <X className="w-5 h-5" /> RECUSAR
          </button>
        </div>
      </div>
    );
  }

  // ── Detalhe do evento ativo ──
  if (view === 'event-detail' && activeEvent) {
    return (
      <div className="max-w-2xl mx-auto px-4 pb-12 space-y-4">
        {backButton}

        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <LayoutIcon className="w-24 h-24" />
          </div>
          <div className="relative z-10">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-white/20 px-3 py-1 rounded-full">Seu Evento</span>
            <h1 className="text-2xl font-black mt-3 leading-tight">{activeEvent.name}</h1>
            {activeEvent.organizations?.name && (
              <p className="text-purple-100 flex items-center gap-2 mt-1 font-medium text-sm">
                <Building className="w-4 h-4" /> {activeEvent.organizations.name}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-3">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 grid grid-cols-2 gap-3 shadow-sm transition-colors">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Local</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-purple-500" />
                {activeEvent.location || 'Não definido'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Início</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-500" />
                {activeEvent.start_date ? new Date(activeEvent.start_date).toLocaleDateString('pt-BR') : 'A definir'}
              </p>
            </div>
          </div>

          {activeEvent.address && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm transition-colors">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Endereço</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">{activeEvent.address}</p>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm transition-colors flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <LayoutIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sua Barraca</p>
              <p className="text-lg font-black text-slate-900 dark:text-white">
                {booth ? `Barraca ${booth.label}` : 'A definir pelo organizador'}
              </p>
            </div>
          </div>

          {activeEvent.layout_url && (
            <a
              href={activeEvent.layout_url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm transition-colors flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <div className="flex items-center gap-3">
                <LayoutIcon className="w-5 h-5 text-purple-500" />
                <span className="text-sm font-bold text-slate-900 dark:text-white">Ver Mapa / Layout do Evento</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </a>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm transition-colors space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-500" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Regras e Orientações</p>
            </div>
            {activeEvent.rules ? (
              <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">{activeEvent.rules}</p>
            ) : (
              <p className="text-slate-400 dark:text-slate-500 italic text-sm">Nenhuma regra definida pelo organizador ainda.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Tela principal (lista limpa) ──
  return (
    <div className="max-w-2xl mx-auto px-4 pb-12 space-y-6">
      {/* Convites Pendentes */}
      {invites.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Mail className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <h2 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-sm">Convites</h2>
          </div>
          <div className="grid gap-3">
            {invites.map(invite => (
              <button
                key={invite.id}
                onClick={() => { setSelectedInvite(invite); setView('invite-detail'); }}
                className="w-full text-left bg-white dark:bg-slate-900 rounded-2xl border border-orange-100 dark:border-orange-950/30 shadow-sm p-4 transition-all hover:shadow-md hover:border-orange-300 dark:hover:border-orange-800 active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-900 dark:text-white truncate">{invite.events?.name || 'Evento'}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 dark:text-slate-500">
                      {invite.events?.organizations?.name && (
                        <span className="flex items-center gap-1">
                          <Building className="w-3 h-3" /> {invite.events.organizations.name}
                        </span>
                      )}
                      {invite.events?.start_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {new Date(invite.events.start_date).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    <p className="text-xs font-black text-orange-600">R$ {Number(invite.fee_amount).toFixed(2)}</p>
                    <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Evento Ativo - apenas card clicável */}
      {activeEvent && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-sm">Meu Evento</h2>
          </div>
          <button
            onClick={() => setView('event-detail')}
            className="w-full text-left bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg transition-all hover:shadow-xl active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-lg">{activeEvent.name}</h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-purple-200">
                  {activeEvent.organizations?.name && (
                    <span className="flex items-center gap-1">
                      <Building className="w-3 h-3" /> {activeEvent.organizations.name}
                    </span>
                  )}
                  {activeEvent.start_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {new Date(activeEvent.start_date).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                  {activeEvent.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {activeEvent.location}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-purple-200 ml-3" />
            </div>
          </button>
        </section>
      )}

      {/* Vazio */}
      {!activeEvent && invites.length === 0 && (
        <div className="text-center py-20 bg-slate-50/50 dark:bg-slate-900/30 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
          <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Nenhum evento ativo</h2>
          <p className="text-slate-400 dark:text-slate-500 max-w-xs mx-auto mt-2 text-sm px-4">
            Você não está participando de nenhum evento no momento e não possui convites pendentes.
          </p>
        </div>
      )}
    </div>
  );
}
