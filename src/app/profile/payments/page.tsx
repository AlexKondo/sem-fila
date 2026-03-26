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
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 px-4 py-3 flex items-center gap-3">
        <Link href="/profile" className="p-2 rounded-full hover:bg-slate-50 text-slate-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-bold text-slate-900">Cartão Salvo</h1>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {cardLast4 ? (
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Cartão de crédito</p>
                  <p className="text-sm text-slate-400">•••• •••• •••• {cardLast4}</p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Ativo</span>
            </div>

            <div className="flex items-start gap-2 bg-slate-50 rounded-2xl p-3 mb-5">
              <ShieldCheck className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <p className="text-xs text-slate-500 leading-relaxed">
                Apenas os últimos 4 dígitos são armazenados. O token de pagamento é gerenciado com segurança pelo Asaas e nunca passa pelo nosso servidor após o cadastro.
              </p>
            </div>

            <button
              onClick={handleRemoveCard}
              disabled={removing}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-red-100 text-red-500 font-bold text-sm hover:bg-red-50 transition-all active:scale-95 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {removing ? 'Removendo...' : 'Remover cartão salvo'}
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-slate-300" />
            </div>
            <h2 className="font-bold text-slate-900 mb-2">
              {removed ? 'Cartão removido' : 'Nenhum cartão salvo'}
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              {removed
                ? 'Seu cartão foi removido com sucesso. Você pode cadastrar um novo na próxima compra.'
                : 'Ao pagar com cartão de crédito, você pode salvar o cartão para compras futuras com 1 clique.'}
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 rounded-2xl text-white font-bold text-sm"
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
