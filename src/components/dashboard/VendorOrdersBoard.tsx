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
  order_items: {
    id: string;
    quantity: number;
    unit_price: number;
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

interface Props {
  initialOrders: OrderWithItems[];
  vendorId: string;
}

export default function VendorOrdersBoard({ initialOrders, vendorId }: Props) {
  const [orders, setOrders] = useState<OrderWithItems[]>(initialOrders);

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
          // Busca o pedido completo com itens
          const { data } = await supabase
            .from('orders')
            .select(`*, order_items(id, quantity, unit_price, menu_items(id, name))`)
            .eq('id', payload.new.id)
            .single();
          if (data) {
            setOrders((prev) => [data as OrderWithItems, ...prev]);
            // Notificação sonora (se suportado)
            try { new Audio('/sounds/new-order.mp3').play(); } catch {}
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
        (payload) => {
          const updated = payload.new;
          // Remove da lista se entregue ou cancelado
          if (updated.status === 'delivered' || updated.status === 'cancelled') {
            setOrders((prev) => prev.filter((o) => o.id !== updated.id));
          } else {
            setOrders((prev) =>
              prev.map((o) => o.id === updated.id ? { ...o, ...updated } as OrderWithItems : o)
            );
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [vendorId]);

  async function advanceStatus(orderId: string, nextStatus: OrderStatus) {
    const supabase = createClient();
    await supabase
      .from('orders')
      .update({ status: nextStatus })
      .eq('id', orderId);
  }

  async function cancelOrder(orderId: string) {
    const supabase = createClient();
    await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', orderId);
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <p className="text-5xl mb-4">🎉</p>
        <p className="text-lg font-medium">Fila vazia</p>
        <p className="text-sm mt-1">Novos pedidos aparecerão aqui automaticamente.</p>
      </div>
    );
  }

  // Agrupa por status para a visão kanban
  const grouped = STATUS_ORDER.reduce<Record<string, OrderWithItems[]>>((acc, status) => {
    acc[status] = orders.filter((o) => o.status === status);
    return acc;
  }, {});

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {/* Contador total */}
      <p className="text-sm text-gray-500 mb-4">
        {orders.length} pedido{orders.length !== 1 ? 's' : ''} ativo{orders.length !== 1 ? 's' : ''}
      </p>

      <div className="space-y-6">
        {STATUS_ORDER.map((status) => {
          const statusOrders = grouped[status];
          if (statusOrders.length === 0) return null;

          return (
            <div key={status}>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {ORDER_STATUS_LABEL[status]} ({statusOrders.length})
              </h2>
              <div className="space-y-3">
                {statusOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onAdvance={advanceStatus}
                    onCancel={cancelOrder}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrderCard({
  order,
  onAdvance,
  onCancel,
}: {
  order: OrderWithItems;
  onAdvance: (id: string, next: OrderStatus) => void;
  onCancel: (id: string) => void;
}) {
  const nextStatus = NEXT_STATUS[order.status];
  const [loading, setLoading] = useState(false);

  async function handleAdvance() {
    if (!nextStatus) return;
    setLoading(true);
    await onAdvance(order.id, nextStatus);
    setLoading(false);
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900 text-base">#{order.pickup_code}</span>
            {order.table_number && (
              <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">
                Mesa {order.table_number}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{formatDate(order.created_at)}</p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ORDER_STATUS_COLOR[order.status]}`}>
          {ORDER_STATUS_LABEL[order.status]}
        </span>
      </div>

      {/* Itens */}
      <div className="space-y-1 mb-3">
        {order.order_items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-gray-700">
              {item.quantity}x {item.menu_items?.name ?? 'Item'}
            </span>
            <span className="text-gray-500">
              {formatCurrency(item.unit_price * item.quantity)}
            </span>
          </div>
        ))}
      </div>

      {order.notes && (
        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-1.5 mb-3">
          💬 {order.notes}
        </p>
      )}

      <div className="flex items-center justify-between">
        <span className="font-bold text-gray-900">{formatCurrency(order.total_price)}</span>
        <div className="flex gap-2">
          {order.status !== 'delivered' && (
            <button
              onClick={() => onCancel(order.id)}
              className="text-xs text-red-500 border border-red-200 px-3 py-1.5 rounded-xl hover:bg-red-50 transition"
            >
              Cancelar
            </button>
          )}
          {nextStatus && (
            <button
              onClick={handleAdvance}
              disabled={loading}
              className="text-xs bg-orange-500 text-white px-3 py-1.5 rounded-xl hover:bg-orange-600 transition disabled:opacity-50 font-medium"
            >
              {loading ? '...' : ORDER_STATUS_LABEL[nextStatus]}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
