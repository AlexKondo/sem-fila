'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import { Bell, CheckCircle } from 'lucide-react';

interface WaiterCall {
  id: string;
  vendor_id: string;
  table_number: string;
  status: string;
  created_at: string;
}

interface ReadyOrder {
  id: string;
  pickup_code: string;
  table_number: string | null;
  total_price: number;
  created_at: string;
  order_items: { id: string; quantity: number; menu_items: { name: string } | null }[];
}

interface Props {
  initialReadyOrders: ReadyOrder[];
  initialWaiterCalls: WaiterCall[];
  vendorId: string;
}

export default function WaiterBoard({ initialReadyOrders, initialWaiterCalls, vendorId }: Props) {
  const [orders, setOrders] = useState<ReadyOrder[]>(initialReadyOrders);
  const [calls, setCalls] = useState<WaiterCall[]>(initialWaiterCalls);
  const [isAlerting, setIsAlerting] = useState(false);

  useEffect(() => {
    if (isAlerting) {
      // Vibra em dispositivos suportados (ex: Android) - [vibrar, pausa, vibrar...]
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 200, 100, 200]);
      }
      const timer = setTimeout(() => setIsAlerting(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isAlerting]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`waiter-${vendorId}`)
      // Novos pedidos prontos com mesa
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `vendor_id=eq.${vendorId}` }, async (payload) => {
        const updated = payload.new;
        if (updated.status === 'ready' && updated.table_number) {
          const { data } = await supabase
            .from('orders')
            .select(`*, order_items(id, quantity, menu_items(name))`)
            .eq('id', updated.id)
            .single();
          if (data) setOrders((prev) => [data as ReadyOrder, ...prev.filter((o) => o.id !== data.id)]);
          try { new Audio('/sounds/bell.mp3').play(); } catch {}
        } else if (updated.status === 'delivered') {
          setOrders((prev) => prev.filter((o) => o.id !== updated.id));
        }
      })
      // Novas chamadas de garçom
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'waiter_calls', filter: `vendor_id=eq.${vendorId}` }, (payload) => {
        setCalls((prev) => prev.some(c => c.id === payload.new.id) ? prev : [payload.new as WaiterCall, ...prev]);
        setIsAlerting(true); // Ativa o alarme visual/vibratório
        try { new Audio('/sounds/bell.mp3').play(); } catch {}
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'waiter_calls', filter: `vendor_id=eq.${vendorId}` }, (payload) => {
        const updated = payload.new as WaiterCall;
        if (updated.status === 'attended') {
          setCalls((prev) => prev.filter((c) => c.id !== updated.id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [vendorId]);

  async function markDelivered(orderId: string) {
    const supabase = createClient();
    await supabase.from('orders').update({ status: 'delivered' }).eq('id', orderId);
  }

  async function attendCall(callId: string) {
    const supabase = createClient();
    await supabase.from('waiter_calls').update({ status: 'attended' }).eq('id', callId);
  }

  return (
    <>
      {isAlerting && (
        <div className="fixed inset-0 z-[9999] bg-red-600 flex flex-col items-center justify-center p-8 animate-pulse text-white text-center">
           <Bell className="w-32 h-32 mb-6" />
           <h2 className="text-5xl font-black mb-4 uppercase italic">Chamar Garçom!</h2>
           <p className="text-2xl font-bold opacity-90">Nova chamada em mesa pendente</p>
        </div>
      )}
      <div className="max-w-lg mx-auto px-4 py-4 space-y-6">
      {/* Chamadas de garçom */}
      {calls.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-orange-600 uppercase tracking-wide mb-3">
            <Bell className="w-4 h-4 animate-bounce" />
            Chamadas de garçom ({calls.length})
          </h2>
          <div className="space-y-2">
            {calls.map((call) => (
              <div key={call.id} className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-orange-700 text-lg">Mesa {call.table_number}</p>
                  <p className="text-xs text-orange-500">{formatDate(call.created_at)}</p>
                </div>
                <button
                  onClick={() => attendCall(call.id)}
                  className="bg-orange-500 text-white text-sm px-3 py-1.5 rounded-xl hover:bg-orange-600 transition"
                >
                  Atendido
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pedidos prontos para entrega */}
      <section>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-green-600 uppercase tracking-wide mb-3">
          <CheckCircle className="w-4 h-4" />
          Pronto para entregar ({orders.length})
        </h2>
        {orders.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">✅</p>
            <p className="text-sm">Nenhum pedido aguardando entrega.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-2xl shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-bold text-gray-900">#{order.pickup_code}</p>
                    {order.table_number && (
                      <p className="text-orange-600 font-semibold text-sm">Mesa {order.table_number}</p>
                    )}
                  </div>
                  <button
                    onClick={() => markDelivered(order.id)}
                    className="bg-green-500 text-white text-sm px-3 py-1.5 rounded-xl hover:bg-green-600 transition font-medium"
                  >
                    Entregue
                  </button>
                </div>
                <div className="text-xs text-gray-500 space-y-0.5">
                  {order.order_items.map((item) => (
                    <p key={item.id}>{item.quantity}x {item.menu_items?.name ?? 'Item'}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
    </>
  );
}
