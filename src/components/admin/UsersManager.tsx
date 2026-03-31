'use client';

import { useState, useCallback } from 'react';
import React from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import { Copy, Check, Trash2, Pencil, X, Save, Mail, Phone, CreditCard, Cake } from 'lucide-react';
import type { AppRole } from '@/types/database';

const ROLE_LABELS: Record<AppRole, string> = {
  platform_admin: 'Super Admin',
  org_admin: 'Event Manager',
  vendor: 'Vendedor',
  waitstaff: 'Garçom',
  customer: 'Cliente',
  affiliate: 'Afiliado',
  deliverer: 'Entregador',
};

const ROLE_COLORS: Record<AppRole, string> = {
  platform_admin: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  org_admin: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  vendor: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  waitstaff: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  customer: 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400',
  affiliate: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400',
  deliverer: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
};

type UserProfile = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  birthday: string | null;
  role: AppRole;
  created_at: string;
};

interface Props {
  initialUsers: UserProfile[];
  currentUserId: string;
}

function formatPhoneDisplay(val: string | null) {
  if (!val) return null;
  const d = val.replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return val;
}

function formatCpfDisplay(val: string | null) {
  if (!val) return null;
  const d = val.replace(/\D/g, '');
  if (d.length === 11) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
  return val;
}

function formatBirthdayDisplay(val: string | null) {
  if (!val) return null;
  const d = new Date(val + 'T00:00:00');
  return d.toLocaleDateString('pt-BR');
}

function formatPhoneMask(val: string) {
  const d = val.replace(/\D/g, '').substring(0, 11);
  if (d.length > 10) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if (d.length > 6)  return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  if (d.length > 2)  return `(${d.slice(0,2)}) ${d.slice(2)}`;
  return d;
}

function formatCpfMask(val: string) {
  const d = val.replace(/\D/g, '').substring(0, 11);
  if (d.length > 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
  if (d.length > 6) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
  if (d.length > 3) return `${d.slice(0,3)}.${d.slice(3)}`;
  return d;
}

type EditForm = { name: string; email: string; phone: string; cpf: string; birthday: string };

const UserCard = React.memo(function UserCard({
  u,
  currentUserId,
  savingId,
  copiedId,
  editingId,
  editForm,
  onCopy,
  onChangeRole,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditChange,
  onDelete,
}: {
  u: UserProfile;
  currentUserId: string;
  savingId: string | null;
  copiedId: string | null;
  editingId: string | null;
  editForm: EditForm;
  onCopy: (id: string) => void;
  onChangeRole: (id: string, role: AppRole) => void;
  onStartEdit: (u: UserProfile) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string) => void;
  onEditChange: (field: keyof EditForm, value: string) => void;
  onDelete: (u: UserProfile) => void;
}) {
  const isEditing = editingId === u.id;
  const isSelf = u.id === currentUserId;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 border border-slate-100 dark:border-slate-800">
      {isEditing ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400">Editando usurio</p>
            <div className="flex gap-1">
              <button
                onClick={() => onSaveEdit(u.id)}
                disabled={savingId === u.id}
                className="p-1.5 rounded-lg bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 disabled:opacity-50 transition-colors"
                title="Salvar"
              >
                <Save className="w-4 h-4" />
              </button>
              <button
                onClick={onCancelEdit}
                className="p-1.5 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                title="Cancelar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <input
            type="text"
            value={editForm.name}
            onChange={(e) => onEditChange('name', e.target.value)}
            placeholder="Nome"
            className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
          />
          <input
            type="email"
            value={editForm.email}
            onChange={(e) => onEditChange('email', e.target.value)}
            placeholder="Email"
            className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
          />
          <input
            type="tel"
            value={editForm.phone}
            onChange={(e) => onEditChange('phone', formatPhoneMask(e.target.value))}
            placeholder="Telefone"
            inputMode="numeric"
            className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
          />
          <input
            type="text"
            value={editForm.cpf}
            onChange={(e) => onEditChange('cpf', formatCpfMask(e.target.value))}
            placeholder="CPF"
            inputMode="numeric"
            className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
          />
          <div>
            <label className="text-xs text-gray-500 dark:text-slate-400 ml-1">Data de nascimento</label>
            <input
              type="date"
              value={editForm.birthday}
              onChange={(e) => onEditChange('birthday', e.target.value)}
              className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-slate-400 ml-1">Cargo</label>
            <select
              value={u.role}
              disabled={savingId === u.id}
              onChange={(e) => onChangeRole(u.id, e.target.value as AppRole)}
              className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white dark:bg-slate-950 text-slate-900 dark:text-white disabled:opacity-50"
            >
              {(Object.keys(ROLE_LABELS) as AppRole[]).map((role) => (
                <option key={role} value={role} className="dark:bg-slate-900">{ROLE_LABELS[role]}</option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-gray-900 dark:text-white text-sm">
                {u.name ?? 'Sem nome'}
                {isSelf && (
                  <span className="ml-1.5 text-xs text-orange-500">(voc)</span>
                )}
              </p>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full transition-colors ${ROLE_COLORS[u.role]}`}>
                {ROLE_LABELS[u.role]}
              </span>
            </div>

            {/* Dados do usurio */}
            <div className="mt-1.5 space-y-0.5">
              {u.email && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
                  <Mail className="w-3 h-3 flex-shrink-0" />
                  <span>{u.email}</span>
                </div>
              )}
              {u.phone && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
                  <Phone className="w-3 h-3 flex-shrink-0" />
                  <span>{formatPhoneDisplay(u.phone)}</span>
                </div>
              )}
              {u.cpf && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
                  <CreditCard className="w-3 h-3 flex-shrink-0" />
                  <span>{formatCpfDisplay(u.cpf)}</span>
                </div>
              )}
              {u.birthday && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
                  <Cake className="w-3 h-3 flex-shrink-0" />
                  <span>{formatBirthdayDisplay(u.birthday)}</span>
                </div>
              )}
            </div>

            {/* UUID copivel */}
            <button
              onClick={() => onCopy(u.id)}
              className="flex items-center gap-1 mt-1.5 text-xs text-gray-400 dark:text-slate-500 hover:text-orange-500 dark:hover:text-orange-400 transition-colors group"
              title="Copiar UUID"
            >
              <span className="font-mono truncate max-w-[200px]">{u.id}</span>
              {copiedId === u.id
                ? <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                : <Copy className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              }
            </button>

            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
              Cadastro: {formatDate(u.created_at)}
            </p>
          </div>

          {!isSelf && (
            <div className="flex items-center gap-1 ml-3 flex-shrink-0">
              <button
                onClick={() => onStartEdit(u)}
                className="p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
                title="Editar"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(u)}
                className="p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                title="Excluir"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default function UsersManager({ initialUsers, currentUserId }: Props) {
  const [users, setUsers] = useState<UserProfile[]>(initialUsers);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: '', email: '', phone: '', cpf: '', birthday: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<UserProfile | null>(null);

  const changeRole = useCallback(async (userId: string, newRole: AppRole) => {
    setSavingId(userId);
    const supabase = createClient();
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (error) {
      alert(`Erro ao alterar cargo: ${error.message}`);
    } else {
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
    }
    setSavingId(null);
  }, []);

  const copyId = useCallback((id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const startEdit = useCallback((u: UserProfile) => {
    setEditingId(u.id);
    setEditForm({
      name: u.name ?? '',
      email: u.email ?? '',
      phone: formatPhoneMask(u.phone ?? ''),
      cpf: formatCpfMask(u.cpf ?? ''),
      birthday: u.birthday ?? '',
    });
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  const handleEditChange = useCallback((field: keyof EditForm, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const saveEdit = useCallback(async (userId: string) => {
    setSavingId(userId);
    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({
        name: editForm.name.trim() || null,
        email: editForm.email.trim() || null,
        phone: editForm.phone.replace(/\D/g, '') || null,
        cpf: editForm.cpf.replace(/\D/g, '') || null,
        birthday: editForm.birthday || null,
      })
      .eq('id', userId);

    if (error) {
      alert(`Erro ao salvar: ${error.message}`);
    } else {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                name: editForm.name.trim() || null,
                email: editForm.email.trim() || null,
                phone: editForm.phone.replace(/\D/g, '') || null,
                cpf: editForm.cpf.replace(/\D/g, '') || null,
                birthday: editForm.birthday || null,
              }
            : u
        )
      );
      setEditingId(null);
    }
    setSavingId(null);
  }, [editForm]);

  const deleteUser = useCallback(async (u: UserProfile) => {
    setSavingId(u.id);
    const supabase = createClient();
    const { error } = await supabase.from('profiles').delete().eq('id', u.id);
    if (error) {
      alert(`Erro ao excluir: ${error.message}`);
    } else {
      setUsers((prev) => prev.filter((p) => p.id !== u.id));
    }
    setSavingId(null);
    setDeleteConfirm(null);
  }, []);

  const filtered = users.filter((u) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(s) ||
      u.email?.toLowerCase().includes(s) ||
      u.phone?.includes(search.replace(/\D/g, '')) ||
      u.id.includes(search)
    );
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
      <input
        type="search"
        placeholder="Buscar por nome, email ou UUID..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400 text-slate-900 dark:text-white"
      />

      <p className="text-xs text-gray-400 dark:text-slate-500">{filtered.length} usurio{filtered.length !== 1 ? 's' : ''}</p>

      {filtered.map((u) => (
        <UserCard
          key={u.id}
          u={u}
          currentUserId={currentUserId}
          savingId={savingId}
          copiedId={copiedId}
          editingId={editingId}
          editForm={editForm}
          onCopy={copyId}
          onChangeRole={changeRole}
          onStartEdit={startEdit}
          onCancelEdit={cancelEdit}
          onSaveEdit={saveEdit}
          onEditChange={handleEditChange}
          onDelete={(user) => setDeleteConfirm(user)}
        />
      ))}

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">👤</p>
          <p>Nenhum usuário encontrado.</p>
        </div>
      )}

      {/* Modal de confirmao de excluso */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
            <h3 className="font-bold text-gray-900 dark:text-white text-base">Excluir usurio?</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">
              Tem certeza que deseja excluir <strong>{deleteConfirm.name ?? 'Sem nome'}</strong>?
              Esta ao nǜo pode ser desfeita.
            </p>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteUser(deleteConfirm)}
                disabled={savingId === deleteConfirm.id}
                className="flex-1 px-4 py-2 text-sm rounded-xl bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 shadow-lg shadow-red-500/20 transition-all active:scale-95"
              >
                {savingId === deleteConfirm.id ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
