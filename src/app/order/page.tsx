'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft, Clock, CheckCircle, Package, Receipt, ShoppingBag } from 'lucide-react';

interface Order {
  id: string;
  pickup_code: string;
  status: string;
  payment_status: string;
  total_price: number;
  created_at: string;
  vendors: { name: string } | null;
}

export default function OrderPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadOrders() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
    
    // Escuta atualizações de status em tempo real no Supabase
    const channel = supabase
      .channel('customer-orders')
      .on(
        'postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'orders' }, 
        () => loadOrders()
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusConfig = (status: string) => {
    switch(status?.toLowerCase()) {
      case 'received': return { label: 'Recebido', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: Clock };
      case 'preparing': return { label: 'Em Preparo', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Package };
      case 'almost_ready': return { label: 'Quase Pronto', color: 'bg-orange-50 text-orange-600 border-orange-200', icon: Package };
      case 'ready': return { label: 'Pronto p/ Retirada', color: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle };
      case 'delivered': return { label: 'Entregue', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: CheckCircle };
      default: return { label: status || 'Processando', color: 'bg-gray-50 text-gray-500 border-gray-100', icon: Receipt };
    }
  }

  const activeOrders = orders.filter(o => o.status !== 'delivered');
  const pastOrders = orders.filter(o => o.status === 'delivered');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center gap-4">
        <Link href="/scan" className="p-2 rounded-full hover:bg-slate-100 text-slate-700 transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-slate-900">Meus Pedidos</h1>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-4" />
            <p>Carregando pedidos...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
            <ShoppingBag className="w-16 h-16 text-slate-300 mb-4" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">Nenhum pedido ainda</h2>
            <p className="text-sm text-slate-500 mb-8">
              Escaneie o código de uma barraca para fazer seu primeiro pedido!
            </p>
            <Link
              href="/scan"
              className="px-6 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition shadow-lg shadow-orange-200"
            >
              Iniciar Pedido
            </Link>
          </div>
        ) : (
          <>
            {/* Pedidos Ativos (Se houver) */}
            {activeOrders.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">
                  Em andamento ({activeOrders.length})
                </h2>
                {activeOrders.map(order => {
                  const statusInfo = getStatusConfig(order.status);
                  const Icon = statusInfo.icon;
                  return (
                    <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900">{(order.vendors as any)?.name || 'Barraca'}</p>
                          <p className="text-xs text-slate-400">Senha: <span className="font-mono font-bold text-slate-700">#{order.pickup_code}</span></p>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${statusInfo.color}`}>
                          <Icon className="w-3.5 h-3.5" />
                          {statusInfo.label}
                        </span>
                      </div>
                      <div className="border-t border-slate-50 pt-2 flex items-center justify-between text-sm">
                        <span className="text-slate-500">Valor total</span>
                        <span className="font-black text-orange-600">R$ {Number(order.total_price).toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </section>
            )}

            {/* Histórico de Pedidos */}
            {pastOrders.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">
                  Histórico Anterior
                </h2>
                {pastOrders.map(order => (
                  <div key={order.id} className="bg-white rounded-xl shadow-sm border border-slate-50 p-4 flex items-center justify-between opacity-75">
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{(order.vendors as any)?.name || 'Barraca'}</p>
                      <p className="text-xs text-slate-400">
                        #{order.pickup_code} • {new Date(order.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-700 text-sm">R$ {Number(order.total_price).toFixed(2)}</p>
                      <span className="text-xs text-slate-400">Entregue</span>
                    </div>
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
