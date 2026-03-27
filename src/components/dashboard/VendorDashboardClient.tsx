import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';

const P = '#ec5b13';

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
}: Props) {
  const router = useRouter();

  const maxVal = Math.max(...chartData.map(d => d.total), 1);
  const effAngle = efficiency != null ? (efficiency / 100) * 283 : 0; 

  const setPeriod = (p: string) => {
    router.push(`/dashboard/vendor/dashboard?period=${p}`);
  };

  const periodLabel = {
    today: 'Hoje',
    '7d': 'Até 7d',
    '30d': 'Até 30d',
    all: 'Tudo'
  }[currentPeriod] || 'Hoje';

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5 pb-20">
      
      {/* Period Selector */}
      <div className="flex bg-slate-100 p-1 rounded-2xl">
        {['today', '7d', '30d'].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
              currentPeriod === p ? 'bg-white shadow-sm text-orange-600' : 'text-slate-400'
            }`}
          >
            {p === 'today' ? 'HOJE' : p.toUpperCase()}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          label={`Receita ${periodLabel}`}
          value={formatCurrency(revenue)}
          sub="No período selecionado"
          icon="💰"
          accent={P}
        />
        <KpiCard
          label="Pedidos Ativos"
          value={String(activeCount)}
          sub="No período selecionado"
          icon="🔥"
          accent="#f59e0b"
          badge={currentPeriod === 'today' ? 'ATIVOS' : undefined}
        />
        <KpiCard
          label="Tempo Médio Prep."
          value={avgMinutes != null ? `${avgMinutes} min` : '–'}
          sub="Média no período"
          icon="⏱️"
          accent="#8b5cf6"
        />
        <KpiCard
          label="Total de Clientes"
          value={String(uniqueCustomers)}
          sub="Clientes únicos"
          icon="👥"
          accent="#3b82f6"
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
            const showLabel = currentPeriod === 'today' ? (d.hour ?? 0) % 3 === 0 : i % (currentPeriod === '30d' ? 5 : 1) === 0;
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
      </div>

      {/* Eficiência */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col items-center justify-center">
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
            <p className="text-[10px] text-slate-400 font-bold uppercase">Recebidos</p>
          </div>
          <div>
            <p className="text-xl font-black text-slate-900">{readyCount}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Prontos</p>
          </div>
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
