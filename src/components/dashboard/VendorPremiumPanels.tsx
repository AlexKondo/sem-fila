'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useVendorFeature } from '@/hooks/useVendorFeature';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, BarChart3, Clock, XCircle, Lock, Sparkles, UtensilsCrossed, ArrowUp, ArrowDown, Minus, MessageSquarePlus, Send, Headphones } from 'lucide-react';

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

interface MenuItemAnalysis {
  name: string;
  qty: number;
  revenue: number;
  avgPrice: number;
  trend: 'up' | 'down' | 'stable';
  percentOfTotal: number;
}

interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  status: string;
  priority: boolean;
  admin_reply: string | null;
  created_at: string;
  updated_at: string;
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

// ── Análise de Cardápio (analise_cardapio) ──
export function MenuAnalysisPanel({ vendorId }: Props) {
  const { hasAccess, loading } = useVendorFeature(vendorId, 'analise_cardapio');
  const [items, setItems] = useState<MenuItemAnalysis[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    if (!hasAccess || loading) return;
    const supabase = createClient();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

    Promise.all([
      // Pedidos deste mês
      supabase.from('orders')
        .select('order_items(quantity, unit_price, menu_items(name))')
        .eq('vendor_id', vendorId).eq('payment_status', 'paid')
        .gte('created_at', monthStart),
      // Pedidos mês anterior (para tendência)
      supabase.from('orders')
        .select('order_items(quantity, unit_price, menu_items(name))')
        .eq('vendor_id', vendorId).eq('payment_status', 'paid')
        .gte('created_at', prevMonthStart).lte('created_at', prevMonthEnd),
      // Total de itens no cardápio
      supabase.from('menu_items').select('id', { count: 'exact', head: true }).eq('vendor_id', vendorId),
    ]).then(([{ data: currentOrders }, { data: prevOrders }, { count: menuCount }]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function aggregate(orders: any[]) {
        const map = new Map<string, { qty: number; revenue: number }>();
        for (const o of orders) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const oi of (o.order_items as any[] || [])) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const name = (oi.menu_items as any)?.name ?? 'Item';
            const existing = map.get(name) || { qty: 0, revenue: 0 };
            const qty = oi.quantity || 1;
            map.set(name, { qty: existing.qty + qty, revenue: existing.revenue + (oi.unit_price * qty) });
          }
        }
        return map;
      }

      const currentMap = aggregate(currentOrders || []);
      const prevMap = aggregate(prevOrders || []);

      let total = 0;
      currentMap.forEach(v => { total += v.revenue; });

      const analysis: MenuItemAnalysis[] = Array.from(currentMap.entries())
        .map(([name, v]) => {
          const prev = prevMap.get(name);
          let trend: 'up' | 'down' | 'stable' = 'stable';
          if (prev) {
            if (v.qty > prev.qty * 1.1) trend = 'up';
            else if (v.qty < prev.qty * 0.9) trend = 'down';
          } else if (v.qty > 0) {
            trend = 'up'; // novo item
          }
          return {
            name,
            qty: v.qty,
            revenue: v.revenue,
            avgPrice: v.qty > 0 ? v.revenue / v.qty : 0,
            trend,
            percentOfTotal: total > 0 ? (v.revenue / total) * 100 : 0,
          };
        })
        .sort((a, b) => b.revenue - a.revenue);

      setItems(analysis);
      setTotalRevenue(total);
      setTotalItems(menuCount || 0);
      setLoadingData(false);
    });
  }, [vendorId, hasAccess, loading]);

  if (loading) return null;
  if (!hasAccess) return <LockedPanel title="Análise de Cardápio" icon={UtensilsCrossed} featureSlug="analise_cardapio" vendorId={vendorId} />;
  if (loadingData) return null;

  const topSellers = items.slice(0, 5);
  const lowPerformers = items.filter(i => i.qty > 0).sort((a, b) => a.qty - b.qty).slice(0, 3);
  const neverSold = totalItems - items.length;

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === 'up') return <ArrowUp className="w-3 h-3 text-green-500" />;
    if (trend === 'down') return <ArrowDown className="w-3 h-3 text-red-500" />;
    return <Minus className="w-3 h-3 text-gray-400" />;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <UtensilsCrossed className="w-5 h-5 text-violet-500" />
        <h3 className="text-sm font-bold text-slate-900">Análise de Cardápio</h3>
        <span className="text-[9px] font-black bg-violet-50 text-violet-500 px-1.5 py-0.5 rounded-full uppercase flex items-center gap-0.5">
          <Sparkles className="w-2.5 h-2.5" /> Premium
        </span>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-violet-50 rounded-xl p-3 text-center">
          <p className="text-lg font-black text-violet-800">{items.length}</p>
          <p className="text-[10px] text-violet-600 font-bold">Itens vendidos</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3 text-center">
          <p className="text-lg font-black text-emerald-800">{formatCurrency(totalRevenue)}</p>
          <p className="text-[10px] text-emerald-600 font-bold">Receita total</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 text-center">
          <p className="text-lg font-black text-amber-800">{neverSold}</p>
          <p className="text-[10px] text-amber-600 font-bold">Sem vendas</p>
        </div>
      </div>

      {/* Top sellers */}
      {topSellers.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] text-gray-500 font-bold uppercase mb-2">Campeoes de venda</p>
          <div className="space-y-1.5">
            {topSellers.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <TrendIcon trend={item.trend} />
                  <span className="text-gray-700 font-medium">{i + 1}. {item.name}</span>
                  <span className="text-gray-400">({item.qty}x)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400">{item.percentOfTotal.toFixed(0)}%</span>
                  <span className="font-bold text-gray-900">{formatCurrency(item.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Low performers */}
      {lowPerformers.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] text-gray-500 font-bold uppercase mb-2">Menor desempenho</p>
          <div className="space-y-1.5">
            {lowPerformers.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <TrendIcon trend={item.trend} />
                  <span className="text-gray-500">{item.name}</span>
                  <span className="text-gray-300">({item.qty}x)</span>
                </div>
                <span className="text-gray-400">{formatCurrency(item.revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sugestoes */}
      <div className="bg-violet-50 rounded-xl p-3 space-y-1.5">
        <p className="text-[10px] text-violet-600 font-bold uppercase">Sugestoes</p>
        {neverSold > 0 && (
          <p className="text-xs text-violet-700">Voce tem <strong>{neverSold} itens</strong> sem vendas neste mes. Considere atualizar fotos/descricoes ou remover.</p>
        )}
        {topSellers.length > 0 && topSellers[0].percentOfTotal > 40 && (
          <p className="text-xs text-violet-700">O item <strong>{topSellers[0].name}</strong> representa {topSellers[0].percentOfTotal.toFixed(0)}% da receita. Diversifique para reduzir risco.</p>
        )}
        {lowPerformers.length > 0 && lowPerformers.some(i => i.trend === 'down') && (
          <p className="text-xs text-violet-700">Itens com tendencia de queda: considere promover com desconto ou atualizar.</p>
        )}
        {items.length === 0 && (
          <p className="text-xs text-violet-700">Nenhum dado de vendas ainda. Comece a receber pedidos para ver a analise.</p>
        )}
      </div>
    </div>
  );
}

// ── Suporte Prioritário (suporte_prioritario) ──
export function SupportPanel({ vendorId }: Props) {
  const { hasAccess, loading } = useVendorFeature(vendorId, 'suporte_prioritario');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const loadTickets = () => {
    const supabase = createClient();
    supabase
      .from('support_tickets')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setTickets((data as SupportTicket[]) || []);
        setLoadingData(false);
      });
  };

  useEffect(() => {
    if (!hasAccess || loading) return;
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId, hasAccess, loading]);

  const submitTicket = async () => {
    if (!subject.trim() || !message.trim()) return;
    setSending(true);
    const supabase = createClient();
    const { error } = await supabase.from('support_tickets').insert({
      vendor_id: vendorId,
      subject: subject.trim(),
      message: message.trim(),
      priority: true, // premium = prioritário
      status: 'open',
    });
    if (!error) {
      setSubject('');
      setMessage('');
      setShowForm(false);
      loadTickets();
    }
    setSending(false);
  };

  if (loading) return null;
  if (!hasAccess) return <LockedPanel title="Suporte Prioritário" icon={Headphones} featureSlug="suporte_prioritario" vendorId={vendorId} />;
  if (loadingData) return null;

  const STATUS_COLORS: Record<string, string> = {
    open: 'bg-yellow-50 text-yellow-600',
    in_progress: 'bg-blue-50 text-blue-600',
    resolved: 'bg-green-50 text-green-600',
    closed: 'bg-gray-100 text-gray-500',
  };
  const STATUS_LABELS: Record<string, string> = {
    open: 'Aberto',
    in_progress: 'Em andamento',
    resolved: 'Resolvido',
    closed: 'Fechado',
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Headphones className="w-5 h-5 text-rose-500" />
          <h3 className="text-sm font-bold text-slate-900">Suporte Prioritário</h3>
          <span className="text-[9px] font-black bg-rose-50 text-rose-500 px-1.5 py-0.5 rounded-full uppercase flex items-center gap-0.5">
            <Sparkles className="w-2.5 h-2.5" /> VIP
          </span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg hover:bg-rose-100 transition"
        >
          <MessageSquarePlus className="w-3.5 h-3.5" /> Novo ticket
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-rose-50 rounded-xl p-3 mb-4 space-y-2">
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Assunto"
            className="w-full border border-rose-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-400/30"
          />
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Descreva seu problema ou solicitação..."
            rows={3}
            className="w-full border border-rose-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-400/30 resize-none"
          />
          <button
            onClick={submitTicket}
            disabled={sending || !subject.trim() || !message.trim()}
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-rose-500 px-4 py-2 rounded-lg hover:bg-rose-600 transition disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {sending ? 'Enviando...' : 'Enviar ticket'}
          </button>
        </div>
      )}

      {/* Tickets list */}
      {tickets.length === 0 ? (
        <div className="text-center py-6">
          <Headphones className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-xs text-gray-400">Nenhum ticket ainda. Precisou de ajuda? Abra um ticket acima.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map(t => (
            <div key={t.id} className="border border-gray-100 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-bold text-gray-900">{t.subject}</p>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase ${STATUS_COLORS[t.status] || 'bg-gray-100 text-gray-500'}`}>
                  {STATUS_LABELS[t.status] || t.status}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 line-clamp-2">{t.message}</p>
              {t.admin_reply && (
                <div className="mt-2 bg-blue-50 rounded-lg p-2">
                  <p className="text-[10px] font-bold text-blue-600 mb-0.5">Resposta da equipe:</p>
                  <p className="text-[11px] text-blue-700">{t.admin_reply}</p>
                </div>
              )}
              <p className="text-[9px] text-gray-300 mt-1">{new Date(t.created_at).toLocaleDateString('pt-BR')}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
