'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { StaffSchedule, StaffInvite } from '@/types/database';

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const ALL_PERMISSIONS = [
  { key: 'view_orders',    label: 'Ver Pedidos' },
  { key: 'manage_menu',    label: 'Gerenciar Cardápio' },
  { key: 'call_waiter',    label: 'Atender Chamados' },
  { key: 'deliver_orders', label: 'Entregar Pedidos' },
];

type StaffWithProfile = StaffSchedule & {
  profiles: { full_name: string | null; name: string | null; role: string } | null;
};

export default function StaffPage() {
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffWithProfile[]>([]);
  const [invites, setInvites] = useState<StaffInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'waitstaff' | 'deliverer'>('waitstaff');
  const [sending, setSending] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [editDays, setEditDays] = useState<number[]>([]);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: vendorData } = await supabase
        .from('vendors')
        .select('id')
        .eq('owner_id', user.id)
        .eq('active', true)
        .limit(1)
        .single();

      if (!vendorData) { setLoading(false); return; }
      setVendorId(vendorData.id);

      const [{ data: scheduleData }, { data: inviteData }] = await Promise.all([
        supabase
          .from('staff_schedules')
          .select('*, profiles(full_name, name, role)')
          .eq('vendor_id', vendorData.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('staff_invites')
          .select('*')
          .eq('vendor_id', vendorData.id)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      if (scheduleData) setStaff(scheduleData as StaffWithProfile[]);
      if (inviteData) setInvites(inviteData as StaffInvite[]);
      setLoading(false);
    }

    load();
  }, []);

  async function sendInvite() {
    if (!vendorId || !inviteEmail) return;
    setSending(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('staff_invites')
      .insert({ vendor_id: vendorId, email: inviteEmail, role: inviteRole })
      .select()
      .single();
    if (data) setInvites(prev => [data as StaffInvite, ...prev]);
    setInviteEmail('');
    setShowInviteModal(false);
    setSending(false);
  }

  async function savePermissions(scheduleId: string) {
    const supabase = createClient();
    await supabase
      .from('staff_schedules')
      .update({ permissions: editPerms, days_of_week: editDays })
      .eq('id', scheduleId);
    setStaff(prev => prev.map(s => s.id === scheduleId ? { ...s, permissions: editPerms, days_of_week: editDays } : s));
    setEditingId(null);
  }

  async function removeStaff(scheduleId: string) {
    const supabase = createClient();
    await supabase.from('staff_schedules').update({ active: false }).eq('id', scheduleId);
    setStaff(prev => prev.filter(s => s.id !== scheduleId));
  }

  async function revokeInvite(inviteId: string) {
    const supabase = createClient();
    await supabase.from('staff_invites').delete().eq('id', inviteId);
    setInvites(prev => prev.filter(i => i.id !== inviteId));
  }

  if (loading) return (
    <div className="min-h-screen bg-[#f8f6f6] flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
    </div>
  );

  const pendingInvites = invites.filter(i => !i.accepted_at);
  const acceptedInvites = invites.filter(i => i.accepted_at);

  return (
    <main className="min-h-screen bg-[#f8f6f6] pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-900">Gestão de Funcionários</h1>
            <p className="text-sm text-slate-400">{staff.length} funcionário(s) ativo(s)</p>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="bg-orange-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-orange-600 transition shadow-sm"
          >
            + Convidar
          </button>
        </div>

        {/* Active Staff */}
        <section>
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Equipe Atual</h2>
          {staff.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 shadow-sm">
              <p className="text-3xl mb-2">👥</p>
              <p className="text-slate-400 text-sm">Nenhum funcionário ainda.</p>
              <p className="text-slate-300 text-xs mt-1">Convide alguém pelo botão acima.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {staff.map(member => {
                const name = member.profiles?.full_name || member.profiles?.name || 'Funcionário';
                const isEditing = editingId === member.id;
                return (
                  <div key={member.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-4 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center font-black text-base">
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm leading-none mb-1">{name}</p>
                          <span className="text-[10px] font-black text-slate-300 uppercase">
                            {member.profiles?.role === 'deliverer' ? '🛵 Entregador' : '🍽️ Garçom/Atendente'}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (isEditing) { setEditingId(null); return; }
                            setEditingId(member.id);
                            setEditPerms(member.permissions ?? []);
                            setEditDays(member.days_of_week ?? [1, 2, 3, 4, 5]);
                          }}
                          className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-xl hover:bg-orange-100 transition"
                        >
                          {isEditing ? 'Cancelar' : 'Editar'}
                        </button>
                        <button
                          onClick={() => removeStaff(member.id)}
                          className="text-xs font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-xl hover:bg-red-100 transition"
                        >
                          Remover
                        </button>
                      </div>
                    </div>

                    {!isEditing ? (
                      <div className="px-4 pb-4 space-y-2">
                        <div className="flex flex-wrap gap-1.5">
                          {(member.days_of_week ?? []).map(d => (
                            <span key={d} className="text-xs bg-slate-50 border border-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                              {DAYS[d]}
                            </span>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(member.permissions ?? []).map(p => {
                            const perm = ALL_PERMISSIONS.find(x => x.key === p);
                            return (
                              <span key={p} className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-medium">
                                {perm?.label ?? p}
                              </span>
                            );
                          })}
                          {(member.permissions ?? []).length === 0 && (
                            <span className="text-xs text-slate-300">Sem permissões</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="px-4 pb-4 border-t border-slate-50 pt-4 space-y-4">
                        <div>
                          <p className="text-xs font-bold text-slate-500 mb-2">Dias de trabalho</p>
                          <div className="flex flex-wrap gap-2">
                            {DAYS.map((day, idx) => (
                              <button
                                key={idx}
                                onClick={() => setEditDays(prev =>
                                  prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx]
                                )}
                                className={`w-10 h-10 rounded-xl text-xs font-bold transition ${
                                  editDays.includes(idx)
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-slate-50 text-slate-400 border border-slate-100'
                                }`}
                              >
                                {day}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-500 mb-2">Permissões</p>
                          <div className="grid grid-cols-2 gap-2">
                            {ALL_PERMISSIONS.map(perm => (
                              <label key={perm.key} className="flex items-center gap-2 cursor-pointer p-2 rounded-xl hover:bg-slate-50 transition">
                                <input
                                  type="checkbox"
                                  checked={editPerms.includes(perm.key)}
                                  onChange={e => setEditPerms(prev =>
                                    e.target.checked ? [...prev, perm.key] : prev.filter(p => p !== perm.key)
                                  )}
                                  className="w-4 h-4 accent-orange-500"
                                />
                                <span className="text-sm text-slate-700">{perm.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => savePermissions(member.id)}
                          className="w-full bg-orange-500 text-white text-sm font-bold py-2.5 rounded-xl hover:bg-orange-600 transition"
                        >
                          Salvar Alterações
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <section>
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Convites Pendentes</h2>
            <div className="grid gap-3">
              {pendingInvites.map(invite => {
                const expired = new Date(invite.expires_at) < new Date();
                return (
                  <div key={invite.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{invite.email}</p>
                      <p className="text-xs text-slate-400">
                        {invite.role === 'deliverer' ? '🛵 Entregador' : '🍽️ Garçom'}
                        {' · '}
                        {expired
                          ? <span className="text-red-500 font-bold">Expirado</span>
                          : `Expira ${new Date(invite.expires_at).toLocaleDateString('pt-BR')}`
                        }
                      </p>
                    </div>
                    <button
                      onClick={() => revokeInvite(invite.id)}
                      className="text-xs font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-xl hover:bg-red-100 transition"
                    >
                      Revogar
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Accepted Invites */}
        {acceptedInvites.length > 0 && (
          <section>
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Convites Aceitos</h2>
            <div className="grid gap-2">
              {acceptedInvites.map(invite => (
                <div key={invite.id} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center justify-between opacity-60">
                  <div>
                    <p className="text-sm font-bold text-slate-700">{invite.email}</p>
                    <p className="text-xs text-slate-400">
                      Aceito em {invite.accepted_at ? new Date(invite.accepted_at).toLocaleDateString('pt-BR') : '-'}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Aceito</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-t-[32px] p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black text-slate-900">Convidar Funcionário</h2>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 font-bold p-1">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Email do funcionário</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="funcionario@email.com"
                  className="w-full border border-slate-200 rounded-xl px-4 h-12 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Função</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['waitstaff', 'deliverer'] as const).map(role => (
                    <button
                      key={role}
                      onClick={() => setInviteRole(role)}
                      className={`py-3 rounded-xl text-sm font-bold transition border ${
                        inviteRole === role
                          ? 'bg-orange-500 text-white border-orange-500 shadow'
                          : 'bg-white text-slate-500 border-slate-200'
                      }`}
                    >
                      {role === 'deliverer' ? '🛵 Entregador' : '🍽️ Garçom/Atendente'}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-slate-400">
                O funcionário receberá um convite por email com link de acesso válido por 7 dias.
              </p>
              <button
                onClick={sendInvite}
                disabled={sending || !inviteEmail}
                className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl hover:bg-orange-600 transition disabled:opacity-50"
              >
                {sending ? 'Enviando…' : 'Enviar Convite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
