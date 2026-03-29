'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useVendorFeature } from '@/hooks/useVendorFeature';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, BarChart3, Clock, XCircle, Lock, Sparkles } from 'lucide-react';

interface Props {
  vendorId: string;
}

interface RevenueData {
  today: number;
  week: number;
  month: number;
  avgTicket: number;
  orderCount: number;
  topItems: { name: string; qty: number; revenue: number }[];
}

interface EfficiencyData {
  avgPrepTime: number;
  readyRate: number;
  cancelRate: number;
  totalDelivered: number;
  totalCancelled: number;
}

function LockedPanel({ title, icon: Icon, featureSlug, vendorId }: { title: string; icon: React.ElementType; featureSlug: string; vendorId: string }) {
  return (
    <div className="relative bg-white rounded-2xl border border-gray-100 shadow-sm p-6 overflow-hidden">
      <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center">
        <Lock className="w-8 h-8 text-gray-300 mb-2" />
        <p className="text-sm font-bold text-gray-500">Recurso Premium</p>
        <p className="text-xs text-gray-400 mt-1">Adquira em Configurações &gt; Benefícios Premium</p>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-gray-300" />
        <h3 className="text-sm font-bold text-gray-300">{title}</h3>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-gray-50 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function RevenueReport({ vendorId }: Props) {
  const { hasAccess, loading } = useVendorFeature(vendorId, 'relatorio_faturamento');
  const [data, setData] = useState<RevenueData | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!hasAccess || loading) return;
    const supabase = createClient();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    supabase
      .from('orders')
      .select('total_price, created_at, status, order_items(quantity, unit_price, menu_items(name))')
      .eq('vendor_id', vendorId)
      .eq('payment_status', 'paid')
      .gte('created_at', monthStart)
      .then(({ data: orders }) => {
        if (!orders) { setLoadingData(false); return; }

        let today = 0, week = 0, month = 0, count = 0;
        const itemMap = new Map<string, { qty: number; revenue: number }>();

        for (const o of orders) {
          const price = o.total_price ?? 0;
          const created = new Date(o.created_at);
          month += price;
          count++;
          if (created >= new Date(weekStart)) week += price;
          if (created >= new Date(todayStart)) today += price;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const oi of (o.order_items as any[] || [])) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const name = (oi.menu_items as any)?.name ?? 'Item';
            const existing = itemMap.get(name) || { qty: 0, revenue: 0 };
            itemMap.set(name, { qty: existing.qty + (oi.quantity || 1), revenue: existing.revenue + (oi.unit_price * (oi.quantity || 1)) });
          }
        }

        const topItems = Array.from(itemMap.entries())
          .map(([name, v]) => ({ name, ...v }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5);

        setData({ today, week, month, avgTicket: count > 0 ? month / count : 0, orderCount: count, topItems });
        setLoadingData(false);
      });
  }, [vendorId, hasAccess, loading]);

  if (loading) return null;
  if (!hasAccess) return null;
  if (loadingData) return null;
  if (!data) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-orange-500" />
        <h3 className="text-sm font-bold text-slate-900">Relatório de Faturamento</h3>
        <span className="text-[9px] font-black bg-orange-50 text-orange-500 px-1.5 py-0.5 rounded-full uppercase flex items-center gap-0.5">
          <Sparkles className="w-2.5 h-2.5" /> Premium
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-emerald-50 rounded-xl p-3">
          <p className="text-[10px] text-emerald-600 font-bold uppercase">Hoje</p>
          <p className="text-lg font-black text-emerald-800">{formatCurrency(data.today)}</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-3">
          <p className="text-[10px] text-blue-600 font-bold uppercase">7 dias</p>
          <p className="text-lg font-black text-blue-800">{formatCurrency(data.week)}</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-3">
          <p className="text-[10px] text-purple-600 font-bold uppercase">Mês</p>
          <p className="text-lg font-black text-purple-800">{formatCurrency(data.month)}</p>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="flex-1 bg-gray-50 rounded-xl p-3">
          <p className="text-[10px] text-gray-500 font-bold">Ticket médio</p>
          <p className="text-sm font-black text-gray-900">{formatCurrency(data.avgTicket)}</p>
        </div>
        <div className="flex-1 bg-gray-50 rounded-xl p-3">
          <p className="text-[10px] text-gray-500 font-bold">Pedidos no mês</p>
          <p className="text-sm font-black text-gray-900">{data.orderCount}</p>
        </div>
      </div>

      {data.topItems.length > 0 && (
        <div>
          <p className="text-[10px] text-gray-500 font-bold uppercase mb-2">Top produtos por receita</p>
          <div className="space-y-1.5">
            {data.topItems.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <span className="text-gray-700 font-medium">{i + 1}. {item.name} <span className="text-gray-400">({item.qty}x)</span></span>
                <span className="font-bold text-gray-900">{formatCurrency(item.revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function EfficiencyPanel({ vendorId }: Props) {
  const { hasAccess, loading } = useVendorFeature(vendorId, 'painel_eficiencia');
  const [data, setData] = useState<EfficiencyData | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!hasAccess || loading) return;
    const supabase = createClient();
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    supabase
      .from('orders')
      .select('status, created_at, updated_at')
      .eq('vendor_id', vendorId)
      .gte('created_at', monthStart)
      .then(({ data: orders }) => {
        if (!orders) { setLoadingData(false); return; }

        let delivered = 0, cancelled = 0, totalPrepTime = 0, prepCount = 0;

        for (const o of orders) {
          if (o.status === 'delivered') {
            delivered++;
            if (o.updated_at) {
              const mins = (new Date(o.updated_at).getTime() - new Date(o.created_at).getTime()) / 60000;
              if (mins > 0.5 && mins < 120) { totalPrepTime += mins; prepCount++; }
            }
          }
          if (o.status === 'cancelled') cancelled++;
        }

        const total = delivered + cancelled;
        setData({
          avgPrepTime: prepCount > 0 ? Math.round(totalPrepTime / prepCount) : 0,
          readyRate: total > 0 ? Math.round((delivered / total) * 100) : 100,
          cancelRate: total > 0 ? Math.round((cancelled / total) * 100) : 0,
          totalDelivered: delivered,
          totalCancelled: cancelled,
        });
        setLoadingData(false);
      });
  }, [vendorId, hasAccess, loading]);

  if (loading) return null;
  if (!hasAccess) return null;
  if (loadingData) return null;
  if (!data) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-blue-500" />
        <h3 className="text-sm font-bold text-slate-900">Painel de Eficiência</h3>
        <span className="text-[9px] font-black bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded-full uppercase flex items-center gap-0.5">
          <Sparkles className="w-2.5 h-2.5" /> Premium
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <Clock className="w-5 h-5 text-green-500 mx-auto mb-1" />
          <p className="text-2xl font-black text-green-800">{data.avgPrepTime}<span className="text-sm">min</span></p>
          <p className="text-[10px] text-green-600 font-bold">Tempo médio</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3 text-center">
          <BarChart3 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
          <p className="text-2xl font-black text-emerald-800">{data.readyRate}%</p>
          <p className="text-[10px] text-emerald-600 font-bold">Taxa de entrega</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-lg font-black text-gray-900">{data.totalDelivered}</p>
          <p className="text-[10px] text-gray-500 font-bold">Entregues</p>
        </div>
        <div className="bg-red-50 rounded-xl p-3 text-center">
          <p className="text-lg font-black text-red-700">{data.totalCancelled}</p>
          <p className="text-[10px] text-red-500 font-bold">Cancelados</p>
        </div>
        <div className="bg-red-50 rounded-xl p-3 text-center">
          <p className="text-lg font-black text-red-700">{data.cancelRate}%</p>
          <p className="text-[10px] text-red-500 font-bold">Cancelamento</p>
        </div>
      </div>
    </div>
  );
}
