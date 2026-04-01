'use client';

import { useState, useEffect, useMemo, useCallback, memo, useDeferredValue, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatCurrency, getItemImage } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import CartSheet from './CartSheet';
import type { MenuItem, Vendor } from '@/types/database';
import ThemeToggle from '@/components/ui/ThemeToggle';

const P = '#ec5b13';

// Configuração visual dos selos por slug
const BADGE_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: string }> = {
  destaque_plataforma: {
    label: 'Destaque',
    bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200',
    icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  },
  selo_top_vendas: {
    label: 'Top Vendas',
    bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  },
  painel_eficiencia: {
    label: 'Atendimento Eficiente',
    bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  analise_cardapio: {
    label: 'Preparo Rápido',
    bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-200',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
  selo_entrega_rapida: {
    label: 'Entrega Rápida',
    bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
  fotos_ia: {
    label: 'Fotos com IA',
    bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200',
    icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
  suporte_prioritario: {
    label: 'Suporte VIP',
    bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200',
    icon: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z',
  },
};

interface MenuClientProps {
  vendor: Vendor;
  items: MenuItem[];
  mesa?: string;
  waitTime: string;
  hasFeaturedBadge?: boolean;
  activeBadges?: string[];
}

interface Extra { name: string; price: number; }

/* ─── Menu Item Card (memoizado) ─── */
const MenuItemCard = memo(function MenuItemCard({ item, onOpen }: { item: MenuItem; onOpen: (item: MenuItem) => void }) {
  return (
    <button
      onClick={() => onOpen(item)}
      className="w-full flex gap-4 p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-left active:scale-[0.98] transition-transform"
    >
      <div className="relative w-28 h-28 shrink-0 rounded-xl overflow-hidden">
        <Image
          src={item.image_url || getItemImage(item.name, item.category ?? undefined)}
          alt={item.name}
          fill
          className="object-cover"
        />
      </div>

      <div className="flex flex-col flex-1 justify-between">
        <div>
          <div className="flex justify-between items-start gap-2">
            <h4 className="font-bold text-slate-900 dark:text-white leading-tight">{item.name}</h4>
            <span className="font-bold flex-shrink-0" style={{ color: P }}>{formatCurrency(item.price)}</span>
          </div>
          {item.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">{item.description}</p>
          )}
        </div>
        <div className="flex justify-end mt-2">
          <span
            className="px-4 py-1.5 text-xs font-bold rounded-full flex items-center gap-1"
            style={{ backgroundColor: '#ec5b131a', color: '#ec5b13' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Adicionar
          </span>
        </div>
      </div>
    </button>
  );
});

/* ─── Menu Items List (memoizado) ─── */
const ItemList = memo(function ItemList({ items, onOpen }: { items: MenuItem[]; onOpen: (item: MenuItem) => void }) {
  if (items.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-12 text-center shadow-sm">
        <p className="text-4xl mb-3">🍽️</p>
        <p className="text-slate-400 text-sm">Nenhum item disponível nesta categoria.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <MenuItemCard key={item.id} item={item} onOpen={onOpen} />
      ))}
    </div>
  );
});

export default function MenuClient({ vendor, items, mesa, waitTime, activeBadges = [] }: MenuClientProps) {
  const [selectedCat, setSelectedCat] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [customerName, setCustomerName] = useState<string | null>(null);

  // Product Detail Sheet State
  const [detailItem, setDetailItem] = useState<MenuItem | null>(null);
  const [extraQty, setExtraQty] = useState<Record<string, number>>({});

  const [liveItems, setLiveItems] = useState<MenuItem[]>(items);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase.from('profiles').select('name, role').eq('id', data.user.id).single().then(({ data: p }) => {
          if (p?.name && p.role !== 'vendor') {
            setCustomerName(p.name.split(' ')[0]);
          }
        });
      }
    });

    const channel = supabase
      .channel(`menu-${vendor.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'menu_items',
        filter: `vendor_id=eq.${vendor.id}`
      }, async () => {
        const { data } = await supabase
          .from('menu_items')
          .select('*')
          .eq('vendor_id', vendor.id)
          .eq('available', true)
          .order('position', { ascending: true });
        if (data) setLiveItems(data as MenuItem[]);
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(channel); 
    };
  }, [vendor.id]);

  // Custom Waiter Modal State
  const [showWaiterModal, setShowWaiterModal] = useState(false);
  const [callStatus, setCallStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Table message alert (mensagem do garçom)
  const [tableAlert, setTableAlert] = useState<string | null>(null);
  const alertAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.preload = 'auto';
    audio.load();
    alertAudioRef.current = audio;
    function unlock() {
      audio.volume = 0;
      audio.play().then(() => { audio.pause(); audio.currentTime = 0; audio.volume = 1; }).catch(() => {});
    }
    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
    return () => { window.removeEventListener('click', unlock); window.removeEventListener('touchstart', unlock); };
  }, []);

  useEffect(() => {
    if (!mesa) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`table-msg-${vendor.id}-${mesa}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'table_messages',
        filter: `vendor_id=eq.${vendor.id}`,
      }, (payload) => {
        const msg = payload.new as { table_number: string; message: string };
        if (msg.table_number === mesa) {
          setTableAlert(msg.message);
          const audio = alertAudioRef.current;
          if (audio) {
            audio.currentTime = 0;
            audio.volume = 1;
            audio.loop = true;
            audio.play().catch(() => {});
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [vendor.id, mesa]);

  const handleOpenDetail = useCallback((item: MenuItem) => {
    setExtraQty({});
    setDetailItem(item);
  }, []);

  const confirmExtras = useCallback(() => {
    if (!detailItem) return;
    const allExtras = ((detailItem as any).extras as Extra[] | undefined) ?? [];
    const chosenExtras: Extra[] = [];
    allExtras.forEach(e => {
      const qty = extraQty[e.name] || 0;
      for (let i = 0; i < qty; i++) chosenExtras.push(e);
    });
    const extrasTotal = chosenExtras.reduce((s, e) => s + e.price, 0);
    document.dispatchEvent(new CustomEvent('add-to-cart', { detail: {
      id: detailItem.id + (chosenExtras.length ? '-' + Object.entries(extraQty).filter(([,q])=>q>0).map(([n,q])=>`${n}x${q}`).join('_') : ''),
      menuItemId: detailItem.id,
      name: detailItem.name,
      price: detailItem.price + extrasTotal,
      extras: chosenExtras,
    }}));
    setDetailItem(null);
  }, [detailItem, extraQty]);

  const changeExtraQty = useCallback((extra: Extra, delta: number) => {
    setExtraQty(prev => {
      const cur = prev[extra.name] || 0;
      const next = Math.max(0, cur + delta);
      return { ...prev, [extra.name]: next };
    });
  }, []);

  const handleCallWaiter = useCallback(() => {
    setCallStatus('idle');
    setShowWaiterModal(true);
  }, []);

  const confirmWaiterCall = useCallback(async (table: string) => {
    if (!table?.trim()) return;
    setCallStatus('loading');

    const supabase = createClient();
    const { error } = await supabase.from('waiter_calls').insert({
      vendor_id: vendor.id,
      table_number: table,
      status: 'pending'
    });

    if (error) {
      setCallStatus('error');
    } else {
      setCallStatus('success');
      setTimeout(() => {
        setShowWaiterModal(false);
        setCallStatus('idle');
      }, 2500);
    }
  }, [vendor.id]);

  // Memoiza categorias e itens filtrados
  const categories = useMemo(
    () => ['Todos', ...Array.from(new Set(liveItems.map(i => i.category).filter((c): c is string => !!c)))],
    [liveItems]
  );

  const filteredItems = useMemo(() => {
    if (deferredSearchQuery.trim()) {
      const q = deferredSearchQuery.toLowerCase();
      return liveItems.filter(i =>
        i.name.toLowerCase().includes(q) ||
        (i.description ?? '').toLowerCase().includes(q)
      );
    }
    return selectedCat === 'Todos'
      ? liveItems
      : liveItems.filter(i => i.category === selectedCat);
  }, [liveItems, deferredSearchQuery, selectedCat]);

  // Total dos extras para o modal
  const detailItemTotal = useMemo(() => {
    if (!detailItem) return 0;
    return detailItem.price + Object.entries(extraQty).reduce((s, [name, qty]) => {
      const ex = (((detailItem as any).extras as Extra[] | undefined) ?? []).find(e => e.name === name);
      return s + (ex ? ex.price * qty : 0);
    }, 0);
  }, [detailItem, extraQty]);

  return (
    <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto pb-24 bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* Sticky header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
        {/* Linha 1: nome da marca + toggle + botão usuário */}
        <div className="flex items-center px-4 pt-3 pb-2 justify-between gap-3">
          <h2 className="flex-1 text-slate-900 dark:text-white text-lg font-black leading-tight tracking-tight truncate">{vendor.name}</h2>
          <ThemeToggle />
          {customerName ? (
            <Link href="/profile?edit=true" className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-950/30 border border-orange-200/50 dark:border-orange-500/20 rounded-xl px-3 py-1.5 text-xs font-black text-orange-600 dark:text-orange-400 shadow-sm active:scale-95 transition-all shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-pulse" />
              <span>{customerName.toUpperCase()}</span>
            </Link>
          ) : (
            <Link href="/login-user" className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500 active:scale-95 transition-all shadow-sm shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </Link>
          )}
        </div>

        {/* Linha 2: logo + badges + info */}
        <div className="flex items-center gap-2 px-4 pb-3">
          <div className="flex w-8 h-8 shrink-0 items-center justify-center rounded-full bg-orange-500/10 dark:bg-orange-500/20">
            {vendor.logo_url ? (
              <Image src={vendor.logo_url} alt={vendor.name} width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <svg className="w-4 h-4" style={{ color: P }} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
              </svg>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            {activeBadges.map(slug => {
              const cfg = BADGE_CONFIG[slug];
              if (!cfg) return null;
              return (
                <span key={slug} className={`inline-flex items-center gap-0.5 ${cfg.bg} ${cfg.text} text-[9px] font-black px-1.5 py-0.5 rounded-full border ${cfg.border} uppercase whitespace-nowrap`}>
                  <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d={cfg.icon}/></svg>
                  {cfg.label}
                </span>
              );
            })}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {mesa ? `Mesa ${mesa} • ` : ''}{waitTime}
            </p>
          </div>
        </div>

        {/* Search bar + Help */}
        <div className="px-4 pb-3 flex items-center gap-2">
          <div className="flex-1 flex items-center rounded-xl h-12 bg-slate-100 dark:bg-slate-800 border-none gap-3 px-4">
            <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar no cardápio…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-slate-800 dark:text-white w-full text-base"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>

          {vendor.allow_waiter_calls && (
            <button
              onClick={handleCallWaiter}
              disabled={callStatus === 'loading'}
              className="h-14 w-48 shrink-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-200 transition-all active:scale-95 shadow-md disabled:opacity-50"
            >
              <span className="text-xl leading-none">🛎️</span>
              <span className="leading-tight whitespace-nowrap">Chamar Garçom</span>
            </button>
          )}
        </div>

        {/* Banner de fila de espera (só restaurante/bar) */}
        {['restaurant', 'restaurant_kilo', 'bar'].includes(vendor.business_type) && (
          <QueueBanner vendorId={vendor.id} />
        )}

        {/* Category tabs dinâmicas */}
        <div className="overflow-x-auto no-scrollbar">
          <div className="flex px-4 gap-6 border-b border-slate-100 dark:border-slate-800">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className="pb-3 pt-2 text-sm shrink-0 border-b-2 transition-colors"
                style={selectedCat === cat
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
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedCat === 'Todos' ? 'Cardápio Completo' : selectedCat}</h3>

        <ItemList items={filteredItems} onOpen={handleOpenDetail} />
      </main>

      <CartSheet vendor={vendor} tableNumber={mesa} />

      {/* Product Detail Sheet */}
      {detailItem && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300 flex flex-col max-h-[92dvh]">

            {/* Foto grande */}
            <div className="relative w-full h-64 shrink-0">
              <Image
                src={detailItem.image_url || getItemImage(detailItem.name, detailItem.category ?? undefined)}
                alt={detailItem.name}
                fill
                className="object-cover"
              />
              {/* Botão fechar */}
              <button
                onClick={() => setDetailItem(null)}
                className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>

            {/* Conteúdo scrollável */}
            <div className="overflow-y-auto flex-1">
              {/* Info do produto */}
              <div className="px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-start gap-3">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{detailItem.name}</h2>
                  <span className="text-xl font-black shrink-0" style={{ color: P }}>{formatCurrency(detailItem.price)}</span>
                </div>
                {detailItem.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{detailItem.description}</p>
                )}
              </div>

              {/* Extras / Opcionais */}
              {((detailItem as any).extras as Extra[] | undefined)?.length ? (
                <div className="px-5 py-4">
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Personalize seu pedido</p>
                  <div className="space-y-2">
                    {((detailItem as any).extras as Extra[]).map((extra, idx) => {
                      const qty = extraQty[extra.name] || 0;
                      return (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                            qty > 0 ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20' : 'border-slate-100 dark:border-slate-800'
                          }`}
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{extra.name}</p>
                            {extra.price > 0 && (
                              <p className="text-xs font-bold mt-0.5" style={{ color: P }}>+{formatCurrency(extra.price)}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => changeExtraQty(extra, -1)}
                              disabled={qty === 0}
                              className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 disabled:opacity-30"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" /></svg>
                            </button>
                            <span className="w-5 text-center text-sm font-bold text-slate-900 dark:text-white">{qty}</span>
                            <button
                              onClick={() => changeExtraQty(extra, 1)}
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                              style={{ backgroundColor: P }}
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Botão adicionar */}
            <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button
                onClick={confirmExtras}
                className="w-full h-14 font-bold rounded-2xl text-white shadow-lg transition flex items-center justify-between px-6 active:scale-[0.98]"
                style={{ backgroundColor: P }}
              >
                <span>Adicionar ao carrinho</span>
                <span className="font-black text-lg">{formatCurrency(detailItemTotal)}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Waiter Modal */}
      {showWaiterModal && (
        <WaiterModal
          mesa={mesa}
          onClose={() => setShowWaiterModal(false)}
          onConfirm={confirmWaiterCall}
          status={callStatus}
          onReset={() => setCallStatus('idle')}
        />
      )}

      {/* Alerta de mensagem do garçom (fullscreen com som) */}
      {tableAlert && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border dark:border-slate-800">
            <div className="bg-blue-500 dark:bg-blue-600 p-5 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-white/80 text-xs font-bold uppercase tracking-widest">Mensagem do Garçom</p>
            </div>
            <div className="p-6 text-center">
              <p className="text-lg font-bold text-gray-900 dark:text-white leading-snug mb-6">{tableAlert}</p>
              <button
                onClick={() => {
                  setTableAlert(null);
                  const audio = alertAudioRef.current;
                  if (audio) { audio.pause(); audio.currentTime = 0; audio.loop = false; }
                }}
                className="w-full h-12 bg-blue-500 text-white font-bold rounded-xl active:scale-95 transition-all shadow-lg shadow-blue-500/30 text-sm"
              >
                OK, Entendi!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WaiterModal({ mesa, onClose, onConfirm, status, onReset }: { mesa?: string; onClose: () => void; onConfirm: (m: string) => void; status: 'idle' | 'loading' | 'success' | 'error'; onReset: () => void }) {
  const [modalMesa, setModalMesa] = useState('');
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xs bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border dark:border-slate-800">
        <div className="flex justify-between items-center pt-3 px-5">
          <ThemeToggle />
          <div className="w-8" />
        </div>
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-950/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🛎️</span>
          </div>

          {status === 'idle' && (
            <>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Chamar Garçom</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                {mesa ? `Confirmar chamada para a mesa ${mesa}?` : 'Informe o número da sua mesa para que possamos te encontrar.'}
              </p>

              {!mesa && (
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoFocus
                  value={modalMesa}
                  onChange={(e) => setModalMesa(e.target.value)}
                  placeholder="Ex: 12, Balcão..."
                  className="w-full h-12 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 text-center text-lg font-bold mb-4 focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-slate-900 dark:text-white"
                />
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={onClose}
                  className="h-12 rounded-xl font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 active:scale-95 transition-all hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => onConfirm(mesa || modalMesa)}
                  disabled={!mesa && !modalMesa.trim()}
                  className="h-12 rounded-xl font-bold text-white bg-orange-500 shadow-lg shadow-orange-500/30 active:scale-95 transition-all disabled:opacity-50"
                >
                  Chamar
                </button>
              </div>
            </>
          )}

          {status === 'loading' && (
            <div className="py-8 flex flex-col items-center">
              <div className="w-8 h-8 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mb-4" />
              <p className="font-bold text-slate-700">Enviando sinal...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="py-4 animate-in zoom-in duration-300">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-1">Solicitado!</h3>
              <p className="text-sm text-slate-500">O garçom já foi avisado e virá até você.</p>
            </div>
          )}

          {status === 'error' && (
            <div className="py-4 text-center">
               <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">!</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">Ops!</h3>
              <p className="text-sm text-slate-500 mb-6">Não conseguimos chamar o garçom agora.</p>
              <button onClick={onReset} className="w-full h-11 bg-slate-100 rounded-xl font-bold text-slate-700">Tentar de novo</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Banner de Fila de Espera (aparece se mesas cheias) ─── */
function QueueBanner({ vendorId }: { vendorId: string }) {
  const [data, setData] = useState<{ freeTables: number; waitingCount: number; totalTables: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch(`/api/queue?vendor_id=${vendorId}`);
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setData(json.stats);
      } catch {}
    }
    check();
    const timer = setInterval(check, 15000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [vendorId]);

  if (!data || data.totalTables === 0) return null;
  if (data.freeTables > 0 && data.waitingCount === 0) return null;

  const isFull = data.freeTables === 0;

  return (
    <Link
      href={`/menu/${vendorId}/fila`}
      className={`mx-4 mb-2 flex items-center justify-between rounded-xl px-3 py-2.5 transition-all ${isFull ? 'bg-red-50 border border-red-200' : 'bg-purple-50 border border-purple-200'}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{isFull ? '⏳' : '📋'}</span>
        <div>
          <p className={`text-xs font-bold ${isFull ? 'text-red-700' : 'text-purple-700'}`}>
            {isFull ? 'Mesas lotadas' : `${data.waitingCount} na fila`}
          </p>
          <p className={`text-[10px] ${isFull ? 'text-red-500' : 'text-purple-500'}`}>
            {isFull ? `${data.waitingCount} pessoa${data.waitingCount !== 1 ? 's' : ''} aguardando` : 'Toque para ver sua posição'}
          </p>
        </div>
      </div>
      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${isFull ? 'bg-red-500 text-white' : 'bg-purple-500 text-white'}`}>
        Entrar na Fila →
      </span>
    </Link>
  );
}
