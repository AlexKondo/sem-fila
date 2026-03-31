'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Mail, Calendar, MapPin, FileText, Layout as LayoutIcon, Check, X, Building } from 'lucide-react';

interface VendorEventClientProps {
  vendorId: string;
  activeEvent: any | null;
  invitations: any[];
  booth: any | null;
}

export default function VendorEventClient({ vendorId, activeEvent, invitations: initialInvites, booth }: VendorEventClientProps) {
  const [invites, setInvites] = useState(initialInvites || []);
  const [actingOn, setActingOn] = useState<string | null>(null);

  // Sincroniza estado quando recebe novas props do servidor
  useEffect(() => {
    setInvites(initialInvites || []);
  }, [initialInvites]);

  const handleInvite = useCallback(async (inviteId: string, status: 'accepted' | 'rejected') => {
    setActingOn(inviteId);
    const supabase = createClient();
    
    // Se aceitar, precisamos atualizar o vendor_id (se ainda não tiver) e vincular o vendor ao evento
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
      // Vincula o vendor ao evento
      const { error: updateVendorError } = await supabase
        .from('vendors')
        .update({ event_id: invite.event_id })
        .eq('id', vendorId);

      if (updateVendorError) {
        alert(`Erro ao vincular evento: ${updateVendorError.message}`);
      } else {
        alert('Convite aceito! Recarregando...');
        window.location.reload();
      }
    } else {
      setInvites(prev => prev.filter(i => i.id !== inviteId));
    }
    setActingOn(null);
  }, [invites, vendorId]);

  return (
    <div className="max-w-2xl mx-auto px-4 pb-12 space-y-6">
      {/* Convites Pendentes */}
      {invites.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Mail className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <h2 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-sm">Convites para Eventos</h2>
          </div>
          <div className="grid gap-3">
            {invites.map(invite => (
              <div key={invite.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-orange-100 dark:border-orange-950/30 shadow-sm p-5 space-y-4 transition-all hover:shadow-md">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">{invite.events?.name || 'Evento'}</h3>
                    {invite.events?.organizations?.name && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                        <Building className="w-3 h-3" /> Organizado por {invite.events.organizations.name}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Taxa de Participação</p>
                    <p className="text-lg font-black text-slate-900 dark:text-white">R$ {Number(invite.fee_amount).toFixed(2)}</p>
                  </div>
                </div>
                
                {(invite.events?.start_date || invite.events?.location) && (
                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 py-2 border-y border-slate-100 dark:border-slate-800">
                    {invite.events?.start_date && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(invite.events.start_date).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                    {invite.events?.location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        {invite.events.location}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => handleInvite(invite.id, 'accepted')}
                    disabled={actingOn === invite.id}
                    className="flex-1 bg-orange-500 text-white font-bold py-3 rounded-2xl shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" /> ACEITAR
                  </button>
                  <button
                    onClick={() => handleInvite(invite.id, 'rejected')}
                    disabled={actingOn === invite.id}
                    className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold py-3 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <X className="w-4 h-4" /> RECUSAR
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Evento Ativo */}
      {activeEvent && (
        <section className="space-y-6">
          <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <LayoutIcon className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">Seu Evento Atual</span>
              <h1 className="text-3xl font-black mt-3 leading-tight">{activeEvent.name}</h1>
              <p className="text-purple-100 flex items-center gap-2 mt-1 font-medium">
                <Building className="w-4 h-4" /> {activeEvent.organizations?.name}
              </p>
              
              <div className="grid grid-cols-2 gap-4 mt-8">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-purple-200 opacity-60 mb-1">Localização</p>
                  <p className="text-sm font-bold flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5" /> {activeEvent.location || 'Não definido'}
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-purple-200 opacity-60 mb-1">Início</p>
                  <p className="text-sm font-bold flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" /> 
                    {activeEvent.start_date ? new Date(activeEvent.start_date).toLocaleDateString('pt-BR') : 'A definir'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 flex items-center justify-between transition-colors shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <LayoutIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sua Localização</p>
                  <p className="text-xl font-black text-slate-900 dark:text-white">
                    {booth ? `Barraca ${booth.label}` : 'A definir pelo organizador'}
                  </p>
                </div>
              </div>
              {activeEvent.layout_url && (
                <a 
                  href={activeEvent.layout_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                >
                  Ver Mapa <LayoutIcon className="w-4 h-4 inline-block ml-1" />
                </a>
              )}
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-8 transition-colors shadow-sm space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <h2 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-sm">Regras e Orientações</h2>
              </div>
              
              <div className="prose dark:prose-invert max-w-none">
                {activeEvent.rules ? (
                  <div className="text-slate-600 dark:text-slate-400 text-sm whitespace-pre-wrap leading-relaxed">
                    {activeEvent.rules}
                  </div>
                ) : (
                  <p className="text-slate-400 dark:text-slate-500 italic text-sm">
                    Nenhuma regra ou orientação adicional foi definida pelo organizador ainda.
                  </p>
                )}
              </div>
            </div>
            
            {activeEvent.address && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 transition-colors shadow-sm">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Endereço do Evento</p>
                 <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">{activeEvent.address}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Caso não tenha evento nem convites */}
      {!activeEvent && invites.length === 0 && (
        <div className="text-center py-20 bg-slate-50/50 dark:bg-slate-900/30 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
          <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Nenhum evento ativo</h2>
          <p className="text-slate-400 dark:text-slate-500 max-w-xs mx-auto mt-2 text-sm px-4">
            Você não está participando de nenhum evento no momento e não possui convites pendentes.
          </p>
        </div>
      )}

      {/* Caso tenha convites mas nenhum evento ativo */}
      {!activeEvent && invites.length > 0 && (
        <div className="text-center py-10 bg-slate-50/30 dark:bg-slate-900/10 rounded-[2.5rem] border border-orange-100 dark:border-orange-900/20">
          <p className="text-sm text-slate-500 dark:text-slate-400 px-4">
            Você possui <b>{invites.length} convite{invites.length !== 1 ? 's' : ''}</b> pendente{invites.length !== 1 ? 's' : ''}. <br/> 
            Responda acima para ter acesso aos detalhes e ao mapa do evento.
          </p>
        </div>
      )}
    </div>
  );
}
