'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function VendorBusinesses({ vendors, currentVendorId }: { vendors: any[]; currentVendorId: string }) {
  const [showModal, setShowModal] = useState(false);
  const [brandName, setBrandName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!brandName.trim()) { setError('O nome da marca é obrigatório.'); return; }
    setCreating(true);
    setError('');

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Não autenticado.'); setCreating(false); return; }

    const { error: insertError } = await supabase.from('vendors').insert({
      owner_id: user.id,
      name: brandName.trim(),
      description: description.trim() || 'Criada via painel',
      avg_prep_time: 15,
    });

    setCreating(false);
    if (insertError) {
      setError(`Erro: ${insertError.message}`);
    } else {
      setShowModal(false);
      setBrandName('');
      setDescription('');
      router.refresh();
    }
  }

  async function switchVendor(vendorId: string) {
    document.cookie = `selected_vendor_id=${vendorId};path=/;max-age=86400`;
    router.refresh();
  }

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-300 uppercase tracking-widest">Meus Negócios ({vendors.length})</h2>
        <button
          onClick={() => setShowModal(true)}
          className="text-xs font-bold text-orange-600 hover:underline transition"
        >
          Nova Marca +
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {vendors.map(v => (
          <div
            key={v.id}
            className={`p-4 rounded-2xl border transition shadow-sm ${v.id === currentVendorId ? 'bg-orange-600 border-orange-500 shadow-orange-300/50' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-orange-200 dark:hover:border-orange-500/50'}`}
          >
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              </div>
              {v.id === currentVendorId && <span className="text-[10px] font-black uppercase text-orange-200 bg-orange-700/50 px-2 py-0.5 rounded-full">Atual</span>}
            </div>
            <h3 className={`font-bold text-sm ${v.id === currentVendorId ? 'text-white' : 'text-slate-800 dark:text-white'}`}>{v.name}</h3>
            <p className={`text-[11px] mb-3 ${v.id === currentVendorId ? 'text-orange-100/70' : 'text-slate-400 dark:text-slate-500 font-medium'}`}>{v.description || 'Nenhuma descrição'}</p>

            {v.id !== currentVendorId && (
              <button
                onClick={() => switchVendor(v.id)}
                className="w-full h-8 rounded-lg bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 text-[11px] font-bold transition hover:bg-orange-100 dark:hover:bg-orange-900/30"
              >
                Gerenciar
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Modal Nova Marca */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md shadow-xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <ThemeToggle />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Nova Marca</h3>
              </div>
              <button onClick={() => { setShowModal(false); setError(''); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl leading-none">&times;</button>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-xs font-bold px-3 py-2 rounded-xl mb-4">{error}</div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 ml-1 uppercase tracking-widest">Nome da Marca *</label>
                <input
                  type="text"
                  required
                  value={brandName}
                  onChange={e => setBrandName(e.target.value)}
                  placeholder="Ex: Bar do Juazeiro"
                  className="w-full h-12 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 ml-1 uppercase tracking-widest">Descrição <span className="text-slate-300 dark:text-slate-600 font-normal normal-case">(opcional)</span></label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Ex: Hamburgueria artesanal"
                  className="w-full h-12 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full h-12 bg-orange-600 text-white font-bold rounded-xl text-sm transition hover:bg-orange-700 disabled:opacity-50"
              >
                {creating ? 'Criando...' : 'Criar Marca'}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
