'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate, ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from '@/lib/utils';
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
    order_items: {
      id: string;
      quantity: number;
      unit_price: number;
      extras?: { name: string; price: number }[];
      menu_items: { id: string; name: string } | null;
    }[];
};

const STATUS_ORDER: OrderStatus[] = ['received', 'preparing', 'almost_ready', 'ready'];
const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  received: 'preparing',
  preparing: 'almost_ready',
  almost_ready: 'ready',
  ready: 'delivered',
};

type DateFilter = 'today' | 'yesterday' | '7days' | '30days' | 'custom';

const DATE_FILTER_LABELS: Record<DateFilter, string> = {
  today: 'Hoje',
  yesterday: 'Ontem',
  '7days': '7 dias',
  '30days': '30 dias',
  custom: 'Período',
};

function getFilterDate(filter: DateFilter, customDate?: string): Date {
  const d = new Date();
  switch (filter) {
    case 'yesterday': d.setDate(d.getDate() - 1); d.setHours(0,0,0,0); return d;
    case '7days': d.setDate(d.getDate() - 7); d.setHours(0,0,0,0); return d;
    case '30days': d.setDate(d.getDate() - 30); d.setHours(0,0,0,0); return d;
    case 'custom': return customDate ? new Date(customDate + 'T00:00:00') : (d.setHours(0,0,0,0), d);
    default: d.setHours(0,0,0,0); return d;
  }
}

interface Props {
  initialOrders: OrderWithItems[];
  vendorId: string;
}

export default function VendorOrdersBoard({ initialOrders, vendorId }: Props) {
  const [orders, setOrders] = useState<OrderWithItems[]>(initialOrders);
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [customDate, setCustomDate] = useState('');
  const [loadingFilter, setLoadingFilter] = useState(false);
  const [alertOrder, setAlertOrder] = useState<OrderWithItems | null>(null);

  // Recarrega pedidos quando o filtro de data muda
  useEffect(() => {
    if (dateFilter === 'today') {
      // "Hoje" usa os dados iniciais do server
      return;
    }
    async function fetchOrders() {
      setLoadingFilter(true);
      const supabase = createClient();
      const since = getFilterDate(dateFilter, customDate);
      const { data } = await supabase.rpc('get_vendor_orders', {
        p_vendor_id: vendorId,
        p_since: since.toISOString(),
      });
      setOrders((data || []) as any[]);
      setLoadingFilter(false);
    }
    fetchOrders();
  }, [dateFilter, customDate, vendorId]);

  // Realtime — escuta novos pedidos e atualizações
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`vendor-orders-${vendorId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `vendor_id=eq.${vendorId}`,
        },
        async (payload) => {
          // Só adiciona se o pedido já nascer PAGO (ex: Dinheiro ou Cartão OK)
          if (payload.new.payment_status !== 'paid') return;

          // Busca o pedido completo via RPC
          const { data: rpcData } = await supabase.rpc('get_vendor_orders', {
            p_vendor_id: vendorId,
            p_since: new Date(payload.new.created_at).toISOString(),
          });
          const newOrder = (rpcData as any[] || []).find((o: any) => o.id === payload.new.id);
          if (newOrder) {
            setOrders((prev) => {
              if (prev.some(o => o.id === newOrder.id)) return prev;
              const next = [...prev, newOrder as any].sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
              return next;
            });
            
            // Alerta visual e sonoro imediato
            setAlertOrder(newOrder as OrderWithItems);
            playNewOrderSound();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `vendor_id=eq.${vendorId}`,
        },
        async (payload) => {
          const updated = payload.new as any;
          
          // Se o pedido está pago, garantimos que ele está na lista e disparamos alerta
          if (updated.payment_status === 'paid') {
              setOrders((prev) => {
                  const exists = prev.some(o => o.id === updated.id);
                  if (exists) {
                      return prev.map(o => o.id === updated.id ? { ...o, ...updated } as any : o);
                  }
                  
                  // Se não existe na lista, precisamos buscá-lo completo para adicionar
                  // Mas como o setOrders é síncrono, faremos o fetch fora e atualizaremos de novo
                  return prev;
              });

              // Verifica se já temos este pedido na lista local
              // Se não tivermos, buscamos e disparamos o alarme
              const alreadyInList = (await new Promise(resolve => {
                  setOrders(prev => {
                      resolve(prev.some(o => o.id === updated.id));
                      return prev;
                  });
              }));

              if (!alreadyInList) {
                  const { data: rpcData } = await supabase.rpc('get_vendor_orders', {
                    p_vendor_id: vendorId,
                    p_since: new Date(updated.created_at).toISOString(),
                  });
                  const fullOrder = (rpcData as any[] || []).find((o: any) => o.id === updated.id);
                  if (fullOrder) {
                    setOrders(prev => [...prev, fullOrder as any].sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
                    setAlertOrder(fullOrder as any);
                    playNewOrderSound();
                  }
              }
          }

          // Atualização de estado para cancelamentos
          if (updated.status === 'cancelled') {
            setOrders((prev) => prev.filter((o) => o.id !== updated.id));
          } else {
            setOrders((prev) => prev.map((o) => o.id === updated.id ? { ...o, ...updated } as any : o));
          }
        }
      )
      .subscribe();

    function playNewOrderSound() {
      try {
        if (typeof window !== 'undefined') {
          const enabled = localStorage.getItem('vendor_alerts_enabled') !== 'false';
          if (!enabled) return;
        }
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
        audio.play().catch(() => {});
      } catch {}
    }

    return () => { supabase.removeChannel(channel); };
  }, [vendorId]);

  async function advanceStatus(orderId: string, nextStatus: OrderStatus) {
    // Atualiza a UI imediatamente (otimista) para resposta instantânea
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
        // Reverte o estado em caso de falha
        const supabase = createClient();
        const { data: order } = await supabase.from('orders').select('status').eq('id', orderId).single();
        if (order) setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: order.status } : o));
      }
    } catch (e) {
      console.error('Erro de rede ao atualizar status:', e);
    }
  }

  async function cancelOrder(orderId: string) {
    const order = orders.find(o => o.id === orderId);
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
    <div className="max-w-5xl mx-auto px-4 mb-4">
      <div className="flex items-center gap-2 flex-wrap">
        {(Object.keys(DATE_FILTER_LABELS) as DateFilter[]).filter(k => k !== 'custom').map(key => (
          <button
            key={key}
            onClick={() => { setDateFilter(key); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              dateFilter === key
                ? 'bg-orange-500 text-white shadow-sm'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {DATE_FILTER_LABELS[key]}
          </button>
        ))}
        <input
          type="date"
          value={customDate}
          onChange={e => { setCustomDate(e.target.value); setDateFilter('custom'); }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
            dateFilter === 'custom'
              ? 'border-orange-500 bg-orange-50 text-orange-600'
              : 'border-slate-200 bg-slate-100 text-slate-500'
          }`}
        />
        {loadingFilter && (
          <svg className="w-4 h-4 animate-spin text-orange-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
        )}
      </div>
    </div>
  );

  if (orders.length === 0) {
    return (
      <>
        {alertOrder && (
          <div 
            onClick={() => setAlertOrder(null)}
            className="fixed inset-0 z-[10000] bg-green-600 flex flex-col items-center justify-center p-8 text-white text-center cursor-pointer animate-in fade-in zoom-in duration-300"
          >
            <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center mb-8 animate-bounce">
              <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-4xl font-black uppercase tracking-widest mb-2">Novo Pedido Recebido!</h2>
            <p className="text-xl font-bold opacity-80 mb-8">O pagamento foi confirmado e o pedido já está na fila.</p>
            <div className="bg-white text-green-700 px-12 py-8 rounded-[40px] shadow-2xl space-y-2">
                <p className="text-sm font-black uppercase tracking-widest opacity-60">Código do Pedido</p>
                <p className="text-7xl font-black italic">{alertOrder.pickup_code}</p>
            </div>
            <button className="mt-12 bg-white/10 hover:bg-white/20 px-8 py-3 rounded-full font-bold uppercase tracking-widest transition-all">
              Toque para fechar e ver detalhes
            </button>
          </div>
        )}
        {filterBar}
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <p className="text-5xl mb-4">🍳</p>
          <p className="text-lg font-medium">Nenhum pedido na fila</p>
          <p className="text-sm mt-1">Aguardando novos clientes...</p>
        </div>
      </>
    );
  }

  // Cria um mapeamento de id -> número sequencial (Mais antigo = #1)
  const orderNumbers: Record<string, number> = {};
  [...orders].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .forEach((o, i) => { orderNumbers[o.id] = i + 1; });

  const activeOrders = orders
    .filter((o) => !['delivered', 'cancelled'].includes(o.status))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const historicalOrders = orders
    .filter((o) => o.status === 'delivered' || (o.status === 'cancelled' && (o as any).payment_status === 'paid'))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <>
    {alertOrder && (
      <div 
        onClick={() => setAlertOrder(null)}
        className="fixed inset-0 z-[10000] bg-green-600 flex flex-col items-center justify-center p-8 text-white text-center cursor-pointer animate-in fade-in zoom-in duration-300"
      >
        <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center mb-8 animate-bounce">
          <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-4xl font-black uppercase tracking-widest mb-2">Novo Pedido Recebido!</h2>
        <p className="text-xl font-bold opacity-80 mb-8">O pagamento foi confirmado e o pedido já está na fila.</p>
        <div className="bg-white text-green-700 px-12 py-8 rounded-[40px] shadow-2xl space-y-2">
            <p className="text-sm font-black uppercase tracking-widest opacity-60">Código do Pedido</p>
            <p className="text-7xl font-black italic">{alertOrder.pickup_code}</p>
        </div>
        <button className="mt-12 bg-white/10 hover:bg-white/20 px-8 py-3 rounded-full font-bold uppercase tracking-widest transition-all">
          Toque para fechar e ver detalhes
        </button>
      </div>
    )}
    {filterBar}
    <div className="max-w-5xl mx-auto px-4 py-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Coluna da Esquerda: Fila em Tempo Real */}
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-2">
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
              />
            ))}
            
            {activeOrders.length === 0 && (
              <div className="text-center py-16 bg-white border-2 border-dashed border-slate-100 rounded-[32px]">
                <p className="text-4xl mb-3">🍳</p>
                <p className="font-bold text-slate-900">Nenhum pedido na fila</p>
                <p className="text-xs text-slate-400">Aguardando novos clientes...</p>
              </div>
            )}
          </div>
        </div>

        {/* Coluna da Direita: Histórico de Entregues */}
        <div>
           <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
              Histórico • Concluídos ({historicalOrders.length})
            </h2>
            <div className="space-y-3">
              {historicalOrders.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Nenhum pedido processado ainda.</p>
              ) : (
                historicalOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    orderNumber={orderNumbers[order.id]}
                    onAdvance={advanceStatus}
                    onCancel={cancelOrder}
                  />
                ))
              )}
            </div>
           </div>
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
}: {
  order: OrderWithItems;
  orderNumber: number;
  onAdvance: (id: string, next: OrderStatus) => void;
  onCancel: (id: string) => void;
}) {
  const nextStatus = NEXT_STATUS[order.status];
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  async function handleAdvance() {
    if (!nextStatus) return;
    setLoading(true);
    await onAdvance(order.id, nextStatus);
    setLoading(false);
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

  // Calculo de tempo percorrido
  const startMs = new Date(order.created_at).getTime();
  const endMs = isDelivered ? (order.updated_at ? new Date(order.updated_at).getTime() : Date.now()) : null;
  const timeDiffSec = endMs ? Math.floor((endMs - startMs) / 1000) : null;
  const mins = timeDiffSec ? Math.floor(timeDiffSec / 60) : 0;
  const secs = timeDiffSec ? timeDiffSec % 60 : 0;

  return (
    <div 
      className={`bg-white rounded-2xl shadow-sm p-4 cursor-pointer transition-all border border-slate-100 ${isDelivered ? 'opacity-75 bg-slate-50 shadow-none hover:shadow-none' : 'hover:shadow-md'}`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-black text-gray-900 text-lg">{clientName}</span>
            <span className="text-xs text-orange-600 font-black bg-orange-50 px-2 py-0.5 rounded-full">#{orderNumber}</span>
            {order.table_number && (
              <span className="text-xs font-black bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">
                {order.table_number === 'Para Viagem' ? '🛍️ Para Viagem' : `🛋️ Mesa ${order.table_number}`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-gray-400">
              Criado às {new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
            {order.pickup_code && (
              <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                {order.pickup_code}
              </span>
            )}
            {isDelivered && timeDiffSec !== null && (
              <span className="text-xs font-mono font-bold text-slate-500 bg-slate-200/50 px-1.5 rounded" title="Tempo total de preparo">
                ⏱️ {mins}m {secs}s
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ORDER_STATUS_COLOR[order.status]}`}>
            {ORDER_STATUS_LABEL[order.status]}
          </span>
          <p className="text-sm font-black text-slate-800 tracking-tight">{formatCurrency(order.total_price)}</p>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-3 border-t border-slate-100 space-y-3" onClick={e => e.stopPropagation()}>
          {/* Itens */}
          <div className="space-y-1">
            {order.order_items.map((item) => (
              <div key={item.id} className="border-b border-slate-50 last:border-0 pb-1.5 mb-1.5 last:pb-0 last:mb-0">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-900 font-bold">
                    {item.quantity}x {item.menu_items?.name ?? 'Item'}
                  </span>
                  <span className="text-gray-500 font-medium">
                    {formatCurrency(item.unit_price * item.quantity)}
                  </span>
                </div>
                {item.extras && item.extras.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.extras.map((e, idx) => (
                      <span key={idx} className="text-[10px] font-black text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                        + {e.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {realNotes && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-1.5 ">
              💬 {realNotes}
            </p>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="font-bold text-gray-900">{formatCurrency(order.total_price)}</span>
            <div className="flex items-center gap-3">
              {timeDiffSec !== null && (
                <span className="text-xs font-mono font-medium text-slate-500 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {mins}m {secs}s
                </span>
              )}
              {order.status !== 'delivered' && (
                <button
                  onClick={(e) => { e.stopPropagation(); onCancel(order.id); }}
                  className="text-xs text-red-500 border border-red-200 px-3 py-1.5 rounded-xl hover:bg-red-50 transition"
                >
                  Cancelar
                </button>
              )}
              {nextStatus && (
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
        <div className="mt-2 text-center text-slate-400 text-[10px] font-semibold border-t border-dashed border-slate-100 pt-1.5">
          Clique para ver os itens 📂
        </div>
      )}
    </div>
  );
}
