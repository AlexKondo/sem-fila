'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from '@/lib/utils';
import type { OrderStatus } from '@/types/database';

type OrderWithItems = {
  id: string;
  status: OrderStatus;
  pickup_code: string;
  table_number: string | null;
  total_price: number;
  notes: string | null;
  created_at: string;
  updated_at?: string;
  payment_method?: string;
  payment_status?: string;
  order_items: {
    id: string;
    quantity: number;
    unit_price: number;
    extras?: { name: string; price: number }[];
    menu_items: { id: string; name: string } | null;
  }[];
};

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  received: 'preparing',
  preparing: 'almost_ready',
  almost_ready: 'ready',
  ready: 'delivered',
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Singleton de AudioContext — criado na 1ª interação do usuário e reutilizado.
let _audioCtx: AudioContext | null = null;

function playAlarmBeep() {
  try {
    if (typeof window === 'undefined') return;
    const enabled = localStorage.getItem('vendor_alerts_enabled') !== 'false';
    if (!enabled) return;
    const ctx = _audioCtx;
    if (!ctx) return;
    ctx.resume().then(() => {
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = 880;
        const t = ctx.currentTime + i * 0.35;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.4, t + 0.05);
        gain.gain.linearRampToValueAtTime(0, t + 0.25);
        osc.start(t);
        osc.stop(t + 0.25);
      }
    }).catch(() => {});
  } catch {}
}

interface Props {
  initialOrders: OrderWithItems[];
  vendorId: string;
}

export default function VendorOrdersBoard({ initialOrders, vendorId }: Props) {
  const [orders, setOrders] = useState<OrderWithItems[]>(initialOrders);
  const [dateFrom, setDateFrom] = useState(todayStr());
  const [dateTo, setDateTo] = useState(todayStr());
  const [loadingFilter, setLoadingFilter] = useState(false);
  // alertOrder = novo pedido já pago (PIX/cartão confirmado ou dinheiro após confirmação)
  const [alertOrder, setAlertOrder] = useState<OrderWithItems | null>(null);

  const knownIdsRef = useRef<Set<string>>(new Set(initialOrders.map(o => o.id)));
  const playNewOrderSound = useCallback(() => { playAlarmBeep(); }, []);

  useEffect(() => {
    if (_audioCtx) return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    try {
      _audioCtx = new AudioCtx();
      if (_audioCtx.state === 'suspended') {
        function unlock() { _audioCtx?.resume().catch(() => {}); }
        document.addEventListener('click', unlock, { once: true });
        document.addEventListener('touchstart', unlock, { once: true });
      }
    } catch {}
  }, []);

  const isToday = dateFrom === todayStr() && dateTo === todayStr();
  useEffect(() => {
    if (isToday) return;
    let cancelled = false;
    async function fetchOrders() {
      setLoadingFilter(true);
      const supabase = createClient();
      const since = new Date(dateFrom + 'T00:00:00');
      const { data } = await supabase.rpc('get_vendor_orders', {
        p_vendor_id: vendorId,
        p_since: since.toISOString(),
      });
      if (!cancelled) {
        const untilEnd = new Date(dateTo + 'T23:59:59').getTime();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filtered = ((data || []) as any[]).filter((o: any) => new Date(o.created_at).getTime() <= untilEnd);
        setOrders(filtered);
        setLoadingFilter(false);
      }
    }
    fetchOrders();
    return () => { cancelled = true; };
  }, [dateFrom, dateTo, vendorId, isToday]);

  useEffect(() => {
    const supabase = createClient();
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    async function syncOrders(alertOnNew = false) {
      const since = new Date(dateFrom + 'T00:00:00');
      const { data } = await supabase.rpc('get_vendor_orders', {
        p_vendor_id: vendorId,
        p_since: since.toISOString(),
      });
      if (!data) return;
      const untilEnd = new Date(dateTo + 'T23:59:59').getTime();
      const fresh = (data as OrderWithItems[]).filter(o => new Date(o.created_at).getTime() <= untilEnd);

      if (alertOnNew) {
        // Alarme apenas para pedidos já pagos (PIX/cartão confirmado ou dinheiro após confirmação manual)
        const newPaidOrders = fresh.filter(o =>
          !knownIdsRef.current.has(o.id) &&
          !['delivered', 'cancelled'].includes(o.status) &&
          o.payment_status === 'paid'
        );
        if (newPaidOrders.length > 0) {
          setAlertOrder(newPaidOrders[0]);
          playNewOrderSound();
        }

        // Pedidos em dinheiro recém-chegados aparecem silenciosamente no board (em vermelho)
        // O alarme toca apenas quando o vendor confirmar o pagamento (veja confirmCashPayment)
      }

      knownIdsRef.current = new Set(fresh.map(o => o.id));
      setOrders(fresh);
    }

    const channel = supabase
      .channel(`vendor-orders-${vendorId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `vendor_id=eq.${vendorId}`,
        },
        async (payload) => {
          const eventType = payload.eventType;

          if (eventType === 'DELETE') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setOrders(prev => prev.filter(o => o.id !== (payload.old as any).id));
            return;
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const updated = payload.new as any;

          if (eventType === 'UPDATE') {
            if (updated.status === 'cancelled' || updated.payment_status === 'failed') {
              setOrders(prev => prev.filter(o => o.id !== updated.id));
              return;
            }
            await syncOrders(true);
            return;
          }

          if (eventType === 'INSERT') {
            await syncOrders(true);
          }
        }
      )
      .subscribe();

    pollTimer = setInterval(() => syncOrders(true), 5000);

    return () => {
      supabase.removeChannel(channel);
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [vendorId, dateFrom, dateTo, playNewOrderSound]);

  async function advanceStatus(orderId: string, nextStatus: OrderStatus) {
    setOrders((prev) =>
      prev.map((o) => o.id === orderId ? { ...o, status: nextStatus } : o)
    );

    try {
      const res = await fetch('/api/orders/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, status: nextStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        console.error('Erro ao atualizar status:', data.error);
        const supabase = createClient();
        const { data: order } = await supabase.from('orders').select('status').eq('id', orderId).single();
        if (order) setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: order.status } : o));
      }
    } catch (e) {
      console.error('Erro de rede ao atualizar status:', e);
    }
  }

  async function confirmCashPayment(orderId: string) {
    // Atualiza otimisticamente
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, payment_status: 'paid' } : o));

    try {
      const res = await fetch(`/api/orders/${orderId}/confirm-payment`, { method: 'POST' });
      if (!res.ok) {
        // Reverte em caso de falha
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, payment_status: 'pending' } : o));
        console.error('Erro ao confirmar pagamento em dinheiro');
        return;
      }
      // Dispara alarme de novo pedido confirmado
      const confirmedOrder = orders.find(o => o.id === orderId);
      if (confirmedOrder) {
        setAlertOrder({ ...confirmedOrder, payment_status: 'paid' });
        playNewOrderSound();
      }
    } catch {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, payment_status: 'pending' } : o));
    }
  }

  async function cancelOrder(orderId: string) {
    const order = orders.find(o => o.id === orderId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isPaid = (order as any).payment_status === 'paid';

    let msg = 'Tem certeza que deseja cancelar este pedido?';
    if (isPaid) msg = 'ATENÇÃO: Este pedido já foi PAGO. Se cancelar, você deverá realizar o estorno da transação no painel de pagamentos. Deseja cancelar mesmo assim?';

    if (!confirm(msg)) return;

    const supabase = createClient();
    await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', orderId);
  }

  const filterBar = (
    <div className="max-w-2xl mx-auto px-4 mb-4">
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <label className="text-xs font-bold text-slate-500">De</label>
        <input
          type="date"
          value={dateFrom}
          max={dateTo}
          onChange={e => setDateFrom(e.target.value)}
          className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-400 transition-all"
        />
        <label className="text-xs font-bold text-slate-500">Até</label>
        <input
          type="date"
          value={dateTo}
          min={dateFrom}
          onChange={e => setDateTo(e.target.value)}
          className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-400 transition-all"
        />
        {!isToday && (
          <button
            onClick={() => { setDateFrom(todayStr()); setDateTo(todayStr()); }}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 transition-all"
          >
            Hoje
          </button>
        )}
        {loadingFilter && (
          <svg className="w-4 h-4 animate-spin text-orange-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
        )}
      </div>
    </div>
  );

  // Pedidos confirmados (pagos) primeiro, dinheiro+pendente por último
  const activeOrders = orders
    .filter(o => !['delivered', 'cancelled'].includes(o.status))
    .sort((a, b) => {
      const aWaiting = a.payment_method === 'dinheiro' && a.payment_status === 'pending';
      const bWaiting = b.payment_method === 'dinheiro' && b.payment_status === 'pending';
      if (aWaiting !== bWaiting) return aWaiting ? 1 : -1;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const historicalOrders = orders
    .filter((o) => o.status === 'delivered' || (o.status === 'cancelled' && (o as any).payment_status === 'paid'));

  const orderNumbers: Record<string, number> = {};
  [...orders].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .forEach((o, i) => { orderNumbers[o.id] = i + 1; });

  const alertOverlay = alertOrder && (
    <div
      onClick={() => setAlertOrder(null)}
      className="fixed inset-0 z-[10000] bg-green-600 dark:bg-green-700 flex flex-col items-center justify-center p-8 text-white text-center cursor-pointer animate-in fade-in zoom-in duration-300"
    >
      <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center mb-8 animate-bounce">
        <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-4xl font-black uppercase tracking-widest mb-2">Novo Pedido Recebido!</h2>
      <p className="text-xl font-bold opacity-80 mb-8">O pagamento foi confirmado e o pedido já está na fila.</p>
      <div className="bg-white dark:bg-slate-900 text-green-700 dark:text-green-400 px-12 py-8 rounded-[40px] shadow-2xl space-y-2 border border-white/10 dark:border-slate-800">
        <p className="text-sm font-black uppercase tracking-widest opacity-60">Código do Pedido</p>
        <p className="text-7xl font-black italic">{alertOrder.pickup_code}</p>
      </div>
      <button className="mt-12 bg-white/10 hover:bg-white/20 px-8 py-3 rounded-full font-bold uppercase tracking-widest transition-all">
        Toque para fechar e ver detalhes
      </button>
    </div>
  );

  if (orders.length === 0) {
    return (
      <>
        {alertOverlay}
        {filterBar}
        <div className="flex flex-col items-center justify-center py-24 text-gray-400 dark:text-slate-600">
          <p className="text-5xl mb-4">🍳</p>
          <p className="text-lg font-medium">Nenhum pedido na fila</p>
          <p className="text-sm mt-1">Aguardando novos clientes...</p>
        </div>
      </>
    );
  }

  return (
    <>
      {alertOverlay}
      {filterBar}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-8">
        {/* Fila de Produção */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              Fila de Produção ({activeOrders.length})
            </h2>
          </div>

          <div className="space-y-4">
            {activeOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                orderNumber={orderNumbers[order.id]}
                onAdvance={advanceStatus}
                onCancel={cancelOrder}
                onConfirmCashPayment={confirmCashPayment}
              />
            ))}

            {activeOrders.length === 0 && (
              <div className="text-center py-16 bg-white dark:bg-slate-800 border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-[32px]">
                <p className="text-4xl mb-3">🍳</p>
                <p className="font-bold text-slate-900 dark:text-white">Nenhum pedido na fila</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Aguardando novos clientes...</p>
              </div>
            )}
          </div>
        </div>

        {/* Histórico de Entregues */}
        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4">
          <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">
            Histórico • Concluídos ({historicalOrders.length})
          </h2>
          <div className="space-y-3">
            {historicalOrders.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">Nenhum pedido processado ainda.</p>
            ) : (
              historicalOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  orderNumber={orderNumbers[order.id]}
                  onAdvance={advanceStatus}
                  onCancel={cancelOrder}
                  onConfirmCashPayment={confirmCashPayment}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function OrderCard({
  order,
  orderNumber,
  onAdvance,
  onCancel,
  onConfirmCashPayment,
}: {
  order: OrderWithItems;
  orderNumber: number;
  onAdvance: (id: string, next: OrderStatus) => Promise<void>;
  onCancel: (id: string) => void;
  onConfirmCashPayment: (id: string) => void;
}) {
  const nextStatus = NEXT_STATUS[order.status];
  const [loading, setLoading] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const isCashPending = order.payment_method === 'dinheiro' && order.payment_status === 'pending';

  async function handleAdvance() {
    if (!nextStatus) return;
    setLoading(true);
    await onAdvance(order.id, nextStatus);
    setLoading(false);
  }

  async function handleConfirmCash(e: React.MouseEvent) {
    e.stopPropagation();
    setConfirmingPayment(true);
    await onConfirmCashPayment(order.id);
    setConfirmingPayment(false);
  }

  function getCustomerName(notes: string | null) {
    if (!notes) return 'Cliente';
    const match = notes.match(/Cliente:\s*([^|]+)/);
    return match ? match[1].trim() : 'Cliente';
  }

  function getRealNotes(notes: string | null) {
    if (!notes) return null;
    return notes.split(' | ').filter(p => !p.startsWith('Cliente:') && !p.startsWith('Tel:') && !p.startsWith('Pagamento:')).join(' | ') || null;
  }

  const clientName = getCustomerName(order.notes);
  const realNotes = getRealNotes(order.notes);
  const isDelivered = order.status === 'delivered';

  const startMs = new Date(order.created_at).getTime();
  const endMs = isDelivered ? (order.updated_at ? new Date(order.updated_at).getTime() : Date.now()) : null;
  const timeDiffSec = endMs ? Math.floor((endMs - startMs) / 1000) : null;
  const mins = timeDiffSec ? Math.floor(timeDiffSec / 60) : 0;
  const secs = timeDiffSec ? timeDiffSec % 60 : 0;

  // Estilo do card: vermelho para dinheiro+pendente, verde para dinheiro+pago, normal para o resto
  const cardClass = isCashPending
    ? 'bg-red-50 dark:bg-red-950/30 rounded-2xl shadow-sm p-4 cursor-pointer transition-all border-2 border-red-300 dark:border-red-800 hover:shadow-md'
    : isDelivered
      ? 'bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4 cursor-pointer transition-all border border-slate-100 dark:border-slate-700 opacity-75 bg-slate-50 dark:bg-slate-900/50 shadow-none hover:shadow-none'
      : 'bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4 cursor-pointer transition-all border border-slate-100 dark:border-slate-700 hover:shadow-md';

  return (
    <div className={cardClass} onClick={() => setIsExpanded(!isExpanded)}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-gray-900 dark:text-white text-lg">{clientName}</span>
            <span className="text-xs text-orange-600 font-black bg-orange-50 dark:bg-orange-950/30 px-2 py-0.5 rounded-full">#{orderNumber}</span>
            {order.table_number && (
              <span className="text-xs font-black bg-orange-50 dark:bg-orange-950/30 text-orange-600 px-2 py-0.5 rounded-full">
                {order.table_number === 'Para Viagem' ? '🛍️ Para Viagem' : `🛋️ Mesa ${order.table_number}`}
              </span>
            )}
            {isCashPending && (
              <span className="text-xs font-black bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full animate-pulse">
                💵 Aguardando pagamento
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-gray-400 dark:text-slate-500">
              Criado às {new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
            {order.pickup_code && (
              <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                {order.pickup_code}
              </span>
            )}
            {isDelivered && timeDiffSec !== null && (
              <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-200/50 dark:bg-slate-700 px-1.5 rounded" title="Tempo total de preparo">
                ⏱️ {mins}m {secs}s
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ORDER_STATUS_COLOR[order.status]}`}>
            {ORDER_STATUS_LABEL[order.status]}
          </span>
          <p className="text-sm font-black text-slate-800 dark:text-white tracking-tight">{formatCurrency(order.total_price)}</p>
        </div>
      </div>

      {/* Botão de confirmar pagamento em dinheiro — visível mesmo sem expandir */}
      {isCashPending && (
        <button
          onClick={handleConfirmCash}
          disabled={confirmingPayment}
          className="mt-3 w-full py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-black transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {confirmingPayment ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Confirmando...
            </>
          ) : (
            <>💵 Não pago — clique para confirmar recebimento</>
          )}
        </button>
      )}

      {isExpanded && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 space-y-3" onClick={e => e.stopPropagation()}>
          {/* Itens */}
          <div className="space-y-1">
            {order.order_items.map((item) => (
              <div key={item.id} className="border-b border-slate-50 dark:border-slate-700/50 last:border-0 pb-1.5 mb-1.5 last:pb-0 last:mb-0">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-900 dark:text-slate-200 font-bold">
                    {item.quantity}x {item.menu_items?.name ?? 'Item'}
                  </span>
                  <span className="text-gray-500 dark:text-slate-400 font-medium">
                    {formatCurrency(item.unit_price * item.quantity)}
                  </span>
                </div>
                {item.extras && item.extras.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.extras.map((e, idx) => (
                      <span key={idx} className="text-[10px] font-black text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 px-1.5 py-0.5 rounded uppercase tracking-wider">
                        + {e.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {realNotes && (
            <p className="text-xs text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-900/50 rounded-lg px-3 py-1.5">
              💬 {realNotes}
            </p>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(order.total_price)}</span>
            <div className="flex items-center gap-3">
              {timeDiffSec !== null && (
                <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {mins}m {secs}s
                </span>
              )}
              {order.status !== 'delivered' && (
                <button
                  onClick={(e) => { e.stopPropagation(); onCancel(order.id); }}
                  className="text-xs text-red-500 dark:text-red-400 border border-red-200 dark:border-red-900/30 px-3 py-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 transition"
                >
                  Cancelar
                </button>
              )}
              {/* Avanço de status só disponível após pagamento confirmado */}
              {nextStatus && !isCashPending && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleAdvance(); }}
                  disabled={loading}
                  className="text-xs bg-orange-500 text-white px-3 py-1.5 rounded-xl hover:bg-orange-600 transition disabled:opacity-50 font-bold"
                >
                  {loading ? '...' : ORDER_STATUS_LABEL[nextStatus]}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {!isExpanded && (
        <div className="mt-2 text-center text-slate-400 dark:text-slate-500 text-[10px] font-semibold border-t border-dashed border-slate-100 dark:border-slate-700 pt-1.5">
          Clique para ver os itens 📂
        </div>
      )}
    </div>
  );
}
