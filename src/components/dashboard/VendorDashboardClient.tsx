'use client';

import { formatCurrency } from '@/lib/utils';

const P = '#ec5b13';

interface Props {
  vendorName: string;
  todayRevenue: number;
  activeCount: number;
  avgMinutes: number | null;
  uniqueCustomers: number;
  efficiency: number | null;
  readyCount: number;
  validCount: number;
  revenueByHour: { hour: number; total: number }[];
  revenueByDay: { label: string; total: number }[];
}

function fmtHour(h: number) {
  return `${String(h).padStart(2, '0')}h`;
}

export default function VendorDashboardClient({
  vendorName,
  todayRevenue,
  activeCount,
  avgMinutes,
  uniqueCustomers,
  efficiency,
  readyCount,
  validCount,
  revenueByHour,
  revenueByDay,
}: Props) {
  // Apenas horas com atividade (06h–23h) para o gráfico
  const activeHours = revenueByHour.slice(6);
  const maxHour = Math.max(...activeHours.map(h => h.total), 1);

  const maxDay = Math.max(...revenueByDay.map(d => d.total), 1);

  const effAngle = efficiency != null ? (efficiency / 100) * 283 : 0; // circumference ~283

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5 pb-20">

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          label="Receita de Hoje"
          value={formatCurrency(todayRevenue)}
          sub="+vs. ontem"
          icon="💰"
          accent={P}
        />
        <KpiCard
          label="Pedidos Ativos"
          value={String(activeCount)}
          sub="em preparo agora"
          icon="🔥"
          accent="#f59e0b"
          badge="ATIVOS"
        />
        <KpiCard
          label="Tempo Médio Prep."
          value={avgMinutes != null ? `${avgMinutes} min` : '–'}
          sub="por pedido"
          icon="⏱️"
          accent="#8b5cf6"
        />
        <KpiCard
          label="Total de Clientes"
          value={String(uniqueCustomers)}
          sub="vs. ontem"
          icon="👥"
          accent="#3b82f6"
        />
      </div>

      {/* Gráfico de barras — Receita por hora */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-black text-slate-900 text-base">Vendas ao Longo do Dia</h2>
            <p className="text-xs text-slate-400">Fluxo de receita por hora (R$)</p>
          </div>
          <span className="text-[11px] font-black bg-slate-50 border border-slate-100 text-slate-400 px-3 py-1 rounded-full">Hoje</span>
        </div>
        <div className="flex items-end gap-1 h-28">
          {activeHours.map(({ hour, total }) => {
            const pct = total / maxHour;
            const isNow = new Date().getHours() === hour;
            return (
              <div key={hour} className="flex-1 flex flex-col items-center gap-0.5">
                <div
                  className="w-full rounded-t-md transition-all"
                  style={{
                    height: `${Math.max(pct * 100, total > 0 ? 6 : 2)}%`,
                    backgroundColor: isNow ? P : total > 0 ? P + 'aa' : '#f1f5f9',
                  }}
                />
                {hour % 3 === 0 && (
                  <span className="text-[9px] text-slate-300 font-bold">{fmtHour(hour)}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Eficiência + Semana */}
      <div className="grid grid-cols-2 gap-3">
        {/* Eficiência circular */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col items-center justify-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Eficiência de Preparo</p>
          <div className="relative w-24 h-24">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
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
              <span className="text-xl font-black text-slate-900">{efficiency != null ? `${efficiency}%` : '–'}</span>
              <span className="text-[10px] text-slate-400 font-bold">READY RATE</span>
            </div>
          </div>
          <div className="flex gap-4 mt-3 text-center">
            <div>
              <p className="text-base font-black text-slate-900">{validCount}</p>
              <p className="text-[10px] text-slate-400">Recebidos</p>
            </div>
            <div>
              <p className="text-base font-black text-slate-900">{readyCount}</p>
              <p className="text-[10px] text-slate-400">Prontos</p>
            </div>
          </div>
        </div>

        {/* Semana */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Últimos 7 Dias</p>
          <div className="flex items-end gap-1 h-24">
            {revenueByDay.map(({ label, total }, i) => {
              const pct = total / maxDay;
              const isToday = i === revenueByDay.length - 1;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <div
                    className="w-full rounded-t-md"
                    style={{
                      height: `${Math.max(pct * 100, total > 0 ? 8 : 2)}%`,
                      backgroundColor: isToday ? P : P + '55',
                    }}
                  />
                  <span className="text-[9px] text-slate-300 font-bold capitalize">{label.replace('.', '')}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tempo médio — barra visual */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black text-slate-900">Tempo por Pedido</h2>
          <span className="text-2xl font-black" style={{ color: P }}>
            {avgMinutes != null ? `${avgMinutes} min` : '–'}
          </span>
        </div>
        <p className="text-xs text-slate-400 mb-3">Média do tempo entre recebimento e entrega (hoje)</p>
        {/* Meta visual: 0–30min, ideal < 15min */}
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
          <span className="text-red-300">30 min</span>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label, value, sub, icon, accent, badge,
}: {
  label: string; value: string; sub: string; icon: string; accent: string; badge?: string;
}) {
  return (
    <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm relative overflow-hidden">
      {badge && (
        <span className="absolute top-3 right-3 text-[9px] font-black px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: accent }}>
          {badge}
        </span>
      )}
      <div className="text-2xl mb-2">{icon}</div>
      <p className="text-[11px] text-slate-400 font-medium leading-none mb-1">{label}</p>
      <p className="text-xl font-black text-slate-900 leading-tight">{value}</p>
      <p className="text-[10px] text-slate-300 mt-1">{sub}</p>
    </div>
  );
}
