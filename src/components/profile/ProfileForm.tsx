'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User, Phone, Mail, Shield, LogOut } from 'lucide-react';
import LogoutButton from '@/components/ui/LogoutButton';
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
  const [cpf, setCpf] = useState(profile?.cpf ?? '');
  const [birthdayDay, setBirthdayDay] = useState(profile?.birthday_day?.toString() ?? '');
  const [birthdayMonth, setBirthdayMonth] = useState(profile?.birthday_month?.toString() ?? '');
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
      .update({ 
        name: name.trim(), 
        phone: phone.trim() || null,
        cpf: cpf.trim() || null,
        birthday_day: birthdayDay ? parseInt(birthdayDay) : null,
        birthday_month: birthdayMonth ? parseInt(birthdayMonth) : null
      })
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
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '').substring(0, 11);
              let f = digits;
              if (f.length > 10) f = `(${f.substring(0, 2)}) ${f.substring(2, 7)}-${f.substring(7)}`;
              else if (f.length > 6) f = `(${f.substring(0, 2)}) ${f.substring(2, 6)}-${f.substring(6)}`;
              else if (f.length > 2) f = `(${f.substring(0, 2)}) ${f.substring(2)}`;
              setPhone(f);
            }}
            placeholder="(11) 99999-9999"
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        {/* CPF e Aniversário */}
        <div className="pt-2 border-t border-gray-100 mt-2 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">CPF</label>
            <input
              type="text"
              value={cpf}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').substring(0, 11);
                let f = digits;
                if (f.length > 9) f = `${f.substring(0, 3)}.${f.substring(3, 6)}.${f.substring(6, 9)}-${f.substring(9)}`;
                else if (f.length > 6) f = `${f.substring(0, 3)}.${f.substring(3, 6)}.${f.substring(6)}`;
                else if (f.length > 3) f = `${f.substring(0, 3)}.${f.substring(3)}`;
                setCpf(f);
              }}
              placeholder="000.000.000-00"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100">
            <label className="block text-xs font-bold text-orange-800 mb-2">🎁 Aniversário para Promoções</label>
            <div className="grid grid-cols-2 gap-2">
              <input 
                type="number" min="1" max="31" value={birthdayDay} onChange={e => setBirthdayDay(e.target.value)} placeholder="Dia"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400"
              />
              <select 
                value={birthdayMonth} onChange={e => setBirthdayMonth(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400"
              >
                <option value="">Mês</option>
                {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].map((m, i) => (
                  <option key={m} value={i+1}>{m}</option>
                ))}
              </select>
            </div>
            <p className="text-[10px] text-orange-600 mt-2">
              * Sujeito a comprovação oficial para recebimento de prêmios.
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-orange-500 text-white font-semibold h-12 rounded-xl hover:bg-orange-600 transition disabled:opacity-50 shadow-md active:scale-95"
        >
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>

        <div className="pt-4 border-t border-gray-100 flex flex-col items-center gap-2">
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">Gerenciar Conta</p>
          <LogoutButton 
            className="w-full flex items-center justify-center gap-2 text-red-500 font-bold text-sm py-3 rounded-xl border-2 border-transparent hover:bg-red-50 hover:border-red-100 transition-all active:scale-95"
          />
        </div>
      </form>
    </div>
  );
}
