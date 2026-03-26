'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import CartSheet from './CartSheet';
import type { MenuItem, Vendor } from '@/types/database';

const P = '#ec5b13';

interface MenuClientProps {
  vendor: Vendor;
  items: MenuItem[];
  mesa?: string;
  waitTime: string;
}

interface Extra { name: string; price: number; }

export default function MenuClient({ vendor, items, mesa, waitTime }: MenuClientProps) {
  const [selectedCat, setSelectedCat] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [customerName, setCustomerName] = useState<string | null>(null);
  
  // Extras Modal State
  const [extrasModal, setExtrasModal] = useState<MenuItem | null>(null);
  // Map of extra name -> quantity
  const [extraQty, setExtraQty] = useState<Record<string, number>>({});

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase.from('profiles').select('name, role').eq('id', data.user.id).single().then(({ data: p }) => {
          // Só exibe se NÃO for um perfil de fornecedor/vendor
          if (p?.name && p.role !== 'vendor') {
            setCustomerName(p.name.split(' ')[0]);
          }
        });
      }
    });
  }, []);

  // Custom Waiter Modal State
  const [showWaiterModal, setShowWaiterModal] = useState(false);
  const [modalMesa, setModalMesa] = useState(mesa || '');
  const [callStatus, setCallStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Intercepts the add-to-cart click to show extras modal if needed
  function handleAddToCart(item: MenuItem) {
    const extras = (item as any).extras as Extra[] | undefined;
    if (extras && extras.length > 0) {
      setExtraQty({});
      setExtrasModal(item);
    } else {
      document.dispatchEvent(new CustomEvent('add-to-cart', { detail: { id: item.id, menuItemId: item.id, name: item.name, price: item.price } }));
    }
  }

  function confirmExtras() {
    if (!extrasModal) return;
    const allExtras = (extrasModal as any).extras as Extra[];
    // Build flat array of extras from quantities map
    const chosenExtras: Extra[] = [];
    allExtras.forEach(e => {
      const qty = extraQty[e.name] || 0;
      for (let i = 0; i < qty; i++) chosenExtras.push(e);
    });
    const extrasTotal = chosenExtras.reduce((s, e) => s + e.price, 0);
    document.dispatchEvent(new CustomEvent('add-to-cart', { detail: {
      // Unique cart ID (includes extras for deduplication)
      id: extrasModal.id + (chosenExtras.length ? '-' + Object.entries(extraQty).filter(([,q])=>q>0).map(([n,q])=>`${n}x${q}`).join('_') : ''),
      // Original UUID for the API
      menuItemId: extrasModal.id,
      name: extrasModal.name,
      price: extrasModal.price + extrasTotal,
      extras: chosenExtras,
    }}));
    setExtrasModal(null);
  }

  function changeExtraQty(extra: Extra, delta: number) {
    setExtraQty(prev => {
      const cur = prev[extra.name] || 0;
      const next = Math.max(0, cur + delta);
      return { ...prev, [extra.name]: next };
    });
  }

  async function handleCallWaiter() {
    setCallStatus('idle');
    setModalMesa(mesa || '');
    setShowWaiterModal(true);
  }

  async function confirmWaiterCall() {
    if (!modalMesa.trim()) return;
    setCallStatus('loading');
    
    const supabase = createClient();
    const { error } = await supabase.from('waiter_calls').insert({
      vendor_id: vendor.id,
      table_number: modalMesa,
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
  }

  // Extrai categorias únicas cadastradas nos itens do cardápio
  const categories = ['Todos', ...Array.from(new Set(items.map(i => i.category).filter((c): c is string => !!c)))];

  const filteredItems = searchQuery.trim()
    ? items.filter(i =>
        i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (i.description ?? '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : selectedCat === 'Todos'
      ? items
      : items.filter(i => i.category === selectedCat);

  return (
    <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto pb-24" style={{ backgroundColor: '#f8f6f6' }}>
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

          <div className="flex items-center gap-2">


            <div>
            {customerName ? (
              <Link href="/profile?edit=true" className="flex items-center gap-1.5 bg-orange-50 border border-orange-200/50 rounded-xl px-3 py-1.5 text-xs font-black text-orange-600 shadow-sm active:scale-95 transition-all">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-pulse" />
                <span>{customerName.toUpperCase()}</span>
              </Link>
            ) : (
              <Link href="/register-user" className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 active:scale-95 transition-all shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </Link>
            )}
          </div>
        </div>
      </div>

        {/* Search bar + Help */}
        <div className="px-4 pb-3 flex items-center gap-2">
          <div className="flex-1 flex items-center rounded-xl h-12 bg-slate-100 border-none gap-3 px-4">
            <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              placeholder="Buscar no cardápio…" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-slate-800 w-full text-base"
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
              className="h-14 w-48 shrink-0 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold text-slate-500 hover:text-orange-600 hover:border-orange-200 transition-all active:scale-95 shadow-md disabled:opacity-50"
            >
              <span className="text-xl leading-none">🛎️</span>
              <span className="leading-tight whitespace-nowrap">Chamar Garçom</span>
            </button>
          )}
        </div>

        {/* Category tabs dinâmicas */}
        <div className="overflow-x-auto no-scrollbar">
          <div className="flex px-4 gap-6 border-b border-slate-100">
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
        <h3 className="text-lg font-bold text-slate-900">{selectedCat === 'Todos' ? 'Cardápio Completo' : selectedCat}</h3>

        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-sm">
            <p className="text-4xl mb-3">🍽️</p>
            <p className="text-slate-400 text-sm">Nenhum item disponível nesta categoria.</p>
          </div>
        ) : (
          filteredItems.map((item: MenuItem) => (
            <div key={item.id} className="flex gap-4 p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
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
                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => handleAddToCart(item)}
                    className="px-4 py-1.5 text-xs font-bold rounded-full flex items-center gap-1 transition-colors hover:opacity-90"
                    style={{ backgroundColor: '#ec5b131a', color: '#ec5b13' }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Adicionar
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </main>

      <CartSheet vendor={vendor} tableNumber={mesa} />

      {/* Extras Modal */}
      {extrasModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-slate-200 rounded-full" />
            </div>
            <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="font-bold text-slate-900">{extrasModal.name}</h2>
                <p className="text-sm" style={{ color: P }}>{formatCurrency(extrasModal.price)}</p>
              </div>
              <button onClick={() => setExtrasModal(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="px-5 py-4 max-h-64 overflow-y-auto">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Adicionais / Opcionais</p>
              <div className="space-y-2">
                {((extrasModal as any).extras as Extra[]).map((extra, idx) => {
                  const qty = extraQty[extra.name] || 0;
                  return (
                    <div
                      key={idx}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                        qty > 0 ? 'border-orange-500 bg-orange-50' : 'border-slate-100 bg-white'
                      }`}
                    >
                      <span className="text-sm font-semibold text-slate-800">{extra.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold" style={{ color: P }}>+{formatCurrency(extra.price)}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => changeExtraQty(extra, -1)}
                            disabled={qty === 0}
                            className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" /></svg>
                          </button>
                          <span className="w-5 text-center text-sm font-bold text-slate-900">{qty}</span>
                          <button
                            onClick={() => changeExtraQty(extra, 1)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                            style={{ backgroundColor: P }}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-100">
              <button
                onClick={confirmExtras}
                className="w-full h-14 font-bold rounded-xl text-white shadow-lg transition flex items-center justify-between px-6"
                style={{ backgroundColor: P }}
              >
                <span>Adicionar ao carrinho</span>
                <span className="font-black text-lg">
                  {formatCurrency(extrasModal.price + Object.entries(extraQty).reduce((s, [name, qty]) => {
                    const ex = ((extrasModal as any).extras as Extra[]).find(e => e.name === name);
                    return s + (ex ? ex.price * qty : 0);
                  }, 0))}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Waiter Modal */}
      {showWaiterModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xs bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🛎️</span>
              </div>
              
              {callStatus === 'idle' && (
                <>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Chamar Garçom</h3>
                  <p className="text-sm text-slate-500 mb-6">
                    {mesa ? `Confirmar chamada para a mesa ${mesa}?` : 'Informe o número da sua mesa para que possamos te encontrar.'}
                  </p>
                  
                  {!mesa && (
                    <input 
                      type="text" 
                      value={modalMesa}
                      onChange={(e) => setModalMesa(e.target.value)}
                      placeholder="Ex: 12, Balcão..."
                      className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-center text-lg font-bold mb-4 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    />
                  )}
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setShowWaiterModal(false)}
                      className="h-12 rounded-xl font-bold text-slate-500 bg-slate-100 active:scale-95 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={confirmWaiterCall}
                      disabled={!modalMesa.trim()}
                      className="h-12 rounded-xl font-bold text-white bg-orange-500 shadow-lg shadow-orange-500/30 active:scale-95 transition-all disabled:opacity-50"
                    >
                      Chamar
                    </button>
                  </div>
                </>
              )}

              {callStatus === 'loading' && (
                <div className="py-8 flex flex-col items-center">
                  <div className="w-8 h-8 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mb-4" />
                  <p className="font-bold text-slate-700">Enviando sinal...</p>
                </div>
              )}

              {callStatus === 'success' && (
                <div className="py-4 animate-in zoom-in duration-300">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">Solicitado!</h3>
                  <p className="text-sm text-slate-500">O garçom já foi avisado e virá até você.</p>
                </div>
              )}

              {callStatus === 'error' && (
                <div className="py-4 text-center">
                   <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold">!</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Ops!</h3>
                  <p className="text-sm text-slate-500 mb-6">Não conseguimos chamar o garçom agora.</p>
                  <button onClick={() => setCallStatus('idle')} className="w-full h-11 bg-slate-100 rounded-xl font-bold text-slate-700">Tentar de novo</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
