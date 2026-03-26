'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, ORDER_STATUS_LABEL, getRealNotes } from '@/lib/utils';
import type { OrderStatus } from '@/types/database';

const PRIMARY = '#ec5b13';

const STATUS_STEPS: OrderStatus[] = ['received', 'preparing', 'almost_ready', 'ready', 'delivered'];

const STATUS_PATHS: Record<string, string> = {
  received: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  preparing: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4',
  almost_ready: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  ready: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8m-9 4h4',
  delivered: 'M5 13l4 4L19 7',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function OrderTracker({ initialOrder }: { initialOrder: any }) {
  const searchParams = useSearchParams();
  const paymentResult = searchParams.get('payment');

  const [order, setOrder] = useState(initialOrder);
  const [showPaymentModal, setShowPaymentModal] = useState(
    paymentResult === 'success' || paymentResult === 'cancelled'
  );
  const [payingStripe, setPayingStripe] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // 1. Realtime subscription para atualizações instantâneas
    const channel = supabase
      .channel(`order-${order.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${order.id}` },
        (payload) => setOrder((prev: typeof initialOrder) => ({ ...prev, ...payload.new }))
      )
      .subscribe();

    // 2. Polling de fallback a cada 4s (garante atualização mesmo se Realtime falhar ou RLS bloquear)
    const poll = setInterval(async () => {
      const { data } = await supabase
        .from('orders')
        .select('status, payment_status')
        .eq('id', order.id)
        .single();
      if (data) {
        setOrder((prev: typeof initialOrder) => ({
          ...prev,
          status: data.status,
          payment_status: data.payment_status,
        }));
      }
    }, 4000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [order.id]);

  const handlePayWithStripe = useCallback(async () => {
    setPayingStripe(true);
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: order.id }),
    });
    const data = await res.json();
    if (data.checkout_url) { window.location.href = data.checkout_url; }
    else { alert(data.error ?? 'Erro ao iniciar pagamento.'); setPayingStripe(false); }
  }, [order.id]);

  function shareOrder() {
    const url = `${window.location.origin}/order/${order.id}`;
    if (navigator.share) { navigator.share({ title: `Pedido #${order.pickup_code}`, url }); }
    else { navigator.clipboard.writeText(url); alert('Link copiado!'); }
  }

  async function handleCancelOrder() {
    if (!confirm('Deseja realmente cancelar este pedido e fazer um novo?')) return;
    setCancelling(true);
    const supabase = createClient();
    await supabase.from('orders').update({ status: 'cancelled' }).eq('id', order.id);
    setCancelling(false);
  }

  useEffect(() => {
    if (paymentResult) {
      if (paymentResult === 'success' && order.payment_status !== 'paid') {
        setOrder((prev: any) => ({ ...prev, payment_status: 'paid' }));
      }
      // Remove o parâmetro ?payment= pra não duplicar quando dar F5
      const url = new URL(window.location.href);
      url.searchParams.delete('payment');
      window.history.replaceState({}, '', url.toString());
    }
  }, [paymentResult, order.payment_status]);

  const currentIdx = STATUS_STEPS.indexOf(order.status as OrderStatus);
  const isCancelled = order.status === 'cancelled';
  const isPaid = order.payment_status === 'paid';
  const needsPayment = order.payment_status === 'pending' && 
                       !['cancelled', 'ready', 'delivered'].includes(order.status);
                       
  const subtotal = order.order_items?.reduce((acc: number, item: any) => acc + (item.unit_price * item.quantity), 0) || 0;
  const hasFees = order.total_price > subtotal + 0.01;

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#f8f6f6', fontFamily: "'Public Sans', sans-serif" }}>
      {/* Payment result modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl">
            {paymentResult === 'success' ? (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">Pagamento confirmado!</h2>
                <p className="text-slate-500 text-sm mb-5">Seu pedido foi pago e está sendo preparado.</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">Pagamento cancelado</h2>
                <p className="text-slate-500 text-sm mb-5">Você pode tentar pagar novamente abaixo.</p>
              </>
            )}
            <button
              onClick={() => setShowPaymentModal(false)}
              className="w-full py-3 rounded-2xl text-white font-semibold"
              style={{ backgroundColor: PRIMARY }}
            >
              Ver meu pedido
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 mb-0.5">{order.vendors?.name}</p>
            <h1 className="text-lg font-bold text-slate-900">Pedido #{order.pickup_code}</h1>
            {order.table_number && (
              <p className="text-xs mt-0.5 font-medium" style={{ color: PRIMARY }}>
                {order.table_number === 'Para Viagem' ? '🛍️ Para Viagem' : `🛋️ Mesa ${order.table_number}`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={shareOrder} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
            <span
              className="text-xs font-bold px-3 py-1.5 rounded-full"
              style={
                isCancelled
                  ? { backgroundColor: '#fee2e2', color: '#b91c1c' }
                  : order.status === 'ready'
                  ? { backgroundColor: '#dcfce7', color: '#15803d' }
                  : { backgroundColor: PRIMARY + '20', color: PRIMARY }
              }
            >
              {isCancelled ? 'Cancelado' : (ORDER_STATUS_LABEL[order.status as OrderStatus] ?? order.status)}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">

        {/* Payment pending — desabilitado até integrar gateway de pagamento real */}
        {/* {needsPayment && ( ... )} */}


        {isPaid && (
          <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm text-green-700 font-medium">Pagamento confirmado</p>
          </div>
        )}

        {/* Pickup code */}
        {order.status === 'ready' && (
          <div className="rounded-2xl p-6 text-center text-white" style={{ backgroundColor: PRIMARY }}>
            <p className="text-white/80 text-sm mb-1">Pronto! Mostre ao atendente</p>
            <p className="text-5xl font-black tracking-widest">{order.pickup_code}</p>
            <p className="text-white/60 text-xs mt-2">Código de retirada</p>
          </div>
        )}

        {/* Stepper */}
        {!isCancelled ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-4">Acompanhe seu pedido</h2>
            <div className="space-y-4">
              {STATUS_STEPS.filter(s => s !== 'cancelled').map((step, idx) => {
                const isCompleted = idx < currentIdx;
                const isCurrent = idx === currentIdx;
                const path = STATUS_PATHS[step];
                return (
                  <div key={step} className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                      style={{ backgroundColor: isCompleted ? '#22c55e' : isCurrent ? PRIMARY : '#f1f5f9' }}
                    >
                      {isCompleted ? (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg
                          className={`w-4 h-4 ${isCurrent ? 'text-white animate-pulse' : 'text-slate-400'}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
                        </svg>
                      )}
                    </div>
                    <p
                      className="text-sm flex-1"
                      style={{
                        color: isCurrent ? PRIMARY : isCompleted ? '#16a34a' : '#94a3b8',
                        fontWeight: isCurrent ? 700 : 500,
                      }}
                    >
                      {ORDER_STATUS_LABEL[step]}
                    </p>
                    
                    {(isCompleted || isCurrent) && (
                      <span className="text-xs text-slate-400 font-medium tracking-tight">
                        {(() => {
                          const date = new Date(order.created_at);
                          // Simula 2 min de avanço por etapa para o layout ficar lindo
                          date.setMinutes(date.getMinutes() + (idx * 2));
                          return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                        })()}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
            <svg className="w-8 h-8 text-red-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <p className="font-semibold text-red-700">Pedido cancelado</p>
          </div>
        )}

        {/* Order summary */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-3">Resumo do pedido</h2>
          <div className="space-y-2.5">
            {order.order_items?.map((item: any) => (
              <div key={item.id} className="pt-2 border-b border-slate-50 pb-2 last:border-0">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-900 font-semibold">{item.quantity}× {item.menu_items?.name ?? 'Item'}</span>
                  <span className="font-bold text-slate-900">{formatCurrency(item.unit_price * item.quantity)}</span>
                </div>
                {item.extras && item.extras.length > 0 && (() => {
                  const grouped: Record<string, { price: number; qty: number }> = {};
                  item.extras.forEach((e: any) => {
                    if (grouped[e.name]) grouped[e.name].qty++;
                    else grouped[e.name] = { price: e.price, qty: 1 };
                  });
                  return (
                    <div className="flex flex-col gap-0.5 mt-1 ml-4 pl-2 border-l-2 border-slate-100">
                      {Object.entries(grouped).map(([name, { price, qty }]) => (
                        <span key={name} className="text-[10px] font-bold text-slate-400">
                          {qty > 1 ? `${qty}x ` : '+'}{name} {formatCurrency(price)}{qty > 1 ? ` = ${formatCurrency(price * qty)}` : ''}
                        </span>
                      ))}
                    </div>
                  );
                })()}
              </div>
            ))}
            
            {hasFees && order.vendors?.service_fee_percentage > 0 && (
              <div className="flex items-center justify-between text-sm text-slate-500 pt-2">
                <span>Taxa de Serviço ({order.vendors.service_fee_percentage}%)</span>
                <span>{formatCurrency((subtotal * order.vendors.service_fee_percentage) / 100)}</span>
              </div>
            )}
            {hasFees && order.vendors?.couvert_fee > 0 && (
              <div className="flex items-center justify-between text-sm text-slate-500 pt-1">
                <span>Couvert Artístico</span>
                <span>{formatCurrency(order.vendors.couvert_fee)}</span>
              </div>
            )}

            <div className="border-t border-slate-100 pt-3 mt-1 flex items-center justify-between">
              <span className="font-bold text-slate-900 text-base">Total Final</span>
              <span className="font-black text-lg" style={{ color: PRIMARY }}>{formatCurrency(order.total_price)}</span>
            </div>
          </div>
        </div>

        {getRealNotes(order.notes) && (
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-xs text-slate-400 font-medium mb-1">Observações</p>
            <p className="text-sm text-slate-700">{getRealNotes(order.notes)}</p>
          </div>
        )}

        <div className="pt-4 pb-12 flex flex-col gap-3">
          <Link 
            href="/"
            className="w-full py-4 rounded-2xl text-center font-black text-slate-700 bg-white border-2 border-slate-100 hover:border-orange-500 hover:text-orange-500 transition-colors shadow-sm"
          >
            FAZER NOVO PEDIDO
          </Link>

          {!isCancelled && !isPaid && (order.status === 'received' || needsPayment) && (
            <button 
              onClick={handleCancelOrder}
              disabled={cancelling}
              className="text-center font-semibold text-slate-400 hover:text-red-500 text-sm py-2 mt-2 disabled:opacity-50 transition"
            >
              {cancelling ? 'Cancelando...' : 'Me arrependi, quero cancelar o pedido'}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
