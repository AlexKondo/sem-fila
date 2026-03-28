'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { formatCurrency } from '@/lib/utils';
import { Calendar, Loader2 } from 'lucide-react';

const P = '#ec5b13';

interface VendorSummary {
  id: string;
  name: string;
  revenue: number;
  orders: number;
  active: number;
  avgPrepTime: number | null;
  customers: number;
  efficiency: number | null;
  readyCount: number;
  validCount: number;
}

interface GlobalSummary {
  totalRevenue: number;
  totalOrders: number;
  totalActive: number;
  totalCustomers: number;
  vendors: VendorSummary[];
}

interface Props {
  vendorName: string;
  revenue: number;
  activeCount: number;
  avgMinutes: number | null;
  uniqueCustomers: number;
  efficiency: number | null;
  readyCount: number;
  validCount: number;
  chartData: { label: string; total: number; isNow?: boolean; hour?: number }[];
  currentPeriod: string;
  startDate: string;
  endDate: string;
  globalSummary?: GlobalSummary;
}

export default function VendorDashboardClient({
  vendorName,
  revenue,
  activeCount,
  avgMinutes,
  uniqueCustomers,
  efficiency,
  readyCount,
  validCount,
  chartData,
  currentPeriod,
  startDate,
  endDate,
  globalSummary,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [localStart, setLocalStart] = useState(startDate);
  const [localEnd, setLocalEnd] = useState(endDate);

  const maxVal = Math.max(...chartData.map(d => d.total), 1);
  const effAngle = efficiency != null ? (efficiency / 100) * 283 : 0; 

  const handlePeriodChange = (p: string) => {
    startTransition(() => {
      router.push(`/dashboard/vendor/dashboard?period=${p}`);
    });
  };

  const handleCustomFilter = () => {
    startTransition(() => {
      router.push(`/dashboard/vendor/dashboard?period=custom&start=${localStart}&end=${localEnd}`);
    });
  };

  const periodLabel = {
    today: 'Hoje',
    '7d': '7 Dias',
    '30d': '30 Dias',
    all: 'Tudo',
    custom: 'Personalizado'
  }[currentPeriod] || 'Hoje';

  return (
    <div className={`max-w-2xl mx-auto px-4 py-6 space-y-5 pb-20 transition-opacity duration-300 ${isPending ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
      
      {/* Sumário Geral — todos os negócios */}
      {globalSummary && (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Visão Geral</p>
              <h2 className="text-base font-black text-white leading-tight">Todos os Negócios</h2>
            </div>
            <span className="text-[10px] font-black bg-white/10 px-3 py-1 rounded-full text-slate-300">{periodLabel}</span>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white/5 rounded-2xl p-3 text-center">
              <p className="text-lg font-black text-white">{formatCurrency(globalSummary.totalRevenue)}</p>
              <p className="text-[9px] text-slate-400 font-bold uppercase">Receita Total</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-3 text-center">
              <p className="text-lg font-black text-white">{globalSummary.totalOrders}</p>
              <p className="text-[9px] text-slate-400 font-bold uppercase">Pedidos</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-3 text-center">
              <p className="text-lg font-black text-white">{globalSummary.totalCustomers}</p>
              <p className="text-[9px] text-slate-400 font-bold uppercase">Clientes</p>
            </div>
          </div>

          <div className="space-y-2">
            {globalSummary.vendors.map(v => {
              const pct = globalSummary.totalRevenue > 0
                ? Math.round((v.revenue / globalSummary.totalRevenue) * 100)
                : 0;
              return (
                <div key={v.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-[11px] font-bold text-white truncate">{v.name}</p>
                      <p className="text-[10px] font-black text-orange-400 ml-2 shrink-0">{formatCurrency(v.revenue)}</p>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: P }}
                      />
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-slate-500 w-8 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Header with loading */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-slate-900">{vendorName}</h1>
        {isPending && <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />}
      </div>

      {/* Period Selectors Row */}
      <div className="flex flex-col md:flex-row gap-3 items-center">
        {/* Quick Period Selector (1/4 de largura no desktop) */}
        <div className="w-full md:w-1/4 flex bg-slate-100 p-1 rounded-2xl h-12">
          {['today', '7d', '30d'].map((p) => (
            <button
              key={p}
              onClick={() => handlePeriodChange(p)}
              className={`flex-1 py-1 text-[10px] font-black rounded-xl transition-all ${
                currentPeriod === p ? 'bg-white shadow-sm text-orange-600' : 'text-slate-400'
              }`}
            >
              {p === 'today' ? 'HOJE' : p.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Custom Date Picker (Restante da largura) */}
        <div className="w-full md:flex-1 bg-white rounded-3xl p-1 px-3 border border-slate-100 shadow-sm flex items-center gap-2 h-12">
          <Calendar className="w-3.5 h-3.5 text-slate-300 hidden sm:block" />
          <div className="flex-1 flex items-center gap-1.5">
            <input 
              type="date" 
              value={localStart}
              onChange={(e) => setLocalStart(e.target.value)}
              className="w-full h-8 bg-transparent text-[11px] font-bold text-slate-600 focus:outline-none"
            />
            <span className="text-slate-300 text-xs">→</span>
            <input 
              type="date" 
              value={localEnd}
              onChange={(e) => setLocalEnd(e.target.value)}
              className="w-full h-8 bg-transparent text-[11px] font-bold text-slate-600 focus:outline-none"
            />
          </div>
          <button 
            onClick={handleCustomFilter}
            className="h-8 bg-orange-500 text-white px-4 rounded-xl text-[10px] font-black shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
          >
            OK
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-3">
        <KpiCard
          label={`Receita (${periodLabel})`}
          value={formatCurrency(revenue)}
          sub="No período selecionado"
          icon="💰"
          accent={P}
          vendorBars={globalSummary?.vendors.map(v => ({
            name: v.name,
            value: v.revenue,
            label: formatCurrency(v.revenue),
          }))}
        />
        <KpiCard
          label="Pedidos Ativos"
          value={String(activeCount)}
          sub="No período selecionado"
          icon="🔥"
          accent="#f59e0b"
          badge={currentPeriod === 'today' ? 'ATIVOS' : undefined}
          vendorBars={globalSummary?.vendors.map(v => ({
            name: v.name,
            value: v.active,
            label: String(v.active),
          }))}
        />
        <KpiCard
          label="Tempo Médio Prep."
          value={avgMinutes != null ? `${avgMinutes} min` : '–'}
          sub="Média no período"
          icon="⏱️"
          accent="#8b5cf6"
          vendorBars={globalSummary?.vendors.map(v => ({
            name: v.name,
            value: v.avgPrepTime ?? 0,
            label: v.avgPrepTime != null ? `${v.avgPrepTime}m` : '–',
          }))}
        />
        <KpiCard
          label="Total de Clientes"
          value={String(uniqueCustomers)}
          sub="Clientes únicos"
          icon="👥"
          accent="#3b82f6"
          vendorBars={globalSummary?.vendors.map(v => ({
            name: v.name,
            value: v.customers,
            label: String(v.customers),
          }))}
        />
      </div>

      {/* Gráfico de barras — Receita do Período */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-black text-slate-900 text-base">Vendas no Período</h2>
            <p className="text-xs text-slate-400">Fluxo de receita (R$)</p>
          </div>
          <span className="text-[11px] font-black bg-slate-50 border border-slate-100 text-slate-400 px-3 py-1 rounded-full">{periodLabel}</span>
        </div>
        <div className="flex items-end gap-1 h-28">
          {chartData.map((d, i) => {
            const pct = d.total / maxVal;
            const isToday = currentPeriod === 'today' || (startDate === endDate);
            const showLabel = isToday ? (d.hour ?? 0) % 3 === 0 : i % Math.max(1, Math.floor(chartData.length / 6)) === 0;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div
                  className="w-full rounded-t-md transition-all"
                  style={{
                    height: `${Math.max(pct * 100, d.total > 0 ? 6 : 2)}%`,
                    backgroundColor: d.isNow ? P : d.total > 0 ? P + 'aa' : '#f1f5f9',
                  }}
                />
                {showLabel && (
                  <span className="text-[9px] text-slate-300 font-bold whitespace-nowrap">{d.label}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Breakdown por vendor */}
        {globalSummary && globalSummary.vendors.length > 1 && (
          <div className="mt-4 pt-4 border-t border-slate-50 space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Receita por Marca</p>
            {globalSummary.vendors.map((v, i) => {
              const maxRev = Math.max(...globalSummary.vendors.map(x => x.revenue), 1);
              return (
                <div key={v.id} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: VENDOR_COLORS[i % VENDOR_COLORS.length] }} />
                  <span className="text-[11px] font-bold text-slate-600 truncate w-28">{v.name}</span>
                  <div className="flex-1 h-2.5 bg-slate-50 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max((v.revenue / maxRev) * 100, v.revenue > 0 ? 6 : 0)}%`,
                        backgroundColor: VENDOR_COLORS[i % VENDOR_COLORS.length],
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-black text-slate-500 shrink-0">{formatCurrency(v.revenue)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Eficiência */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
        <div className={globalSummary && globalSummary.vendors.length > 1 ? 'flex flex-col md:flex-row gap-6' : 'flex flex-col items-center'}>
          {/* Lado esquerdo: ring + totais */}
          <div className="flex flex-col items-center">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Eficiência do Período</p>
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                <circle
                  cx="50" cy="50" r="45" fill="none"
                  stroke={P} strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${effAngle} 283`}
                  style={{ transition: 'stroke-dasharray 1s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-slate-900">{efficiency != null ? `${efficiency}%` : '–'}</span>
                <span className="text-[10px] text-slate-400 font-bold">READY RATE</span>
              </div>
            </div>
            <div className="flex gap-8 mt-5 text-center">
              <div>
                <p className="text-xl font-black text-slate-900">{validCount}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Pagos</p>
              </div>
              <div>
                <p className="text-xl font-black text-slate-900">{readyCount}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Prontos</p>
              </div>
            </div>
          </div>

          {/* Lado direito: breakdown por vendor */}
          {globalSummary && globalSummary.vendors.length > 1 && (
            <div className="flex-1 flex flex-col justify-center min-w-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Eficiência por Marca</p>
              <div className="space-y-3">
                {globalSummary.vendors.map((v, i) => (
                  <div key={v.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: VENDOR_COLORS[i % VENDOR_COLORS.length] }} />
                        <span className="text-[11px] font-bold text-slate-600 truncate">{v.name}</span>
                      </div>
                      <span className="text-[11px] font-black" style={{ color: VENDOR_COLORS[i % VENDOR_COLORS.length] }}>
                        {v.efficiency != null ? `${v.efficiency}%` : '–'}
                      </span>
                    </div>
                    <div className="h-2.5 bg-slate-50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${v.efficiency ?? 0}%`,
                          backgroundColor: VENDOR_COLORS[i % VENDOR_COLORS.length],
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-0.5">
                      <span className="text-[9px] text-slate-300">{v.readyCount} prontos</span>
                      <span className="text-[9px] text-slate-300">{v.validCount} pagos</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tempo médio — barra visual */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black text-slate-900">Tempo Médio de Preparo</h2>
          <span className="text-2xl font-black" style={{ color: P }}>
            {avgMinutes != null ? `${avgMinutes} min` : '–'}
          </span>
        </div>
        <p className="text-xs text-slate-400 mb-3">Média de tempo entre recebimento e entrega no período</p>
        <div className="relative h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: avgMinutes != null ? `${Math.min((avgMinutes / 30) * 100, 100)}%` : '0%',
              backgroundColor: avgMinutes == null ? '#94a3b8'
                : avgMinutes <= 10 ? '#22c55e'
                : avgMinutes <= 20 ? P
                : '#ef4444',
            }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-300 font-bold mt-1">
          <span>0 min</span>
          <span className="text-green-400">Ótimo &lt;10</span>
          <span style={{ color: P }}>Bom &lt;20</span>
          <span className="text-red-300">30+ min</span>
        </div>

        {/* Breakdown por vendor */}
        {globalSummary && globalSummary.vendors.length > 1 && (
          <div className="mt-4 pt-4 border-t border-slate-50 space-y-2.5">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tempo por Marca</p>
            {globalSummary.vendors.map((v, i) => {
              const prepColor = v.avgPrepTime == null ? '#94a3b8'
                : v.avgPrepTime <= 10 ? '#22c55e'
                : v.avgPrepTime <= 20 ? VENDOR_COLORS[i % VENDOR_COLORS.length]
                : '#ef4444';
              return (
                <div key={v.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: VENDOR_COLORS[i % VENDOR_COLORS.length] }} />
                      <span className="text-[11px] font-bold text-slate-600 truncate">{v.name}</span>
                    </div>
                    <span className="text-[11px] font-black" style={{ color: prepColor }}>
                      {v.avgPrepTime != null ? `${v.avgPrepTime} min` : '–'}
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-50 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: v.avgPrepTime != null ? `${Math.min((v.avgPrepTime / 30) * 100, 100)}%` : '0%',
                        backgroundColor: prepColor,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

interface VendorBar {
  name: string;
  value: number;
  label: string;
}

const VENDOR_COLORS = ['#ec5b13', '#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b'];

function KpiCard({
  label, value, sub, icon, accent, badge, vendorBars,
}: {
  label: string; value: string; sub: string; icon: string; accent: string; badge?: string; vendorBars?: VendorBar[];
}) {
  const maxBar = vendorBars ? Math.max(...vendorBars.map(v => v.value), 1) : 1;

  return (
    <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm relative overflow-hidden">
      {badge && (
        <span className="absolute top-3 right-3 text-[9px] font-black px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: accent }}>
          {badge}
        </span>
      )}

      <div className={vendorBars && vendorBars.length > 0 ? 'flex gap-3' : ''}>
        {/* Lado esquerdo: icone + valor */}
        <div className={vendorBars && vendorBars.length > 0 ? 'shrink-0' : ''}>
          <div className="text-2xl mb-2">{icon}</div>
          <p className="text-[11px] text-slate-400 font-medium leading-none mb-1">{label}</p>
          <p className="text-xl font-black text-slate-900 leading-tight">{value}</p>
          <p className="text-[10px] text-slate-300 mt-1">{sub}</p>
        </div>

        {/* Lado direito: mini barras por vendor */}
        {vendorBars && vendorBars.length > 0 && (
          <div className="flex-1 flex flex-col justify-end gap-1.5 min-w-0 pt-2">
            {vendorBars.map((v, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="flex-1 h-3 bg-slate-50 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max((v.value / maxBar) * 100, v.value > 0 ? 8 : 0)}%`,
                      backgroundColor: VENDOR_COLORS[i % VENDOR_COLORS.length],
                    }}
                  />
                </div>
                <span className="text-[8px] font-black text-slate-400 shrink-0 w-7 text-right">{v.label}</span>
              </div>
            ))}
            <div className="flex gap-1 flex-wrap mt-0.5">
              {vendorBars.map((v, i) => (
                <span key={i} className="flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: VENDOR_COLORS[i % VENDOR_COLORS.length] }} />
                  <span className="text-[7px] text-slate-300 font-bold truncate max-w-[60px]">{v.name}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
