'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import { Bell, CheckCircle, Clock, History } from 'lucide-react';

interface WaiterCall {
  id: string;
  vendor_id: string;
  table_number: string;
  status: 'pending' | 'attended';
  created_at: string;
  attended_at: string | null;
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
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [isAlerting, setIsAlerting] = useState(false);

  useEffect(() => {
    if (isAlerting) {
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
      .channel(`waiter-full-${vendorId}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'orders', 
        filter: `vendor_id=eq.${vendorId}` 
      }, async (payload) => {
        const updated = payload.new;
        if (updated.status === 'ready' && updated.table_number) {
          const { data } = await supabase
            .from('orders')
            .select(`*, order_items(id, quantity, menu_items(name))`)
            .eq('id', updated.id)
            .single();
          if (data) setOrders((prev) => [data as ReadyOrder, ...prev.filter((o) => o.id !== data.id)]);
          playSound();
        } else if (updated.status === 'delivered') {
          setOrders((prev) => prev.filter((o) => o.id !== updated.id));
        }
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'waiter_calls', 
        filter: `vendor_id=eq.${vendorId}` 
      }, async (payload) => {
        // Recarrega as chamadas para garantir consistência e pegar o history
        const { data } = await supabase
          .from('waiter_calls')
          .select('*')
          .eq('vendor_id', vendorId)
          .order('created_at', { ascending: false });
        
        if (data) {
          setCalls(data as WaiterCall[]);
          
          // Se for uma nova chamada (INSERT), ativa o alarme
          if (payload.eventType === 'INSERT') {
            setIsAlerting(true);
            playSound();
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [vendorId]);

  function playSound() {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play();
    } catch (e) {
      console.warn("Não foi possível tocar o som:", e);
    }
  }

  async function markDelivered(orderId: string) {
    const supabase = createClient();
    await supabase.from('orders').update({ status: 'delivered' }).eq('id', orderId);
  }

  async function attendCall(callId: string) {
    const supabase = createClient();
    // Atualiza status e horário de atendimento para o histórico
    await supabase.from('waiter_calls')
      .update({ 
        status: 'attended', 
        attended_at: new Date().toISOString() 
      })
      .eq('id', callId);
  }

  function getDuration(start: string, end: string | null) {
    if (!end) return '...';
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const diff = Math.floor((e - s) / 1000);
    if (diff < 60) return `${diff}s`;
    return `${Math.floor(diff / 60)}m ${diff % 60}s`;
  }

  const pendingCalls = calls.filter(c => c.status === 'pending');
  const historyCalls = calls.filter(c => c.status === 'attended').slice(0, 20);

  return (
    <>
      {isAlerting && (
        <div 
          onClick={() => setIsAlerting(false)}
          className="fixed inset-0 z-[9999] bg-red-600 flex flex-col items-center justify-center p-8 animate-pulse text-white text-center cursor-pointer"
        >
           <Bell className="w-32 h-32 mb-6" />
           <h2 className="text-5xl font-black mb-4 uppercase italic">Chamar Garçom!</h2>
           <p className="text-2xl font-bold opacity-90">Mesa aguardando atendimento</p>
           <p className="mt-8 text-sm opacity-50">Toque para fechar este alerta</p>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 py-2 space-y-6">
        
        {/* Abas Pedidos/Chamadas */}
        <div className="flex bg-gray-100 p-1 rounded-2xl">
          <button 
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'pending' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500'}`}
          >
            <Bell className="w-4 h-4" />
            Pendentes
            {pendingCalls.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full">
                {pendingCalls.length}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'history' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500'}`}
          >
            <History className="w-4 h-4" />
            Histórico
          </button>
        </div>

        {activeTab === 'pending' ? (
          <div className="space-y-6">
            {/* Chamadas Pendentes */}
            <section>
              <h2 className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                Chamadas de mesa ({pendingCalls.length})
              </h2>
              {pendingCalls.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-3xl border border-dashed border-gray-200 text-gray-400">
                  <p className="text-3xl mb-1">🛎️</p>
                  <p className="text-xs">Nenhuma mesa chamando.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingCalls.map((call) => (
                    <div key={call.id} className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                      <div>
                        <p className="font-black text-orange-700 text-xl italic">MESA {call.table_number}</p>
                        <p className="text-[10px] text-orange-400 font-bold uppercase">{formatDate(call.created_at)}</p>
                      </div>
                      <button
                        onClick={() => attendCall(call.id)}
                        className="bg-orange-600 text-white font-black text-xs px-5 py-2.5 rounded-xl hover:bg-orange-700 transition shadow-md shadow-orange-600/20 active:scale-95"
                      >
                        ATENDER
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Pedidos para entrega */}
            <section>
              <h2 className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Pronto para entregar ({orders.length})
              </h2>
              {orders.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-3xl border border-dashed border-gray-200 text-gray-400">
                  <p className="text-3xl mb-1">🏃‍♂️</p>
                  <p className="text-xs">Tudo entregue!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-black text-gray-900">COD: {order.pickup_code}</p>
                          {order.table_number && (
                            <p className="text-orange-600 font-black text-sm italic">MESA {order.table_number}</p>
                          )}
                        </div>
                        <button
                          onClick={() => markDelivered(order.id)}
                          className="bg-green-500 text-white text-[11px] font-black px-4 py-2 rounded-xl hover:bg-green-600 transition shadow-md shadow-green-500/20"
                        >
                          ENTREGUE
                        </button>
                      </div>
                      <div className="text-[11px] text-gray-500 space-y-0.5 border-t border-gray-50 pt-2">
                        {order.order_items.map((item) => (
                          <p key={item.id} className="font-medium">• {item.quantity}x {item.menu_items?.name ?? 'Item'}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : (
          /* Histórico de Atendimentos */
          <section className="space-y-2">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Últimos atendimentos</h3>
            {historyCalls.length === 0 ? (
               <div className="text-center py-12 text-gray-400">Sem histórico hoje.</div>
            ) : (
              <div className="space-y-2">
                {historyCalls.map(call => (
                  <div key={call.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between opacity-80">
                    <div>
                      <p className="font-bold text-gray-800">Mesa {call.table_number}</p>
                      <p className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(call.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">Tempo de Resposta</p>
                      <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {getDuration(call.created_at, call.attended_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </>
  );
}
