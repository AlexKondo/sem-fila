'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import LogoutButton from '@/components/ui/LogoutButton';
import type { Delivery } from '@/types/database';

const P = '#ec5b13';

type DeliveryWithOrder = Delivery & {
  orders: {
    id: string;
    total_price: number;
    pickup_code: string;
    table_number: string | null;
    vendors: { id: string; name: string; logo_url: string | null } | null;
  } | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Aguardando',
  accepted: 'Aceito',
  in_transit: 'Em Rota',
  delivered: 'Entregue',
};

const STATUS_COLOR: Record<string, string> = {
  pending: '#f59e0b',
  accepted: '#3b82f6',
  in_transit: '#8b5cf6',
  delivered: '#22c55e',
};

const NEXT_STATUS: Record<string, string> = {
  pending: 'accepted',
  accepted: 'in_transit',
  in_transit: 'delivered',
};

const NEXT_LABEL: Record<string, string> = {
  pending: 'Aceitar Entrega',
  accepted: 'Iniciar Rota',
  in_transit: 'Marcar como Entregue',
};

export default function DelivererPage() {
  const [deliveries, setDeliveries] = useState<DeliveryWithOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [tab, setTab] = useState<'active' | 'done'>('active');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, name')
        .eq('id', user.id)
        .single();
      setUserName((profile as any)?.full_name || (profile as any)?.name || user.email?.split('@')[0] || null);

      const { data } = await supabase
        .from('deliveries')
        .select(`
          *,
          orders(id, total_price, pickup_code, table_number,
            vendors(id, name, logo_url)
          )
        `)
        .eq('deliverer_id', user.id)
        .order('created_at', { ascending: false });

      if (data) setDeliveries(data as DeliveryWithOrder[]);
      setLoading(false);
    }

    load();

    // Realtime
    const channel = supabase
      .channel('deliverer-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'deliveries',
      }, () => load())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function advanceStatus(delivery: DeliveryWithOrder) {
    const next = NEXT_STATUS[delivery.status];
    if (!next) return;
    setUpdating(delivery.id);
    const supabase = createClient();
    const updateData: Record<string, string> = { status: next };
    if (next === 'accepted') updateData.accepted_at = new Date().toISOString();
    if (next === 'delivered') updateData.delivered_at = new Date().toISOString();
    await supabase.from('deliveries').update(updateData).eq('id', delivery.id);
    setDeliveries(prev => prev.map(d => d.id === delivery.id ? { ...d, ...updateData } : d));
    setUpdating(null);
  }

  if (loading) return (
    <div className="min-h-screen bg-[#f8f6f6] flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: P }} />
    </div>
  );

  const active = deliveries.filter(d => d.status !== 'delivered');
  const done = deliveries.filter(d => d.status === 'delivered');

  const shown = tab === 'active' ? active : done;

  return (
    <main className="min-h-screen bg-[#f8f6f6] pb-20">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: P }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm leading-tight">Painel do Entregador</p>
              {userName && <p className="text-[11px] text-slate-400">{userName}</p>}
            </div>
          </div>
          <LogoutButton />
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white rounded-2xl p-1 border border-slate-100 shadow-sm">
          {(['active', 'done'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${
                tab === t ? 'text-white shadow' : 'text-slate-400'
              }`}
              style={tab === t ? { backgroundColor: P } : {}}
            >
              {t === 'active' ? `Em Andamento (${active.length})` : `Concluídas (${done.length})`}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-slate-100 shadow-sm">
            <p className="text-4xl mb-3">{tab === 'active' ? '🛵' : '✅'}</p>
            <p className="text-slate-400 text-sm">
              {tab === 'active' ? 'Nenhuma entrega pendente agora.' : 'Nenhuma entrega concluída ainda.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {shown.map(delivery => {
              const statusColor = STATUS_COLOR[delivery.status] ?? P;
              const nextLabel = NEXT_LABEL[delivery.status];
              return (
                <div key={delivery.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-xl overflow-hidden border border-slate-100">
                          {delivery.orders?.vendors?.logo_url
                            ? <img src={delivery.orders.vendors.logo_url} className="w-full h-full object-cover" />
                            : '🍽️'
                          }
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm leading-none mb-1">
                            {delivery.orders?.vendors?.name ?? 'Quiosque'}
                          </p>
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-wider">
                            Pedido #{delivery.orders?.pickup_code}
                            {delivery.orders?.table_number && ` · Mesa ${delivery.orders.table_number}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-slate-900 text-sm leading-none mb-1">
                          {formatCurrency(delivery.orders?.total_price ?? 0)}
                        </p>
                        <span
                          className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider"
                          style={{ backgroundColor: statusColor + '15', color: statusColor }}
                        >
                          {STATUS_LABEL[delivery.status]}
                        </span>
                      </div>
                    </div>

                    {nextLabel && (
                      <button
                        onClick={() => advanceStatus(delivery)}
                        disabled={updating === delivery.id}
                        className="w-full mt-3 py-3 rounded-2xl text-white text-sm font-black shadow transition active:scale-95 disabled:opacity-50"
                        style={{ backgroundColor: P, boxShadow: `0 4px 12px ${P}40` }}
                      >
                        {updating === delivery.id ? 'Atualizando…' : nextLabel}
                      </button>
                    )}
                  </div>

                  {delivery.status === 'delivered' && delivery.rating && (
                    <div className="px-4 pb-4 pt-0 border-t border-slate-50">
                      <p className="text-xs text-slate-400 mt-3">
                        Avaliação:{' '}
                        <span className="font-bold text-yellow-500">
                          {'★'.repeat(delivery.rating)}{'☆'.repeat(5 - delivery.rating)}
                        </span>
                        {delivery.rating_note && <span className="text-slate-500 ml-1">"{delivery.rating_note}"</span>}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Stats */}
        {done.length > 0 && (
          <div className="mt-6 bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Resumo</p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-black text-slate-900">{done.length}</p>
                <p className="text-xs text-slate-400">Entregas</p>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">
                  {done.filter(d => d.rating).length > 0
                    ? (done.reduce((s, d) => s + (d.rating ?? 0), 0) / done.filter(d => d.rating).length).toFixed(1)
                    : '–'}
                </p>
                <p className="text-xs text-slate-400">Nota Média</p>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">
                  {formatCurrency(done.reduce((s, d) => s + (d.orders?.total_price ?? 0), 0))}
                </p>
                <p className="text-xs text-slate-400">Em Pedidos</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
