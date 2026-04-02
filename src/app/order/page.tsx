'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft, Clock, CheckCircle, Package, Receipt, ShoppingBag, ChevronDown } from 'lucide-react';
import BottomNav from '@/components/ui/BottomNav';

interface Extra {
  name: string;
  price: number;
}

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  extras?: Extra[] | null;
  menu_items: { name: string } | null;
}

interface Order {
  id: string;
  pickup_code: string;
  status: string;
  payment_status: string;
  total_price: number;
  created_at: string;
  vendors: { name: string } | null;
  order_items?: OrderItem[];
}

const STATUS_STEPS = [
  { key: 'received',     label: 'Recebido'     },
  { key: 'preparing',    label: 'Preparando'   },
  { key: 'almost_ready', label: 'Quase Pronto' },
  { key: 'ready',        label: 'Pronto'       },
  { key: 'delivered',    label: 'Entregue'     },
];

const P = '#ec5b13';

export default function OrderPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [itemsMap, setItemsMap] = useState<Record<string, OrderItem[]>>({});
  const supabase = createClient();

  useEffect(() => {
    async function loadOrders() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsGuest(true); setLoading(false); return; }

      const { data } = await supabase
        .from('orders')
        .select(`
          id, pickup_code, status, payment_status, total_price, created_at,
          vendors ( name )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) setOrders(data as any);
      setLoading(false);
    }

    loadOrders();

    const channel = supabase
      .channel('customer-orders')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => loadOrders())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function handleExpand(orderId: string) {
    if (expandedId === orderId) { setExpandedId(null); return; }
    setExpandedId(orderId);

    if (!itemsMap[orderId]) {
      const { data } = await supabase
        .from('order_items')
        .select('id, quantity, unit_price, extras, menu_items(name)')
        .eq('order_id', orderId);
      if (data) setItemsMap(prev => ({ ...prev, [orderId]: data as any }));
    }
  }

  const getStatusConfig = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'received':     return { label: 'Pago',              color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: Clock };
      case 'preparing':    return { label: 'Em Preparo',        color: 'bg-blue-50 text-blue-700 border-blue-200',       icon: Package };
      case 'almost_ready': return { label: 'Quase Pronto',      color: 'bg-orange-50 text-orange-600 border-orange-200', icon: Package };
      case 'ready':        return { label: 'Pronto p/ Retirada',color: 'bg-green-50 text-green-700 border-green-200',    icon: CheckCircle };
      case 'delivered':    return { label: 'Entregue',          color: 'bg-gray-100 text-gray-600 border-gray-200',      icon: CheckCircle };
      default:             return { label: status || 'Processando', color: 'bg-gray-50 text-gray-500 border-gray-100',   icon: Receipt };
    }
  };

  const getStepIndex = (status: string) =>
    STATUS_STEPS.findIndex(s => s.key === status?.toLowerCase());

  const activeOrders = orders.filter(o => o.status !== 'delivered');
  const pastOrders   = orders.filter(o => o.status === 'delivered');

  function OrderCard({ order, compact = false }: { order: Order; compact?: boolean }) {
    const statusInfo = getStatusConfig(order.status);
    const Icon = statusInfo.icon;
    const isOpen = expandedId === order.id;
    const stepIdx = getStepIndex(order.status);
    const items = itemsMap[order.id];

    return (
      <div
        className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border transition-all ${
          isOpen ? 'border-orange-200 dark:border-orange-500/30' : 'border-slate-100 dark:border-slate-700'
        } ${compact ? 'opacity-75' : ''}`}
      >
        {/* Header — clicável */}
        <button
          onClick={() => handleExpand(order.id)}
          className="w-full p-4 flex items-center justify-between text-left"
        >
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900 dark:text-white truncate">
              {(order.vendors as any)?.name || 'Barraca'}
            </p>
            <p className="text-xs text-slate-400">
              Senha: <span className="font-mono font-bold text-slate-600 dark:text-slate-300">#{order.pickup_code}</span>
              {compact && (
                <span className="ml-2">
                  • {new Date(order.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!compact && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${statusInfo.color}`}>
                <Icon className="w-3.5 h-3.5" />
                {statusInfo.label}
              </span>
            )}
            {compact && (
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                R$ {Number(order.total_price).toFixed(2)}
              </span>
            )}
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
          </div>
        </button>

        {/* Expanded content */}
        {isOpen && (
          <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-700 space-y-4 pt-3">

            {/* Barra de progresso de status */}
            {!compact && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  {STATUS_STEPS.map((step, i) => {
                    const done = i <= stepIdx;
                    const active = i === stepIdx;
                    return (
                      <div key={step.key} className="flex flex-col items-center flex-1">
                        <div className="w-full flex items-center">
                          {i > 0 && (
                            <div
                              className="flex-1 h-0.5 transition-colors"
                              style={{ backgroundColor: i <= stepIdx ? P : '#e2e8f0' }}
                            />
                          )}
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all"
                            style={{
                              backgroundColor: done ? P : '#e2e8f0',
                              transform: active ? 'scale(1.2)' : 'scale(1)',
                            }}
                          >
                            {done && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          {i < STATUS_STEPS.length - 1 && (
                            <div
                              className="flex-1 h-0.5 transition-colors"
                              style={{ backgroundColor: i < stepIdx ? P : '#e2e8f0' }}
                            />
                          )}
                        </div>
                        <span
                          className="text-[9px] font-bold mt-1 text-center leading-tight"
                          style={{ color: done ? P : '#94a3b8' }}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Itens do pedido */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Itens</p>
              {!items ? (
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-orange-500" />
                  Carregando...
                </div>
              ) : items.length === 0 ? (
                <p className="text-xs text-slate-400">Nenhum item encontrado.</p>
              ) : (
                <div className="space-y-2">
                  {items.map(item => {
                    const extraGroups = (item.extras ?? []).reduce<Record<string, { price: number; qty: number }>>((acc, e) => {
                      if (!acc[e.name]) acc[e.name] = { price: e.price, qty: 0 };
                      acc[e.name].qty++;
                      return acc;
                    }, {});
                    return (
                      <div key={item.id}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-700 dark:text-slate-300">
                            <span className="font-bold text-slate-500 dark:text-slate-400 mr-1">{item.quantity}×</span>
                            {(item.menu_items as any)?.name || '—'}
                          </span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            R$ {(Number(item.unit_price) * item.quantity).toFixed(2)}
                          </span>
                        </div>
                        {Object.entries(extraGroups).map(([name, { price, qty }]) => (
                          <div key={name} className="flex items-center justify-between text-xs pl-4 mt-0.5">
                            <span className="text-red-400">+ {qty}× {name}</span>
                            <span className="text-slate-400">R$ {(price * qty).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Total */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
              <span className="text-sm text-slate-500">Valor total</span>
              <span className="font-black text-base" style={{ color: P }}>
                R$ {Number(order.total_price).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Footer resumo (fechado, só ativos) */}
        {!isOpen && !compact && (
          <div className="border-t border-slate-50 dark:border-slate-700/50 px-4 pb-3 pt-2 flex items-center justify-between text-sm">
            <span className="text-slate-500">Valor total</span>
            <span className="font-black" style={{ color: P }}>R$ {Number(order.total_price).toFixed(2)}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-700 px-6 py-4 flex items-center gap-4">
        <Link href="/scan" className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Meus Pedidos</h1>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 pb-[120px] space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-4" />
            <p>Carregando pedidos...</p>
          </div>
        ) : isGuest ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
            <ShoppingBag className="w-16 h-16 text-slate-300 mb-4" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">Faça login para ver seus pedidos</h2>
            <p className="text-sm text-slate-500 mb-8">Entre na sua conta para acompanhar o histórico de pedidos.</p>
            <Link href="/login?redirect=/order" className="px-6 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition shadow-lg shadow-orange-200">
              Entrar
            </Link>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
            <ShoppingBag className="w-16 h-16 text-slate-300 mb-4" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">Nenhum pedido ainda</h2>
            <p className="text-sm text-slate-500 mb-8">Escaneie o código de uma barraca para fazer seu primeiro pedido!</p>
            <Link href="/scan" className="px-6 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition shadow-lg shadow-orange-200">
              Iniciar Pedido
            </Link>
          </div>
        ) : (
          <>
            {activeOrders.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">
                  Em andamento ({activeOrders.length})
                </h2>
                {activeOrders.map(order => <OrderCard key={order.id} order={order} />)}
              </section>
            )}

            {pastOrders.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">
                  Histórico Anterior
                </h2>
                {pastOrders.map(order => <OrderCard key={order.id} order={order} compact />)}
              </section>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
