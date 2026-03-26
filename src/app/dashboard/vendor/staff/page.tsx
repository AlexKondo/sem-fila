'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { StaffSchedule } from '@/types/database';

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const ALL_PERMISSIONS = [
  { key: 'view_orders',    label: 'Ver Pedidos' },
  { key: 'manage_menu',    label: 'Gerenciar Cardápio' },
  { key: 'call_waiter',    label: 'Atender Chamados' },
  { key: 'deliver_orders', label: 'Entregar Pedidos' },
];

const ROLE_OPTIONS = [
  { value: 'waitstaff',  label: '🍽️ Garçom / Atendente' },
  { value: 'deliverer',  label: '🛵 Entregador' },
  { value: 'org_admin',  label: '🛡️ Admin (acesso total)' },
];

const DEFAULT_PERMS: Record<string, string[]> = {
  waitstaff:  ['view_orders', 'call_waiter'],
  deliverer:  ['view_orders', 'deliver_orders'],
  org_admin:  ['view_orders', 'manage_menu', 'call_waiter', 'deliver_orders'],
};

type StaffWithProfile = StaffSchedule & {
  profiles: { full_name: string | null; name: string | null; role: string; id: string } | null;
};

export default function StaffPage() {
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'waitstaff' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [editDays, setEditDays] = useState<number[]>([]);
  const [editRole, setEditRole] = useState('waitstaff');

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: vendorData } = await supabase
        .from('vendors').select('id').eq('owner_id', user.id).eq('active', true).limit(1).single();
      if (!vendorData) { setLoading(false); return; }
      setVendorId(vendorData.id);

      const { data } = await supabase
        .from('staff_schedules')
        .select('*, profiles(id, full_name, name, role)')
        .eq('vendor_id', vendorData.id)
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (data) setStaff(data as StaffWithProfile[]);
      setLoading(false);
    }
    load();
  }, []);

  async function createStaff() {
    if (!vendorId || !form.name || !form.email || !form.password) {
      setFormError('Nome, email e senha são obrigatórios.');
      return;
    }
    setSaving(true);
    setFormError('');

    const res = await fetch('/api/staff/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, vendor_id: vendorId }),
    });
    const json = await res.json();

    if (!res.ok) {
      setFormError(json.error ?? 'Erro ao cadastrar funcionário.');
      setSaving(false);
      return;
    }

    // Recarrega a lista
    const supabase = createClient();
    const { data } = await supabase
      .from('staff_schedules')
      .select('*, profiles(id, full_name, name, role)')
      .eq('vendor_id', vendorId)
      .eq('active', true)
      .order('created_at', { ascending: false });
    if (data) setStaff(data as StaffWithProfile[]);

    setForm({ name: '', email: '', phone: '', password: '', role: 'waitstaff' });
    setShowModal(false);
    setSaving(false);
  }

  async function savePermissions(scheduleId: string) {
    const supabase = createClient();
    await supabase
      .from('staff_schedules')
      .update({ permissions: editPerms, days_of_week: editDays })
      .eq('id', scheduleId);

    // Atualiza role no profile
    const member = staff.find(s => s.id === scheduleId);
    if (member?.profiles?.id) {
      await supabase.from('profiles').update({ role: editRole }).eq('id', member.profiles.id);
    }

    setStaff(prev => prev.map(s => s.id === scheduleId
      ? { ...s, permissions: editPerms, days_of_week: editDays, profiles: s.profiles ? { ...s.profiles, role: editRole } : null }
      : s
    ));
    setEditingId(null);
  }

  async function removeStaff(scheduleId: string) {
    const supabase = createClient();
    await supabase.from('staff_schedules').update({ active: false }).eq('id', scheduleId);
    setStaff(prev => prev.filter(s => s.id !== scheduleId));
  }

  if (loading) return (
    <div className="min-h-screen bg-[#f8f6f6] flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
    </div>
  );

  return (
    <main className="min-h-screen bg-[#f8f6f6] pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-900">Equipe</h1>
            <p className="text-sm text-slate-400">{staff.length} funcionário(s) ativo(s)</p>
          </div>
          <button
            onClick={() => { setShowModal(true); setFormError(''); }}
            className="bg-orange-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-orange-600 transition shadow-sm"
          >
            + Cadastrar
          </button>
        </div>

        {/* Staff List */}
        {staff.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-slate-100 shadow-sm">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-slate-400 text-sm">Nenhum funcionário cadastrado ainda.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {staff.map(member => {
              const name = member.profiles?.full_name || member.profiles?.name || 'Funcionário';
              const role = member.profiles?.role ?? 'waitstaff';
              const roleInfo = ROLE_OPTIONS.find(r => r.value === role);
              const isEditing = editingId === member.id;

              return (
                <div key={member.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-4 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center font-black text-lg">
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm leading-none mb-1">{name}</p>
                        <span className="text-xs text-slate-400">{roleInfo?.label ?? role}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (isEditing) { setEditingId(null); return; }
                          setEditingId(member.id);
                          setEditPerms(member.permissions ?? []);
                          setEditDays(member.days_of_week ?? [1, 2, 3, 4, 5]);
                          setEditRole(role);
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
                          <span className="text-xs text-slate-300">Sem permissões definidas</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="px-4 pb-4 border-t border-slate-50 pt-4 space-y-4">
                      {/* Role */}
                      <div>
                        <p className="text-xs font-bold text-slate-500 mb-2">Função</p>
                        <div className="grid grid-cols-3 gap-2">
                          {ROLE_OPTIONS.map(r => (
                            <button
                              key={r.value}
                              onClick={() => {
                                setEditRole(r.value);
                                setEditPerms(DEFAULT_PERMS[r.value] ?? []);
                              }}
                              className={`py-2 px-2 rounded-xl text-xs font-bold transition border ${
                                editRole === r.value
                                  ? 'bg-orange-500 text-white border-orange-500'
                                  : 'bg-white text-slate-500 border-slate-200'
                              }`}
                            >
                              {r.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Days */}
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
                      {/* Permissions */}
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
      </div>

      {/* Modal de Cadastro */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-t-[32px] sm:rounded-[32px] p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black text-slate-900">Cadastrar Funcionário</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 font-bold p-1 text-xl">✕</button>
            </div>

            <div className="space-y-3">
              {/* Função */}
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-2">Função</label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLE_OPTIONS.map(r => (
                    <button
                      key={r.value}
                      onClick={() => setForm(f => ({ ...f, role: r.value }))}
                      className={`py-2.5 rounded-xl text-xs font-bold transition border ${
                        form.role === r.value
                          ? 'bg-orange-500 text-white border-orange-500 shadow'
                          : 'bg-white text-slate-500 border-slate-200'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nome */}
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Nome completo *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="João da Silva"
                  className="w-full border border-slate-200 rounded-xl px-4 h-12 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="funcionario@email.com"
                  className="w-full border border-slate-200 rounded-xl px-4 h-12 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                />
              </div>

              {/* Telefone */}
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Telefone (opcional)</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                  className="w-full border border-slate-200 rounded-xl px-4 h-12 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                />
              </div>

              {/* Senha */}
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Senha inicial *</label>
                <input
                  type="text"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Ex: Burguer@2025"
                  className="w-full border border-slate-200 rounded-xl px-4 h-12 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                />
                <p className="text-[11px] text-slate-400 mt-1">O funcionário pode alterar a senha depois do primeiro acesso.</p>
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{formError}</div>
              )}

              <button
                onClick={createStaff}
                disabled={saving}
                className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl hover:bg-orange-600 transition disabled:opacity-50 mt-2"
              >
                {saving ? 'Cadastrando…' : 'Criar Conta e Cadastrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
