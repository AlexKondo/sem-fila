import { createAdminClient } from '@/lib/supabase/server';
import BrandSwitchButton from '@/components/dashboard/BrandSwitchButton';

interface Vendor {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
}

interface Props {
  vendors: Vendor[];
  userId: string;
}

const P = '#ec5b13';

export default async function VendorOverview({ vendors, userId }: Props) {
  const admin = await createAdminClient();
  const vendorIds = vendors.map(v => v.id);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Busca pedidos de todos os vendors
  const { data: allOrders } = await admin
    .from('orders')
    .select('id, vendor_id, total_price, status, payment_status, created_at')
    .in('vendor_id', vendorIds);

  const { data: allOrderItems } = await admin
    .from('order_items')
    .select('quantity, unit_price, menu_items(name), orders!inner(vendor_id)')
    .in('orders.vendor_id', vendorIds);

  const orders = allOrders || [];
  const todayOrders = orders.filter(o => new Date(o.created_at) >= today);

  // Stats globais
  const totalRevenue = orders.filter(o => o.payment_status === 'paid').reduce((s, o) => s + Number(o.total_price), 0);
  const todayRevenue = todayOrders.reduce((s, o) => s + Number(o.total_price), 0);
  const todayCount = todayOrders.length;
  const totalOrders = orders.length;

  // Stats por marca
  const brandStats = vendors.map(v => {
    const vOrders = orders.filter(o => o.vendor_id === v.id);
    const vToday = vOrders.filter(o => new Date(o.created_at) >= today);
    const vRevenue = vOrders.filter(o => o.payment_status === 'paid').reduce((s, o) => s + Number(o.total_price), 0);
    const active = vOrders.filter(o => ['received', 'preparing', 'almost_ready', 'ready'].includes(o.status)).length;
    return { ...v, totalOrders: vOrders.length, todayOrders: vToday.length, revenue: vRevenue, activeOrders: active };
  });

  // Produtos mais vendidos (all-time)
  const productCount: Record<string, { name: string; qty: number; revenue: number }> = {};
  (allOrderItems || []).forEach((item: any) => {
    const name = item.menu_items?.name;
    if (!name) return;
    if (!productCount[name]) productCount[name] = { name, qty: 0, revenue: 0 };
    productCount[name].qty += item.quantity;
    productCount[name].revenue += item.quantity * Number(item.unit_price);
  });
  const topProducts = Object.values(productCount).sort((a, b) => b.qty - a.qty).slice(0, 5);

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="max-w-2xl mx-auto px-4 pt-5 pb-10 space-y-6">

      {/* Sumário Global */}
      <section>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Resumo Geral — Todas as Marcas</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Receita total', value: fmt(totalRevenue) },
            { label: 'Receita hoje', value: fmt(todayRevenue) },
            { label: 'Pedidos hoje', value: String(todayCount) },
            { label: 'Pedidos total', value: String(totalOrders) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
              <p className="text-xs text-slate-400 font-medium mb-1">{label}</p>
              <p className="text-xl font-black text-slate-900 leading-tight">{value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Por marca */}
      <section>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Por Marca</h2>
        <div className="space-y-3">
          {brandStats.map(b => (
            <div key={b.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-slate-900">{b.name}</p>
                  {b.description && <p className="text-xs text-slate-400 mt-0.5">{b.description}</p>}
                </div>
                {b.activeOrders > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: P }}>
                    {b.activeOrders} ativos
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Micro label="Receita" value={fmt(b.revenue)} />
                <Micro label="Hoje" value={String(b.todayOrders)} />
                <Micro label="Total" value={String(b.totalOrders)} />
              </div>
              <BrandSwitchButton vendorId={b.id} />
            </div>
          ))}
        </div>
      </section>

      {/* Top produtos */}
      {topProducts.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Produtos Mais Vendidos</h2>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {topProducts.map((p, i) => (
              <div key={p.name} className={`flex items-center justify-between px-4 py-3 ${i < topProducts.length - 1 ? 'border-b border-slate-50' : ''}`}>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-slate-300 w-4">{i + 1}</span>
                  <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{p.qty}x</p>
                  <p className="text-[10px] text-slate-400">{fmt(p.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Micro({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-xl px-3 py-2">
      <p className="text-[10px] text-slate-400 font-medium">{label}</p>
      <p className="text-sm font-black text-slate-800">{value}</p>
    </div>
  );
}
