'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { StaffSchedule } from '@/types/database';

const ROLE_OPTIONS = [
  { value: 'waitstaff', label: 'Garçom / Atendente', emoji: '🍽️', color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' },
  { value: 'deliverer', label: 'Entregador',          emoji: '🛵', color: 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' },
  { value: 'org_admin', label: 'Admin',               emoji: '🛡️', color: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' },
];

type StaffWithProfile = StaffSchedule & {
  profiles: { full_name: string | null; name: string | null; role: string; id: string; phone: string | null } | null;
  email?: string | null;
};

export default function StaffPage() {
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState<string>('all');

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'waitstaff' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [removing, setRemoving] = useState<string | null>(null);

  const [editingMember, setEditingMember] = useState<StaffWithProfile | null>(null);
  const [editForm, setEditForm] = useState({ name: '', role: 'waitstaff', phone: '', email: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const cookieVendorId = document.cookie
        .split('; ').find(c => c.startsWith('selected_vendor_id='))?.split('=')[1];

      const { data: profileData } = await supabase
        .from('profiles').select('role').eq('id', user.id).single();
      const isPlatformAdmin = profileData?.role === 'platform_admin';

      const { data: vendorsData } = await supabase
        .from('vendors').select('id').eq('owner_id', user.id);

      let vid: string | null = null;

      if (isPlatformAdmin && cookieVendorId && cookieVendorId !== 'all') {
        // platform_admin usa o vendor do cookie diretamente
        vid = cookieVendorId;
      } else if (vendorsData?.length) {
        vid = (cookieVendorId && cookieVendorId !== 'all' && vendorsData.find(v => v.id === cookieVendorId))
          ? cookieVendorId
          : vendorsData[0].id;
      }

      if (!vid) { setLoading(false); return; }
      setVendorId(vid);

      const res = await fetch(`/api/staff/list?vendor_id=${vid}`);
      const json = await res.json();
      if (json.data) setStaff(json.data as StaffWithProfile[]);
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

    const listRes = await fetch(`/api/staff/list?vendor_id=${vendorId}`);
    const listJson = await listRes.json();
    if (listJson.data) setStaff(listJson.data as StaffWithProfile[]);

    setForm({ name: '', email: '', phone: '', password: '', role: 'waitstaff' });
    setShowModal(false);
    setSaving(false);
  }

  function openEdit(member: StaffWithProfile) {
    setEditingMember(member);
    const rawPhone = member.profiles?.phone?.replace(/\D/g, '') || '';
    const maskedPhone = rawPhone.length <= 2 ? rawPhone
      : rawPhone.length <= 7 ? `(${rawPhone.slice(0,2)}) ${rawPhone.slice(2)}`
      : `(${rawPhone.slice(0,2)}) ${rawPhone.slice(2,7)}-${rawPhone.slice(7)}`;
    setEditForm({
      name: member.profiles?.full_name || member.profiles?.name || '',
      role: member.profiles?.role ?? 'waitstaff',
      phone: maskedPhone,
      email: member.email || '',
    });
    setEditError('');
  }

  async function saveEdit() {
    if (!editingMember || !editForm.name.trim()) {
      setEditError('Nome é obrigatório.');
      return;
    }
    setEditSaving(true);
    setEditError('');

    const supabase = createClient();
    const phoneDigits = editForm.phone.replace(/\D/g, '') || null;
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: editForm.name, name: editForm.name, role: editForm.role, phone: phoneDigits })
      .eq('id', editingMember.user_id);

    if (error) {
      setEditError(error.message);
      setEditSaving(false);
      return;
    }

    setStaff(prev =>
      prev.map(s =>
        s.id === editingMember.id
          ? { ...s, profiles: { ...s.profiles!, full_name: editForm.name, name: editForm.name, role: editForm.role, phone: phoneDigits } }
          : s
      )
    );
    setEditingMember(null);
    setEditSaving(false);
  }

  async function removeStaff(scheduleId: string) {
    setRemoving(scheduleId);
    const supabase = createClient();
    await supabase.from('staff_schedules').update({ active: false }).eq('id', scheduleId);
    setStaff(prev => prev.filter(s => s.id !== scheduleId));
    setRemoving(null);
  }

  if (loading) return (
    <div className="min-h-screen bg-[#f8f6f6] dark:bg-slate-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
    </div>
  );

  const tabs = [
    { key: 'all',       label: 'Todos' },
    { key: 'waitstaff', label: 'Atendentes' },
    { key: 'deliverer', label: 'Entregadores' },
    { key: 'org_admin', label: 'Gerentes' },
  ];

  const filtered = filterRole === 'all'
    ? staff
    : staff.filter(m => (m.profiles?.role ?? 'waitstaff') === filterRole);

  return (
    <main className="min-h-screen bg-[#f8f6f6] dark:bg-slate-950 pb-20 transition-colors duration-300">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">Equipe</h1>
            <p className="text-sm text-slate-400 dark:text-slate-500">{staff.length} funcionário(s) ativo(s)</p>
          </div>
          <button
            onClick={() => { setShowModal(true); setFormError(''); }}
            className="bg-orange-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-orange-600 transition shadow-sm active:scale-95"
          >
            + Cadastrar
          </button>
        </div>

        {/* Tabs filtro */}
        <div className="flex gap-1 bg-white dark:bg-slate-900 rounded-2xl p-1 border border-slate-100 dark:border-slate-800 shadow-sm overflow-x-auto no-scrollbar">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setFilterRole(t.key)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                filterRole === t.key ? 'bg-orange-500 text-white shadow' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tabela */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Cabeçalho */}
          <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3 border-b border-slate-50 dark:border-slate-800">
            <span className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-wider">Funcionário</span>
            <span className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-wider">Cargo</span>
            <span className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-wider">Ações</span>
          </div>

          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-3xl mb-2">👥</p>
              <p className="text-slate-400 dark:text-slate-600 text-sm">Nenhum funcionário encontrado.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filtered.map(member => {
                const name = member.profiles?.full_name || member.profiles?.name || 'Funcionário';
                const role = member.profiles?.role ?? 'waitstaff';
                const roleInfo = ROLE_OPTIONS.find(r => r.value === role) ?? ROLE_OPTIONS[0];
                const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

                return (
                  <div key={member.id} className="grid grid-cols-[1fr_auto_auto] gap-4 items-center px-4 py-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition">
                    {/* Funcionário */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-950/30 text-orange-500 flex items-center justify-center font-black text-sm flex-shrink-0 border-2 border-orange-100 dark:border-orange-900/50">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-none mb-0.5 truncate">{name}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{roleInfo.emoji} {roleInfo.label}</p>
                      </div>
                    </div>

                    {/* Cargo badge */}
                    <span className={`text-[11px] font-black px-2.5 py-1 rounded-full whitespace-nowrap ${roleInfo.color}`}>
                      {roleInfo.label}
                    </span>

                    {/* Ações */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(member)}
                        title="Editar funcionário"
                        className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-300 dark:text-slate-600 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => removeStaff(member.id)}
                        disabled={removing === member.id}
                        title="Remover funcionário"
                        className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition disabled:opacity-40"
                      >
                        {removing === member.id ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer */}
          {staff.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-50 dark:border-slate-800">
              <p className="text-xs text-slate-400 dark:text-slate-500">Mostrando {filtered.length} de {staff.length} funcionário(s)</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Edição */}
      {editingMember && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setEditingMember(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-t-[32px] sm:rounded-[32px] p-6 w-full max-w-md border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Editar Funcionário</h2>
              <button onClick={() => setEditingMember(null)} className="text-slate-400 dark:text-slate-600 hover:text-slate-200 font-bold p-1 text-xl leading-none">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Nome completo *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl px-4 h-12 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Função *</label>
                <select
                  value={editForm.role}
                  onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 h-12 text-sm bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-slate-900 dark:text-white"
                >
                  {ROLE_OPTIONS.map(r => (
                    <option key={r.value} value={r.value}>{r.emoji} {r.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  readOnly
                  className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 h-12 text-sm bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-600 cursor-not-allowed"
                />
                <p className="text-[11px] text-slate-400 dark:text-slate-600 mt-1">O email não pode ser alterado.</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">WhatsApp</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 11);
                    const masked = v.length <= 2 ? v
                      : v.length <= 7 ? `(${v.slice(0,2)}) ${v.slice(2)}`
                      : `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
                    setEditForm(f => ({ ...f, phone: masked }));
                  }}
                  placeholder="(11) 99999-9999"
                  className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl px-4 h-12 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-slate-900 dark:text-white"
                />
              </div>

              {editError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{editError}</div>
              )}

              <button
                onClick={saveEdit}
                disabled={editSaving}
                className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl hover:bg-orange-600 transition disabled:opacity-50 mt-2"
              >
                {editSaving ? 'Salvando…' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cadastro */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-t-[32px] sm:rounded-[32px] p-6 w-full max-w-md border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Cadastrar Funcionário</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 dark:text-slate-600 hover:text-slate-200 font-bold p-1 text-xl leading-none">✕</button>
            </div>

            <div className="space-y-3">
              {/* Nome */}
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Nome completo *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="João da Silva"
                  className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl px-4 h-12 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-slate-900 dark:text-white"
                />
              </div>

              {/* Função — combobox */}
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Função *</label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl px-4 h-12 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-slate-900 dark:text-white"
                >
                  {ROLE_OPTIONS.map(r => (
                    <option key={r.value} value={r.value}>{r.emoji} {r.label}</option>
                  ))}
                </select>
              </div>

              {/* Email */}
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="funcionario@email.com"
                  className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl px-4 h-12 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-slate-900 dark:text-white"
                />
              </div>

              {/* WhatsApp */}
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">WhatsApp (opcional)</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 11);
                    const masked = v.length <= 2 ? v
                      : v.length <= 7 ? `(${v.slice(0,2)}) ${v.slice(2)}`
                      : `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
                    setForm(f => ({ ...f, phone: masked }));
                  }}
                  placeholder="(11) 99999-9999"
                  className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl px-4 h-12 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-slate-900 dark:text-white"
                />
              </div>

              {/* Senha */}
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Senha inicial *</label>
                <input
                  type="text"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Ex: Burguer@2025"
                  className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl px-4 h-12 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-slate-900 dark:text-white"
                />
                <p className="text-[11px] text-slate-400 dark:text-slate-600 mt-1">O funcionário pode alterar a senha depois do primeiro acesso.</p>
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
