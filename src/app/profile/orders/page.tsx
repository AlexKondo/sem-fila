'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, ORDER_STATUS_LABEL } from '@/lib/utils';
import type { OrderStatus } from '@/types/database';

const P = '#ec5b13';

type OrderWithVendor = {
  id: string;
  status: OrderStatus;
  total_price: number;
  pickup_code: string;
  created_at: string;
  vendors: {
    name: string;
    logo_url: string | null;
  } | null;
};

export default function UserOrdersDashboard() {
  const [orders, setOrders] = useState<OrderWithVendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetchOrders() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('orders')
        .select(`
          id, status, total_price, pickup_code, created_at,
          vendors (name, logo_url)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) setOrders(data as any);
      setLoading(false);
    }

    fetchOrders();

    // Inscrição Realtime para atualizar status nos cards imediatamente
    const channel = supabase
      .channel('user-orders-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const [showSuccess, setShowSuccess] = useState(false);
  const [showAffiliateModal, setShowAffiliateModal] = useState(false);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('payment') === 'success') {
      setShowSuccess(true);
      url.searchParams.delete('payment');
      url.searchParams.delete('new_order');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: P }}></div>
    </div>
  );

  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const pastOrders = orders.filter(o => ['delivered', 'cancelled'].includes(o.status));

  return (
    <main className="min-h-screen pb-20" style={{ backgroundColor: '#f8f6f6' }}>
      <header className="bg-white px-6 py-6 border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Meus Pedidos</h1>
            <p className="text-sm text-slate-400 font-medium">Acompanhe tudo em tempo real</p>
          </div>
          <Link href="/" className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/></svg>
          </Link>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6 space-y-8">
        {/* Ativos */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">Em andamento</h2>
          </div>
          
          {activeOrders.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 shadow-sm">
              <p className="text-4xl mb-2">🛍️</p>
              <p className="text-slate-400 text-sm">Você não tem pedidos ativos no momento.</p>
              <Link href="/" className="inline-block mt-4 text-sm font-bold" style={{ color: P }}>Ir para o cardápio →</Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {activeOrders.map(order => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </section>

        {/* Histórico */}
        {orders.length > 0 && pastOrders.length > 0 && (
          <section>
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Finalizados recentemente</h2>
            <div className="grid gap-3 opacity-70">
              {pastOrders.slice(0, 5).map(order => (
                <OrderCard key={order.id} order={order} isPast />
              ))}
            </div>
          </section>
        )}

        {/* Affiliate Promo Card — CTA para o usuário virar parceiro */}
        <div className="bg-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden shadow-xl border border-white/5">
           <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">💸</div>
           <h3 className="text-xl font-black mb-2 leading-none tracking-tight">Ganhe Dinheiro Indicando</h3>
           <p className="text-slate-400 text-sm mb-6 leading-relaxed">
             Conhece algum quiosque ou barraca sem nosso app? Indique e ganhe uma porcentagem recorrente por cada venda deles.
           </p>
           <button 
             onClick={() => setShowAffiliateModal(true)}
             className="w-full py-4 rounded-2xl bg-orange-600 hover:bg-orange-500 font-black text-sm transition-all shadow-lg active:scale-95"
           >
             Saiba Como Ganhar
           </button>
        </div>
      </div>

      {/* Affiliate Modal */}
      {showAffiliateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md px-4 pt-20">
          <div className="bg-[#0f172a] rounded-t-[40px] md:rounded-[40px] p-8 w-full max-w-sm text-center relative border border-white/10 shadow-2xl animate-in slide-in-from-bottom-10 duration-500">
             <button onClick={() => setShowAffiliateModal(false)} className="absolute top-4 right-4 text-slate-500 font-bold p-2">✕</button>
             <div className="text-5xl mb-6">💰</div>
             <h2 className="text-2xl font-black text-white mb-3 tracking-tighter">Seja um Afiliado</h2>
             <p className="text-slate-400 text-sm mb-8 leading-relaxed">
               Transforme suas idas à praia ou quiosques em renda recorrente. Ofereça tecnologia e ganhe por cada transação que seu indicado fizer.
             </p>
             <Link
               href="/afiliados"
               className="block w-full py-4 rounded-2xl text-white font-black text-sm transition-all mb-4"
               style={{ backgroundColor: P, boxShadow: `0 8px 30px ${P}40` }}
             >
               Ver Detalhes do Programa
             </Link>
             <button onClick={() => setShowAffiliateModal(false)} className="text-slate-500 text-xs font-bold hover:text-white transition-colors">Talvez mais tarde</button>
          </div>
        </div>
      )}

      {/* Success Modal (Simulation) */}
      {showSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95 duration-300">
             <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
             </div>
             <h2 className="text-2xl font-black text-slate-900 mb-2">Pedido Confirmado!</h2>
             <p className="text-slate-500 text-sm mb-8 leading-relaxed">
               Excelente escolha! O quiosque já recebeu seu pedido e começou a preparar.
             </p>
             <button
               onClick={() => setShowSuccess(false)}
               className="w-full py-4 rounded-2xl text-white font-black shadow-lg transition-transform active:scale-95"
               style={{ backgroundColor: P, boxShadow: `0 8px 20px ${P}40` }}
             >
               Ver Meus Pedidos
             </button>
          </div>
        </div>
      )}
    </main>
  );
}

function OrderCard({ order, isPast }: { order: OrderWithVendor; isPast?: boolean }) {
  const statusColor = order.status === 'ready' ? '#22c55e' : order.status === 'cancelled' ? '#ef4444' : P;

  return (
    <Link 
      href={`/order/${order.id}`}
      className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm block active:scale-[0.98] transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-xl overflow-hidden border border-slate-100">
             {order.vendors?.logo_url ? (
               <img src={order.vendors.logo_url} className="w-full h-full object-cover" />
             ) : '🍽️'}
          </div>
          <div>
            <h3 className="font-bold text-slate-900 leading-none">{order.vendors?.name}</h3>
            <span className="text-[10px] font-black text-slate-300 tracking-tighter uppercase">PEDIDO #{order.pickup_code}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="font-black text-slate-900 leading-none mb-1">{formatCurrency(order.total_price)}</p>
          <span 
            className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider"
            style={{ backgroundColor: statusColor + '10', color: statusColor }}
          >
            {ORDER_STATUS_LABEL[order.status]}
          </span>
        </div>
      </div>
      
      {!isPast && (
        <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">Ver detalhes e código QR</span>
          <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </div>
      )}
    </Link>
  );
}
