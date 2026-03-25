'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import type { Vendor } from '@/types/database';
import { createClient } from '@/lib/supabase/client';

const STORAGE_KEY = 'qp_customer';
const P = '#ec5b13';

interface CartItem { id: string; name: string; price: number; quantity: number; }
interface CartSheetProps { vendor: Vendor; tableNumber?: string; }
type Step = 'cart' | 'identify';

export default function CartSheet({ vendor, tableNumber }: CartSheetProps) {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<Step>('cart');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cartão' | 'dinheiro' | ''>('');

  // Estados de Autenticação
  const [user, setUser] = useState<any>(null);
  const [isLogin, setIsLogin] = useState(true); // Alterna entre Cadastro e Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cpf, setCpf] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        supabase.from('profiles').select('*').eq('id', data.user.id).single().then(({ data: p }) => {
          if (p) { 
            setCustomerName(p.name || ''); 
            setCustomerPhone(p.phone || ''); 
            setCpf(p.cpf || ''); 
          }
        });
      }
    });
  }, []);

  useEffect(() => {
    function onAddToCart(e: MouseEvent) {
      const btn = (e.target as Element).closest('[data-add-to-cart]');
      if (!btn) return;
      addItem(JSON.parse((btn as HTMLElement).dataset.addToCart!));
    }
    document.addEventListener('click', onAddToCart);
    return () => document.removeEventListener('click', onAddToCart);
  }, []);

  const addItem = useCallback((item: { id: string; name: string; price: number }) => {
    setItems(prev => {
      const ex = prev.find(i => i.id === item.id);
      if (ex) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
  }, []);

  function updateQty(id: string, d: number) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: i.quantity + d } : i).filter(i => i.quantity > 0));
  }

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  function handleConfirm() {
    setError('');
    if (!items.length) return;
    if (!paymentMethod) { setError('Por favor, selecione uma forma de pagamento.'); return; }
    if (user) {
      if (customerName.trim()) placeOrder(customerName.trim(), customerPhone.trim());
      else setStep('identify');
    } else {
      setStep('identify');
    }
  }

  async function handleIdentify(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    const supabase = createClient();

    if (isLogin) {
      // Fluxo Login
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); setLoading(false); return; }
      
      const { data: p } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
      if (p) { setCustomerName(p.name); setCustomerPhone(p.phone); setCpf(p.cpf || ''); }
      setUser(data.user);
      placeOrder(p?.name || '', p?.phone || '');
    } else {
      // Fluxo Cadastro
      if (!customerName.trim()) { setError('Por favor, informe seu nome.'); setLoading(false); return; }
      const cleanCpf = cpf.replace(/\D/g, '');
      if (cleanCpf.length !== 11) { setError('CPF inválido. Digite os 11 números.'); setLoading(false); return; }
      if (!email.trim() || !password.trim()) { setError('E-mail e Senha são obrigatórios.'); setLoading(false); return; }

      const { data, error } = await supabase.auth.signUp({
        email, 
        password,
        options: { data: { name: customerName.trim() } }
      });

      if (error) { setError(error.message); setLoading(false); return; }

      if (data.user) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          name: customerName.trim(),
          phone: customerPhone.replace(/\D/g, ''),
          cpf: cleanCpf,
          role: 'customer'
        });
        setUser(data.user);
        placeOrder(customerName.trim(), customerPhone.trim());
      }
    }
    setLoading(false);
  }

  async function placeOrder(name: string, phone: string) {
    if (!items.length) return;
    setError(''); setLoading(true);
    const notesStr = [
      name ? `Cliente: ${name}` : '', 
      phone ? `Tel: ${phone}` : '', 
      `Pagamento: ${paymentMethod.toUpperCase()}`, 
      notes.trim()
    ].filter(Boolean).join(' | ');

    try {
      const res = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: vendor.id, table_number: tableNumber, notes: notesStr || null, items: items.map(i => ({ menu_item_id: i.id, quantity: i.quantity })) }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Erro ao fazer pedido.'); setLoading(false); return; }
      router.push(`/order/${data.order_id}`);
    } catch (err: any) {
      setError('Problema na conexão. Tente novamente.');
      setLoading(false);
    }
  }

  if (count === 0) return null;

  return (
    <>
      {/* Floating cart button — laranja como no asset */}
      {!isOpen && (
        <div className="fixed bottom-20 left-0 right-0 px-4 flex justify-center z-40 max-w-md mx-auto">
          <button
            onClick={() => { setIsOpen(true); setStep('cart'); }}
            className="w-full font-bold py-4 rounded-xl shadow-xl flex justify-between items-center px-6 text-white transition hover:opacity-95"
            style={{ backgroundColor: P }}
          >
            <div className="flex flex-col items-start leading-none">
              <span className="text-xs opacity-80 font-medium">Ver carrinho</span>
              <span className="text-lg">{count} {count === 1 ? 'item' : 'itens'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">{formatCurrency(total)}</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
          </button>
        </div>
      )}

      {/* Bottom nav placeholder */}
      {!isOpen && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 max-w-md mx-auto">
          <div className="flex justify-around items-center px-4 py-2">
            <a className="flex flex-col items-center gap-1 py-1" style={{ color: P }} href="#">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <p className="text-[10px] font-bold uppercase tracking-wider">Menu</p>
            </a>
            <a className="flex flex-col items-center gap-1 py-1 text-slate-400 relative" href="#">
              <div className="relative">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] text-white font-bold" style={{ backgroundColor: P }}>{count}</span>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider">Pedido</p>
            </a>
            <a className="flex flex-col items-center gap-1 py-1 text-slate-400" href="#">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <p className="text-[10px] font-bold uppercase tracking-wider">Perfil</p>
            </a>
          </div>
          <div className="h-6 bg-white" />
        </nav>
      )}

      {/* Sheet */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsOpen(false)} />
          <div className="relative bg-white rounded-t-3xl max-h-[90vh] flex flex-col">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-slate-200 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 pb-3 border-b border-slate-100">
              <h2 className="font-bold text-slate-900 text-lg">{step === 'identify' ? 'Seus dados' : 'Seu pedido'}</h2>
              <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {step === 'cart' && (
              <>
                <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
                  {items.map(item => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 leading-tight">{item.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{formatCurrency(item.price)} cada</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" /></svg>
                        </button>
                        <span className="text-sm font-bold text-slate-900 w-5 text-center">{item.quantity}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: P }}>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                        </button>
                      </div>
                      <span className="text-sm font-bold text-slate-900 w-16 text-right">{formatCurrency(item.price * item.quantity)}</span>
                      <button onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))} className="text-slate-300 hover:text-red-400 transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                  <div className="pt-1">
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Observações (opcional)</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} maxLength={500} rows={2} placeholder="Ex: sem cebola, bem passado…"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2" style={{ '--tw-ring-color': P } as React.CSSProperties} />
                  </div>
                  
                  <div className="pt-2">
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Forma de pagamento <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-3 gap-2">
                      {vendor.accept_pix && (
                        <button type="button" onClick={() => setPaymentMethod('pix')} className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all ${paymentMethod === 'pix' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-slate-200 text-slate-600 bg-white'}`}>Pix</button>
                      )}
                      {vendor.accept_card && (
                        <button type="button" onClick={() => setPaymentMethod('cartão')} className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all ${paymentMethod === 'cartão' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-slate-200 text-slate-600 bg-white'}`}>Cartão</button>
                      )}
                      {vendor.accept_cash && (
                        <button type="button" onClick={() => setPaymentMethod('dinheiro')} className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all ${paymentMethod === 'dinheiro' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-slate-200 text-slate-600 bg-white'}`}>Dinheiro</button>
                      )}
                    </div>
                  </div>
                  {customerName && (
                    <button onClick={() => setStep('identify')} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      Pedindo como <span className="font-semibold text-slate-700">{customerName}</span>
                      <span style={{ color: P }}>· alterar</span>
                    </button>
                  )}
                </div>
                <div className="px-5 py-4 border-t border-slate-100 space-y-3">
                  {error && <div className="bg-red-50 text-red-700 text-xs px-3 py-2 rounded-lg">{error}</div>}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Total</span>
                    <span className="font-bold text-xl text-slate-900">{formatCurrency(total)}</span>
                  </div>
                  <button onClick={handleConfirm} disabled={loading}
                    className="w-full h-14 font-bold rounded-xl text-white shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ backgroundColor: P }}>
                    {loading ? 'Enviando…' : <>Confirmar pedido <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg></>}
                  </button>
                </div>
              </>
            )}

            {step === 'identify' && (
              <form onSubmit={handleIdentify} className="flex flex-col flex-1">
                <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4 no-scrollbar">
                  <p className="text-xs text-slate-400">
                    {isLogin ? 'Faça login para prosseguir com seu pedido.' : 'Para sua segurança, crie uma conta rápida para fazer o pedido.'}
                  </p>

                  {!isLogin && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Seu nome <span className="text-red-400">*</span></label>
                        <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Como você se chama?" autoFocus
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 h-12 text-sm focus:outline-none focus:ring-2" style={{ '--tw-ring-color': P } as React.CSSProperties} />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">CPF <span className="text-red-400">*</span></label>
                        <input type="text" value={cpf} onChange={e => {
                          const digits = e.target.value.replace(/\D/g, '').substring(0, 11);
                          let f = digits;
                          if (f.length > 9) f = `${f.substring(0, 3)}.${f.substring(3, 6)}.${f.substring(6, 9)}-${f.substring(9)}`;
                          else if (f.length > 6) f = `${f.substring(0, 3)}.${f.substring(3, 6)}.${f.substring(6)}`;
                          else if (f.length > 3) f = `${f.substring(0, 3)}.${f.substring(3)}`;
                          setCpf(f);
                        }} placeholder="000.000.000-00"
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 h-12 text-sm focus:outline-none focus:ring-2" style={{ '--tw-ring-color': P } as React.CSSProperties} />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Telefone <span className="text-slate-400 font-normal">(opcional)</span></label>
                        <input type="tel" value={customerPhone} onChange={e => {
                          const digits = e.target.value.replace(/\D/g, '').substring(0, 11);
                          let f = digits;
                          if (f.length > 7) f = `(${f.substring(0, 2)}) ${f.substring(2, 7)}-${f.substring(7)}`;
                          else if (f.length > 6) f = `(${f.substring(0, 2)}) ${f.substring(2, 6)}-${f.substring(6)}`;
                          else if (f.length > 2) f = `(${f.substring(0, 2)}) ${f.substring(2)}`;
                          setCustomerPhone(f);
                        }} placeholder="(11) 99999-9999"
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 h-12 text-sm focus:outline-none focus:ring-2" style={{ '--tw-ring-color': P } as React.CSSProperties} />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">E-mail <span className="text-red-400">*</span></label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 h-12 text-sm focus:outline-none focus:ring-2" style={{ '--tw-ring-color': P } as React.CSSProperties} />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Senha <span className="text-red-400">*</span></label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 h-12 text-sm focus:outline-none focus:ring-2" style={{ '--tw-ring-color': P } as React.CSSProperties} />
                  </div>
                </div>

                <div className="px-5 py-4 border-t border-slate-100 space-y-2">
                  {error && <div className="bg-red-50 text-red-700 text-xs px-3 py-2 rounded-lg">{error}</div>}
                  <button type="submit" disabled={loading} className="w-full h-14 font-bold rounded-xl text-white shadow-lg transition" style={{ backgroundColor: P }}>
                    {loading ? 'Processando…' : isLogin ? 'Confirmar e Pagar' : 'Finalizar Cadastro'}
                  </button>
                  <button type="button" onClick={() => setIsLogin(!isLogin)} className="w-full text-slate-600 font-bold text-xs py-1">
                    {isLogin ? 'Não tem conta? Cadastrar-se' : 'Já tem conta? Entrar'}
                  </button>
                  <button type="button" onClick={() => setStep('cart')} className="w-full text-slate-400 text-xs py-1">← Voltar na sacola</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
