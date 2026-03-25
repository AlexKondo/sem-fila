'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import LogoutButton from '../ui/LogoutButton';

export default function VendorOnboarding({ userId }: { userId: string }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const supabase = createClient();

    try {
      // 1. Busca um evento para vincular
      const { data: firstEvent } = await supabase.from('events').select('id').limit(1).single();
      
      const { error: insE } = await supabase.from('vendors').insert({
        owner_id: userId,
        event_id: firstEvent?.id || null, 
        name: name.trim(),
        description: 'Nova marca QuickPick',
        avg_prep_time: 15,
        payment_mode: 'optional',
        accept_cash: true, accept_pix: true, accept_card: true,
        active: true
      });

      if (insE) {
         setError(`Erro ao criar: ${insE.message}`);
         setLoading(false);
         return;
      }

      // 2. Recarrega a página inteira para Next reconhecer o vendor novo
      window.location.reload();
    } catch (err: any) {
      setError('Problema na conexão.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: '#f8f6f6' }}>
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-sm border border-slate-100">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ backgroundColor: '#ec5b131a' }}>
          <svg className="w-6 h-6 text-[#ec5b13]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">Crie sua marca</h2>
        <p className="text-slate-500 text-xs mb-5">Preencha os dados abaixo para começar a vender.</p>
        
        {error && <div className="bg-red-50 text-red-700 text-xs px-3 py-2 rounded-lg mb-3">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Nome da comanda / Marca</label>
            <input 
               value={name} onChange={e => setName(e.target.value)}
               required placeholder="Ex: Hamburgueria do Zé" 
               className="w-full h-11 border border-slate-200 rounded-xl px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#ec5b13]" 
            />
          </div>
          <button type="submit" disabled={loading} className="w-full h-11 text-white font-bold rounded-xl text-sm shadow-sm transition hover:opacity-95 bg-[#ec5b13] disabled:opacity-50">
            {loading ? 'Ativando...' : 'Ativar minha marca'}
          </button>
        </form>

        <div className="border-t border-slate-100 mt-5 pt-4 text-center">
           <LogoutButton className="mx-auto flex items-center justify-center gap-1.5 text-xs text-slate-400 font-semibold"  />
        </div>
      </div>
    </div>
  );
}
