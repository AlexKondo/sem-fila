'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from '@/lib/utils';
import { CheckCircle, Clock, ChefHat, Bell, Package } from 'lucide-react';
import type { OrderStatus } from '@/types/database';

const STATUS_STEPS: OrderStatus[] = ['received', 'preparing', 'almost_ready', 'ready', 'delivered'];

const STATUS_ICON: Record<string, React.ElementType> = {
  received: Clock,
  preparing: ChefHat,
  almost_ready: Bell,
  ready: Package,
  delivered: CheckCircle,
};

interface OrderTrackerProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialOrder: any;
}

export default function OrderTracker({ initialOrder }: OrderTrackerProps) {
  const [order, setOrder] = useState(initialOrder);

  // Realtime subscription — atualiza sem refresh
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`order-${order.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${order.id}`,
        },
        (payload) => {
          setOrder((prev: typeof initialOrder) => ({ ...prev, ...payload.new }));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [order.id]);

  const currentIdx = STATUS_STEPS.indexOf(order.status as OrderStatus);
  const isCancelled = order.status === 'cancelled';

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-lg mx-auto">
          <p className="text-xs text-gray-500 mb-1">{order.vendors?.name}</p>
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-gray-900">Pedido #{order.pickup_code}</h1>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${ORDER_STATUS_COLOR[order.status as OrderStatus] ?? 'bg-gray-100 text-gray-600'}`}>
              {ORDER_STATUS_LABEL[order.status as OrderStatus] ?? order.status}
            </span>
          </div>
          {order.table_number && (
            <p className="text-sm text-orange-600 mt-1">Mesa {order.table_number}</p>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Stepper de status */}
        {!isCancelled ? (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Acompanhe seu pedido</h2>
            <div className="space-y-4">
              {STATUS_STEPS.filter(s => s !== 'cancelled').map((step, idx) => {
                const Icon = STATUS_ICON[step] ?? Clock;
                const isCompleted = idx < currentIdx;
                const isCurrent = idx === currentIdx;
                return (
                  <div key={step} className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                      isCompleted ? 'bg-green-500' :
                      isCurrent ? 'bg-orange-500 animate-pulse' :
                      'bg-gray-100'
                    }`}>
                      <Icon className={`w-4 h-4 ${isCompleted || isCurrent ? 'text-white' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${isCurrent ? 'text-orange-600' : isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                        {ORDER_STATUS_LABEL[step]}
                      </p>
                    </div>
                    {isCurrent && (
                      <span className="ml-auto text-xs text-orange-500 font-medium animate-pulse">Agora</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
            <p className="text-2xl mb-2">😔</p>
            <p className="font-semibold text-red-700">Pedido cancelado</p>
          </div>
        )}

        {/* Itens do pedido */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Itens</h2>
          <div className="space-y-2">
            {order.order_items?.map((item: {
              id: string; quantity: number; unit_price: number;
              menu_items: { name: string } | null;
            }) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">
                  {item.quantity}x {item.menu_items?.name ?? 'Item'}
                </span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(item.unit_price * item.quantity)}
                </span>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-2 mt-2 flex items-center justify-between">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="font-bold text-orange-500 text-base">
                {formatCurrency(order.total_price)}
              </span>
            </div>
          </div>
        </div>

        {/* Código de retirada */}
        {(order.status === 'ready') && (
          <div className="bg-green-50 border-2 border-green-400 rounded-2xl p-5 text-center">
            <p className="text-sm text-green-700 mb-1">Seu pedido está pronto!</p>
            <p className="text-4xl font-extrabold text-green-600 tracking-widest">
              {order.pickup_code}
            </p>
            <p className="text-xs text-green-600 mt-1">Mostre este código ao retirar</p>
          </div>
        )}

        {order.notes && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">Observações</p>
            <p className="text-sm text-gray-700">{order.notes}</p>
          </div>
        )}
      </div>
    </main>
  );
}
