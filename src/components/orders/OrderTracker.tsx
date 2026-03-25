'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, ORDER_STATUS_LABEL } from '@/lib/utils';
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

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`order-${order.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${order.id}` },
        (payload) => setOrder((prev: typeof initialOrder) => ({ ...prev, ...payload.new }))
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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

  useEffect(() => {
    if (paymentResult === 'success' && order.payment_status !== 'paid') {
      setOrder((prev: any) => ({ ...prev, payment_status: 'paid' }));
    }
  }, [paymentResult, order.payment_status]);

  const currentIdx = STATUS_STEPS.indexOf(order.status as OrderStatus);
  const isCancelled = order.status === 'cancelled';
  const isPaid = order.payment_status === 'paid';
  const needsPayment = order.payment_status === 'pending' && 
                       !['cancelled', 'ready', 'delivered'].includes(order.status);

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
              <p className="text-xs mt-0.5 font-medium" style={{ color: PRIMARY }}>Mesa {order.table_number}</p>
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

        {/* Payment pending */}
        {needsPayment && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-amber-800 text-sm">Pagamento pendente</p>
              <p className="text-xs text-amber-600 mt-0.5">Pague agora para confirmar seu pedido</p>
            </div>
            <button
              onClick={handlePayWithStripe}
              disabled={payingStripe}
              className="flex items-center gap-1.5 text-white text-xs font-bold px-4 py-2.5 rounded-xl disabled:opacity-50 flex-shrink-0"
              style={{ backgroundColor: PRIMARY }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              {payingStripe ? '…' : 'Pagar'}
            </button>
          </div>
        )}

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
            {order.order_items?.map((item: {
              id: string; quantity: number; unit_price: number;
              menu_items: { name: string } | null;
            }) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{item.quantity}× {item.menu_items?.name ?? 'Item'}</span>
                <span className="font-semibold text-slate-900">{formatCurrency(item.unit_price * item.quantity)}</span>
              </div>
            ))}
            <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between">
              <span className="font-bold text-slate-900">Total</span>
              <span className="font-black text-base" style={{ color: PRIMARY }}>{formatCurrency(order.total_price)}</span>
            </div>
          </div>
        </div>

        {order.notes && (
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-xs text-slate-400 font-medium mb-1">Observações</p>
            <p className="text-sm text-slate-700">{order.notes}</p>
          </div>
        )}
      </div>
    </main>
  );
}
