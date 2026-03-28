'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const P = '#ec5b13';

// Máscara CPF/CNPJ: 000.000.000-00 ou 00.000.000/0000-00
function maskCPF_CNPJ(v: string) {
  const digits = v.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else {
    return digits
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
}

// Máscara celular: (00) 00000-0000
function maskPhone(v: string) {
  const digits = v.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 7) return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
}

export default function VendorAccountForm({ profile }: { profile: any }) {
  const [name, setName] = useState(profile.name || '');
  const [phone, setPhone] = useState(maskPhone(profile.phone || ''));
  const [cnpj, setCnpj] = useState(maskCPF_CNPJ(profile.cnpj || ''));
  const [address, setAddress] = useState(profile.address || '');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setMsg({ text: '', type: '' });
    const supabase = createClient();

    const { error } = await supabase
      .from('profiles')
      .update({
        name: name.trim(),
        phone: phone.replace(/\D/g, ''),
        cnpj: cnpj.replace(/\D/g, ''),
        address: address.trim() || null,
      })
      .eq('id', profile.id);

    setLoading(false);
    if (error) {
      setMsg({ text: `Erro: ${error.message}`, type: 'error' });
    } else {
      setMsg({ text: 'Perfil atualizado com sucesso!', type: 'success' });
      window.location.reload();
    }
  }

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-orange-100 text-orange-600">
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Meus Dados Pessoais</h2>
          <p className="text-xs text-slate-400 font-medium tracking-tight">Informações do seu cadastro no QuickPick</p>
        </div>
      </div>

      <form onSubmit={handleUpdateProfile} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1 ml-1 uppercase tracking-widest">Nome Completo</label>
          <input
            value={name} onChange={e => setName(e.target.value)}
            className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1 ml-1 uppercase tracking-widest">Email</label>
          <input
            value={profile.email || ''}
            disabled
            className="w-full h-12 bg-slate-100 border border-slate-200 rounded-xl px-4 text-sm text-slate-400 cursor-not-allowed"
          />
          <p className="text-[10px] text-slate-400 mt-1 ml-1">O email não pode ser alterado.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 ml-1 uppercase tracking-widest">Celular</label>
            <input
              value={phone} onChange={e => setPhone(maskPhone(e.target.value))}
              className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 ml-1 uppercase tracking-widest">CPF ou CNPJ</label>
            <input
              value={cnpj} onChange={e => setCnpj(maskCPF_CNPJ(e.target.value))}
              className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1 ml-1 uppercase tracking-widest">Endereço <span className="text-slate-300 font-normal normal-case">(opcional)</span></label>
          <input
            value={address} onChange={e => setAddress(e.target.value)}
            placeholder="Rua, número, cidade"
            className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          />
        </div>

        {msg.text && (
          <div className={`p-3 rounded-xl text-xs font-bold ${msg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
            {msg.text}
          </div>
        )}

        <button 
          disabled={loading}
          className="w-full h-12 bg-slate-900 text-white font-bold rounded-xl text-sm transition hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? 'Atualizando...' : 'Salvar Meus Dados'}
        </button>
      </form>
    </div>
  );
}
