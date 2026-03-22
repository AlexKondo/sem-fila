'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import { Copy, Check } from 'lucide-react';
import type { AppRole } from '@/types/database';

const ROLE_LABELS: Record<AppRole, string> = {
  platform_admin: 'Super Admin',
  org_admin: 'Admin Org',
  vendor: 'Vendedor',
  waitstaff: 'Garçom',
  customer: 'Cliente',
};

const ROLE_COLORS: Record<AppRole, string> = {
  platform_admin: 'bg-red-100 text-red-700',
  org_admin: 'bg-purple-100 text-purple-700',
  vendor: 'bg-orange-100 text-orange-700',
  waitstaff: 'bg-blue-100 text-blue-700',
  customer: 'bg-gray-100 text-gray-600',
};

type UserProfile = { id: string; name: string | null; phone: string | null; role: AppRole; created_at: string };

interface Props {
  initialUsers: UserProfile[];
  currentUserId: string;
}

export default function UsersManager({ initialUsers, currentUserId }: Props) {
  const [users, setUsers] = useState<UserProfile[]>(initialUsers);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  async function changeRole(userId: string, newRole: AppRole) {
    setSavingId(userId);
    const supabase = createClient();
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (!error) {
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
    }
    setSavingId(null);
  }

  function copyId(id: string) {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const filtered = users.filter((u) =>
    !search ||
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.id.includes(search)
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
      {/* Busca */}
      <input
        type="search"
        placeholder="Buscar por nome ou UUID..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
      />

      <p className="text-xs text-gray-400">{filtered.length} usuário{filtered.length !== 1 ? 's' : ''}</p>

      {filtered.map((u) => (
        <div key={u.id} className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-gray-900 text-sm">
                  {u.name ?? 'Sem nome'}
                  {u.id === currentUserId && (
                    <span className="ml-1.5 text-xs text-orange-500">(você)</span>
                  )}
                </p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role]}`}>
                  {ROLE_LABELS[u.role]}
                </span>
              </div>

              {/* UUID copiável */}
              <button
                onClick={() => copyId(u.id)}
                className="flex items-center gap-1 mt-1 text-xs text-gray-400 hover:text-orange-500 transition group"
                title="Copiar UUID"
              >
                <span className="font-mono truncate max-w-[200px]">{u.id}</span>
                {copiedId === u.id
                  ? <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                  : <Copy className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100" />
                }
              </button>

              <p className="text-xs text-gray-400 mt-0.5">
                Cadastro: {formatDate(u.created_at)}
              </p>
            </div>

            {/* Select de role */}
            {u.id !== currentUserId && (
              <select
                value={u.role}
                disabled={savingId === u.id}
                onChange={(e) => changeRole(u.id, e.target.value as AppRole)}
                className="ml-3 border border-gray-200 rounded-xl px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-50 flex-shrink-0"
              >
                {(Object.keys(ROLE_LABELS) as AppRole[]).map((role) => (
                  <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">👤</p>
          <p>Nenhum usuário encontrado.</p>
        </div>
      )}
    </div>
  );
}
