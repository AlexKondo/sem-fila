'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User, Phone, Mail, Shield } from 'lucide-react';
import type { Profile, AppRole } from '@/types/database';

const ROLE_LABELS: Record<AppRole, string> = {
  platform_admin: 'Super Admin',
  org_admin: 'Admin de Organização',
  vendor: 'Vendedor',
  waitstaff: 'Garçom',
  customer: 'Cliente',
};

interface Props {
  profile: Profile | null;
  email: string;
}

export default function ProfileForm({ profile, email }: Props) {
  const [name, setName] = useState(profile?.name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Nome obrigatório.'); return; }
    setError('');
    setSaving(true);

    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({ name: name.trim(), phone: phone.trim() || null })
      .eq('id', profile!.id);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    }
    setSaving(false);
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-500 text-2xl font-bold select-none">
          {name ? name[0].toUpperCase() : '?'}
        </div>
        <div>
          <p className="font-semibold text-gray-900">{name || 'Sem nome'}</p>
          <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full mt-1">
            <Shield className="w-3 h-3" />
            {ROLE_LABELS[profile?.role ?? 'customer']}
          </span>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-3">
        {error && (
          <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>
        )}
        {success && (
          <div className="bg-green-50 text-green-700 text-sm px-3 py-2 rounded-lg">Perfil salvo com sucesso!</div>
        )}

        {/* Email (somente leitura) */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
            <Mail className="w-3 h-3" /> Email
          </label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
          />
        </div>

        {/* Nome */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
            <User className="w-3 h-3" /> Nome
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome completo"
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        {/* Telefone */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
            <Phone className="w-3 h-3" /> WhatsApp / Telefone
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(11) 99999-9999"
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-orange-500 text-white font-semibold py-2.5 rounded-xl hover:bg-orange-600 transition disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </form>
    </div>
  );
}
