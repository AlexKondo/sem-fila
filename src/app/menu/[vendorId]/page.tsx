// Página pública do cardápio — acessada via QR Code. Não exige login.
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency, estimatedWaitTime } from '@/lib/utils';
import CartSheet from '@/components/menu/CartSheet';
import type { MenuItem, Vendor } from '@/types/database';

const P = '#ec5b13';

interface Props {
  params: Promise<{ vendorId: string }>;
  searchParams: Promise<{ mesa?: string }>;
}

export default async function MenuPage({ params, searchParams }: Props) {
  const { vendorId } = await params;
  const { mesa } = await searchParams;
  const supabase = await createClient();

  const { data: vendor, error: vendorError } = await supabase
    .from('vendors').select('*').eq('id', vendorId).eq('active', true).single();
  if (vendorError || !vendor) notFound();

  const { data: items } = await supabase
    .from('menu_items').select('*').eq('vendor_id', vendorId).eq('available', true).order('position', { ascending: true });

  const { count: activeOrders } = await supabase
    .from('orders').select('*', { count: 'exact', head: true })
    .eq('vendor_id', vendorId).in('status', ['received', 'preparing']);

  const waitTime = estimatedWaitTime(activeOrders ?? 0, vendor.avg_prep_time);

  return (
    <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto pb-36" style={{ backgroundColor: '#f8f6f6' }}>
      {/* Sticky header */}
      <header className="sticky top-0 z-50 border-b border-slate-200" style={{ backgroundColor: 'rgba(248,246,246,0.95)', backdropFilter: 'blur(8px)' }}>
        <div className="flex items-center p-4 justify-between">
          <div className="flex items-center gap-3">
            <div className="flex w-10 h-10 items-center justify-center rounded-full" style={{ backgroundColor: P + '1a' }}>
              {vendor.logo_url ? (
                <Image src={vendor.logo_url} alt={vendor.name} width={40} height={40} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <svg className="w-5 h-5" style={{ color: P }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
                </svg>
              )}
            </div>
            <div>
              <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight">{vendor.name}</h2>
              <p className="text-xs text-slate-500">
                {mesa ? `Mesa ${mesa} • ` : ''}{waitTime}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {vendor.accept_pix && <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">PIX</span>}
            {vendor.accept_card && <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Cartão</span>}
            {vendor.accept_cash && <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Dinheiro</span>}
          </div>
        </div>

        {/* Search bar */}
        <div className="px-4 pb-3">
          <div className="flex w-full items-center rounded-xl h-12 bg-slate-100 border-none gap-3 px-4">
            <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-base text-slate-400">Buscar no cardápio…</span>
          </div>
        </div>

        {/* Category tabs — underline style como no asset */}
        <div className="overflow-x-auto no-scrollbar">
          <div className="flex px-4 gap-6 border-b border-slate-100">
            {['Destaques', 'Lanches', 'Bebidas', 'Sobremesas'].map((cat, i) => (
              <button
                key={cat}
                className="pb-3 pt-2 text-sm shrink-0 border-b-2 transition-colors"
                style={i === 0
                  ? { borderColor: P, color: P, fontWeight: 700 }
                  : { borderColor: 'transparent', color: '#64748b', fontWeight: 500 }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-6 space-y-6">
        <h3 className="text-lg font-bold text-slate-900">Itens populares</h3>

        {!items || items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-sm">
            <p className="text-4xl mb-3">🍽️</p>
            <p className="text-slate-400 text-sm">Nenhum item disponível no momento.</p>
          </div>
        ) : (
          items.map((item: MenuItem) => <MenuItemCard key={item.id} item={item} waitTime={waitTime} />)
        )}
      </main>

      <CartSheet vendor={vendor as Vendor} tableNumber={mesa} />
    </div>
  );
}

function MenuItemCard({ item, waitTime }: { item: MenuItem; waitTime: string }) {
  return (
    <div className="flex gap-4 p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
      {/* Image — size-28 = 112px como no asset */}
      <div className="relative w-28 h-28 shrink-0 rounded-xl overflow-hidden">
        {item.image_url ? (
          <Image src={item.image_url} alt={item.name} fill className="object-cover" />
        ) : (
          <div className="w-full h-full bg-slate-100 flex items-center justify-center text-3xl">🍴</div>
        )}
      </div>

      <div className="flex flex-col flex-1 justify-between">
        <div>
          <div className="flex justify-between items-start gap-2">
            <h4 className="font-bold text-slate-900 leading-tight">{item.name}</h4>
            <span className="font-bold flex-shrink-0" style={{ color: P }}>{formatCurrency(item.price)}</span>
          </div>
          {item.description && (
            <p className="text-xs text-slate-500 line-clamp-2 mt-1">{item.description}</p>
          )}
          <div className="flex items-center gap-1.5 mt-2">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[11px] text-slate-500">{waitTime}</span>
          </div>
        </div>
        {/* Add button — rounded-full pill com primary/10 como no asset */}
        <div className="flex justify-end mt-2">
          <AddToCartButton item={item} />
        </div>
      </div>
    </div>
  );
}

function AddToCartButton({ item }: { item: MenuItem }) {
  return (
    <button
      data-add-to-cart={JSON.stringify({ id: item.id, name: item.name, price: item.price })}
      className="px-4 py-1.5 text-xs font-bold rounded-full flex items-center gap-1 transition-colors hover:opacity-90"
      style={{ backgroundColor: '#ec5b131a', color: '#ec5b13' }}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      Adicionar
    </button>
  );
}
