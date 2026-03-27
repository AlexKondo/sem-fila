'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, CreditCard, Trash2, ShieldCheck } from 'lucide-react';

const P = '#ec5b13';

export default function PaymentsPage() {
  const [cardLast4, setCardLast4] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from('profiles')
        .select('asaas_card_last4')
        .eq('id', user.id)
        .single();
      setCardLast4(data?.asaas_card_last4 ?? null);
      setLoading(false);
    });
  }, []);

  async function handleRemoveCard() {
    if (!confirm('Remover o cartão salvo? Você precisará digitá-lo novamente na próxima compra.')) return;
    setRemoving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({
        asaas_card_token: null,
        asaas_card_last4: null,
      }).eq('id', user.id);
      setCardLast4(null);
      setRemoved(true);
    }
    setRemoving(false);
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: P }} />
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="p-2 rounded-full hover:bg-slate-50 text-slate-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-black text-slate-900 tracking-tight">Cartões de Crédito</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-8">
        {cardLast4 ? (
          <div className="space-y-6">
            {/* Card Visual */}
            <div className="relative overflow-hidden bg-slate-900 rounded-[32px] p-8 text-white shadow-2xl border border-white/10 group">
              <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:scale-110 transition-transform duration-500">
                <CreditCard className="w-20 h-20" />
              </div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-12">
                   <div className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/5">
                     Cartão Salvo
                   </div>
                   <div className="text-right">
                     <div className="w-10 h-7 bg-white/20 rounded-md backdrop-blur-sm ml-auto" />
                   </div>
                </div>

                <div className="space-y-1">
                  <p className="text-xl font-black tracking-tight leading-none italic">
                    Cartão final ***** {cardLast4}
                  </p>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest opacity-60">Status: Ativo para compras</p>
                </div>
              </div>

              {/* Decorative gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent pointer-events-none" />
            </div>

            <div className="flex items-start gap-3 bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
              <div className="p-2 bg-emerald-50 rounded-xl">
                 <ShieldCheck className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800">Pagamento Tokenizado</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Para sua segurança, os dados sensíveis do cartão não são salvos em nosso sistema. Usamos apenas o token seguro gerado pelo nosso processador de pagamentos certificado.
                </p>
              </div>
            </div>

            <button
              onClick={handleRemoveCard}
              disabled={removing}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-white border border-red-100 text-red-500 font-black text-sm hover:bg-red-50 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
            >
              <Trash2 className="w-4 h-4" />
              {removing ? 'Removendo...' : 'EXCLUIR CARTÃO SALVO'}
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm text-center">
            <div className="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center mx-auto mb-6">
              <CreditCard className="w-10 h-10 text-slate-300" />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2">
              {removed ? 'Cartão removido' : 'Nenhum cartão salvo'}
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-8">
              {removed
                ? 'Seu cartão foi removido com sucesso. Você pode cadastrar um novo token de pagamento na sua próxima compra.'
                : 'Pague com 1 clique nas próximas vezes. Ao finalizar um pedido com cartão, você poderá salvá-lo com total segurança.'}
            </p>
            <Link
              href="/"
              className="inline-block w-full py-4 rounded-2xl text-white font-black text-sm shadow-xl shadow-orange-100 transition-transform active:scale-95"
              style={{ backgroundColor: P }}
            >
              Ir para o cardápio
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
