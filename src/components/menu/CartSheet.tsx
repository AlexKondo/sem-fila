'use client';

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import type { Vendor } from '@/types/database';
import { createClient } from '@/lib/supabase/client';

const STORAGE_KEY = 'qp_customer';
const P = '#ec5b13';

interface Extra { name: string; price: number; }
interface CartItem { id: string; menuItemId: string; name: string; price: number; quantity: number; extras?: Extra[]; }

interface CartSheetProps { vendor: Vendor; tableNumber?: string; }
type Step = 'cart' | 'identify' | 'pix';

/* ─── Cart Item Row (memoizado) ─── */
const CartItemRow = memo(function CartItemRow({ item, onUpdateQty, onRemove }: {
  item: CartItem;
  onUpdateQty: (id: string, d: number) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 leading-tight">{item.name}</p>
        {item.extras && item.extras.length > 0 && (() => {
          const grouped: Record<string, { price: number; qty: number }> = {};
          item.extras.forEach(e => {
            if (grouped[e.name]) grouped[e.name].qty++;
            else grouped[e.name] = { price: e.price, qty: 1 };
          });
          const extrasTotal = item.extras.reduce((s, e) => s + e.price, 0);
          const basePrice = item.price - extrasTotal;
          return (
            <div className="flex flex-col gap-0.5 mt-1">
              <span className="text-[10px] font-bold text-slate-500">
                🍽 Prato {formatCurrency(basePrice)}
              </span>
              {Object.entries(grouped).map(([name, { price, qty }]) => (
                <span key={name} className="text-[10px] font-bold text-orange-600">
                  {qty > 1 ? `${qty}x ` : '+'}{name} {formatCurrency(price)}{qty > 1 ? ` = ${formatCurrency(price * qty)}` : ''}
                </span>
              ))}
            </div>
          );
        })()}
        <p className="text-xs text-slate-400 mt-0.5">{formatCurrency(item.price)} cada</p>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => onUpdateQty(item.id, -1)} className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" /></svg>
        </button>
        <span className="text-sm font-bold text-slate-900 w-5 text-center">{item.quantity}</span>
        <button onClick={() => onUpdateQty(item.id, 1)} className="w-7 h-7 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: P }}>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
        </button>
      </div>
      <span className="text-sm font-bold text-slate-900 w-16 text-right">{formatCurrency(item.price * item.quantity)}</span>
      <button onClick={() => onRemove(item.id)} className="text-slate-300 hover:text-red-400 transition">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
});

/* ─── CPF Input (isolado para nao re-renderizar o cart inteiro) ─── */
const CpfInput = memo(function CpfInput({ value, onChange, style }: { value: string; onChange: (v: string) => void; style?: React.CSSProperties }) {
  return (
    <input
      type="text"
      inputMode="numeric"
      value={value}
      onChange={e => {
        const d = e.target.value.replace(/\D/g, '').substring(0, 11);
        let f = d;
        if (f.length > 9) f = `${f.substring(0, 3)}.${f.substring(3, 6)}.${f.substring(6, 9)}-${f.substring(9)}`;
        else if (f.length > 6) f = `${f.substring(0, 3)}.${f.substring(3, 6)}.${f.substring(6)}`;
        else if (f.length > 3) f = `${f.substring(0, 3)}.${f.substring(3)}`;
        onChange(f);
      }}
      placeholder="000.000.000-00"
      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-11 text-sm focus:outline-none focus:ring-2"
      style={style}
    />
  );
});

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
  const [mesa, setMesa] = useState(tableNumber || '');

  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cartão' | 'dinheiro' | ''>('');
  const [pixData, setPixData] = useState<{ payment_id: string; qr_code: string; copy_paste: string; order_id: string } | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [pixSimulating, setPixSimulating] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [savedCardToken, setSavedCardToken] = useState('');
  const [savedCardLast4, setSavedCardLast4] = useState('');
  const [useNewCard, setUseNewCard] = useState(false);

  // Estados de Autenticação
  const [user, setUser] = useState<any>(null);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthdayDay, setBirthdayDay] = useState('');
  const [birthdayMonth, setBirthdayMonth] = useState('');

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
            setBirthdayDay(p.birthday_day?.toString() || '');
            setBirthdayMonth(p.birthday_month?.toString() || '');
            setSavedCardToken(p.asaas_card_token || '');
            setSavedCardLast4(p.asaas_card_last4 || '');
          }
        });
      }
    });
  }, []);

  const addItem = useCallback((item: { id: string; menuItemId?: string; name: string; price: number; extras?: Extra[] }) => {
    setItems(prev => {
      const ex = prev.find(i => i.id === item.id);
      if (ex) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, menuItemId: item.menuItemId ?? item.id, quantity: 1, extras: item.extras ?? [] }];
    });
  }, []);

  useEffect(() => {
    function onAddToCart(e: MouseEvent) {
      const btn = (e.target as Element).closest('[data-add-to-cart]');
      if (!btn) return;
      addItem(JSON.parse((btn as HTMLElement).dataset.addToCart!));
    }
    function onCustomAddToCart(e: Event) {
      addItem((e as CustomEvent).detail);
    }
    document.addEventListener('click', onAddToCart);
    document.addEventListener('add-to-cart', onCustomAddToCart);
    return () => {
      document.removeEventListener('click', onAddToCart);
      document.removeEventListener('add-to-cart', onCustomAddToCart);
    };
  }, [addItem]);

  const updateQty = useCallback((id: string, d: number) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: i.quantity + d } : i).filter(i => i.quantity > 0));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  // Memoiza calculos de totais
  const { subtotal, count, serviceFee, couvertFee, total } = useMemo(() => {
    const sub = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const cnt = items.reduce((s, i) => s + i.quantity, 0);
    const svc = items.length > 0 ? (sub * ((vendor as any).service_fee_percentage || 0)) / 100 : 0;
    const cvt = items.length > 0 ? Number((vendor as any).couvert_fee || 0) : 0;
    return { subtotal: sub, count: cnt, serviceFee: svc, couvertFee: cvt, total: sub + svc + cvt };
  }, [items, vendor]);

  function handleConfirm() {
    if (loading) return;
    setError('');
    if (!items.length) return;
    if (!paymentMethod) { setError('Por favor, selecione uma forma de pagamento.'); return; }
    if (paymentMethod === 'pix' && cpf.replace(/\D/g, '').length !== 11) { setError('Informe seu CPF para pagar com PIX.'); return; }
    if (paymentMethod === 'cartão') {
      const usingSaved = savedCardToken && !useNewCard;
      if (!usingSaved) {
        if (cardNumber.replace(/\s/g, '').length < 16) { setError('Número do cartão inválido.'); return; }
        if (!cardHolder.trim()) { setError('Informe o nome impresso no cartão.'); return; }
        if (cardExpiry.length < 5) { setError('Data de validade inválida (MM/AA).'); return; }
        if (cardCvv.length < 3) { setError('CVV inválido.'); return; }
        if (cpf.replace(/\D/g, '').length !== 11) { setError('Informe seu CPF para pagar com cartão.'); return; }
      }
    }
    if (vendor.table_delivery && !mesa.trim()) { setError('Por favor, informe o número da mesa para entrega.'); return; }

    setLoading(true);
    if (user) {
      if (customerName.trim()) placeOrder(customerName.trim(), customerPhone.trim());
      else { setStep('identify'); setLoading(false); }
    } else {
      setStep('identify');
      setLoading(false);
    }
  }

  async function handleIdentify(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    const supabase = createClient();

    if (isLogin) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); setLoading(false); return; }

      const { data: p } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
      if (p) { setCustomerName(p.name); setCustomerPhone(p.phone); setCpf(p.cpf || ''); }
      setUser(data.user);
      placeOrder(p?.name || '', p?.phone || '');
    } else {
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
          birthday_day: birthdayDay ? parseInt(birthdayDay) : null,
          birthday_month: birthdayMonth ? parseInt(birthdayMonth) : null,
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
        body: JSON.stringify({
          vendor_id: vendor.id,
          table_number: mesa.trim() || null,
          notes: notesStr || null,
          payment_method: paymentMethod || undefined,
          customer_name: name || undefined,
          customer_cpf: cpf.replace(/\D/g, '') || undefined,
          customer_email: email || undefined,
          use_saved_card: paymentMethod === 'cartão' && !!savedCardToken && !useNewCard,
          card_number: paymentMethod === 'cartão' && (!savedCardToken || useNewCard) ? cardNumber.replace(/\s/g, '') : undefined,
          card_holder: paymentMethod === 'cartão' && (!savedCardToken || useNewCard) ? cardHolder : undefined,
          card_expiry_month: paymentMethod === 'cartão' && (!savedCardToken || useNewCard) ? cardExpiry.split('/')[0] : undefined,
          card_expiry_year: paymentMethod === 'cartão' && (!savedCardToken || useNewCard) ? `20${cardExpiry.split('/')[1]}` : undefined,
          card_cvv: paymentMethod === 'cartão' && (!savedCardToken || useNewCard) ? cardCvv : undefined,
          items: items.map(i => ({
            menu_item_id: i.menuItemId || i.id,
            quantity: i.quantity,
            extras: i.extras || []
          }))
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Erro ao fazer pedido.'); setLoading(false); return; }

      if (data.pix) {
        setPixData({ ...data.pix, order_id: data.order_id });
        setStep('pix');
        setLoading(false);
        return;
      }

      router.push(`/profile/orders?payment=success&new_order=${data.order_id}`);
    } catch (err: any) {
      setError('Problema na conexão. Tente novamente.');
      setLoading(false);
    }
  }

  if (count === 0) return null;

  const ringStyle = { '--tw-ring-color': P } as React.CSSProperties;

  return (
    <>
      {/* Floating cart button */}
      {!isOpen && (
        <div className="fixed bottom-6 left-0 right-0 px-4 flex justify-center z-40 max-w-md mx-auto">
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

      {/* Sheet */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsOpen(false)} />
          <div className="relative bg-white rounded-t-3xl max-h-[90vh] flex flex-col">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-slate-200 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 pb-3 border-b border-slate-100">
              <h2 className="font-bold text-slate-900 text-lg">{step === 'identify' ? 'Seus dados' : step === 'pix' ? 'Pagamento PIX' : 'Seu pedido'}</h2>
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
                    <CartItemRow key={item.id} item={item} onUpdateQty={updateQty} onRemove={removeItem} />
                  ))}
                  <div className="pt-1">
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Observações (opcional)</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} maxLength={500} rows={2} placeholder="Ex: sem cebola, bem passado…"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2" style={ringStyle} />
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
                    {paymentMethod === 'cartão' && (
                      <div className="mt-3 space-y-2">
                        {savedCardToken && !useNewCard ? (
                          <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
                            <div className="flex items-center gap-2">
                              <span>💳</span>
                              <span className="text-sm font-semibold text-slate-700">•••• •••• •••• {savedCardLast4}</span>
                            </div>
                            <button type="button" onClick={() => setUseNewCard(true)} className="text-xs font-bold" style={{ color: P }}>Trocar</button>
                          </div>
                        ) : (
                          <>
                            {savedCardToken && (
                              <button type="button" onClick={() => setUseNewCard(false)} className="text-xs text-slate-400 mb-1">← Usar cartão salvo ••••{savedCardLast4}</button>
                            )}
                            <input
                              type="text" inputMode="numeric" value={cardNumber} placeholder="0000 0000 0000 0000" maxLength={19}
                              onChange={e => {
                                const d = e.target.value.replace(/\D/g, '').substring(0, 16);
                                setCardNumber(d.replace(/(.{4})/g, '$1 ').trim());
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-11 text-sm focus:outline-none focus:ring-2"
                              style={ringStyle}
                            />
                            <input
                              type="text" value={cardHolder} placeholder="Nome impresso no cartão"
                              onChange={e => setCardHolder(e.target.value.toUpperCase())}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-11 text-sm focus:outline-none focus:ring-2"
                              style={ringStyle}
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text" inputMode="numeric" value={cardExpiry} placeholder="MM/AA" maxLength={5}
                                onChange={e => {
                                  const d = e.target.value.replace(/\D/g, '').substring(0, 4);
                                  setCardExpiry(d.length > 2 ? `${d.substring(0, 2)}/${d.substring(2)}` : d);
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-11 text-sm focus:outline-none focus:ring-2"
                                style={ringStyle}
                              />
                              <input
                                type="text" inputMode="numeric" value={cardCvv} placeholder="CVV" maxLength={4}
                                onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').substring(0, 4))}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-11 text-sm focus:outline-none focus:ring-2"
                                style={ringStyle}
                              />
                            </div>
                            <CpfInput value={cpf} onChange={setCpf} style={ringStyle} />
                            <p className="text-[10px] text-slate-400">🔒 Seus dados são criptografados e não armazenamos o número do cartão.</p>
                          </>
                        )}
                      </div>
                    )}
                    {paymentMethod === 'pix' && (
                      <div className="mt-3">
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">CPF <span className="text-red-500">*</span> <span className="font-normal text-slate-400">(obrigatório para PIX)</span></label>
                        <CpfInput value={cpf} onChange={setCpf} style={ringStyle} />
                      </div>
                    )}
                  </div>

                  {(vendor as any).table_delivery && (() => {
                    const numTables = (vendor as any).num_tables || 0;
                    return (
                      <div className="pt-2">
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                          🛋️ Mesa / Localização <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={mesa}
                          onChange={e => setMesa(e.target.value)}
                          className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 appearance-none"
                          style={{ '--tw-ring-color': P, color: mesa ? '#0f172a' : '#94a3b8' } as React.CSSProperties}
                        >
                          <option value="" disabled>Escolha o número da mesa ou Para Viagem</option>
                          <option value="Para Viagem">🛍️ Para Viagem</option>
                          {numTables > 0
                            ? Array.from({ length: numTables }, (_, i) => i + 1).map(n => (
                                <option key={n} value={String(n)}>Mesa {n}</option>
                              ))
                            : null
                          }
                        </select>
                      </div>
                    );
                  })()}
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

                  {(serviceFee > 0 || couvertFee > 0) && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700">Subtotal dos produtos</span>
                      <span className="font-bold text-sm text-slate-800">{formatCurrency(subtotal)}</span>
                    </div>
                  )}

                  {serviceFee > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">Taxa de serviço ({(vendor as any).service_fee_percentage}%)</span>
                      <span className="font-medium text-sm text-slate-700">{formatCurrency(serviceFee)}</span>
                    </div>
                  )}
                  {couvertFee > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">Couvert Artístico</span>
                      <span className="font-medium text-sm text-slate-700">{formatCurrency(couvertFee)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-2">
                    <span className="text-sm font-bold text-slate-900">Total</span>
                    <span className="font-black text-xl text-slate-900">{formatCurrency(total)}</span>
                  </div>
                  <button onClick={handleConfirm} disabled={loading}
                    className="w-full h-14 font-bold rounded-xl text-white shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ backgroundColor: P }}>
                    {loading ? 'Enviando…' : <>Confirmar pedido <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg></>}
                  </button>
                </div>
              </>
            )}

            {step === 'pix' && pixData && (
              <div className="flex flex-col flex-1 overflow-y-auto px-5 py-6 items-center text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-2xl font-black" style={{ backgroundColor: P }}>
                  ₱
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-lg">Pague com PIX</p>
                  <p className="text-xs text-slate-400 mt-1">Escaneie o QR code ou copie a chave abaixo</p>
                </div>

                {pixData.qr_code && (
                  <img
                    src={`data:image/png;base64,${pixData.qr_code}`}
                    alt="QR Code PIX"
                    className="w-48 h-48 rounded-2xl border border-slate-100 shadow-sm"
                  />
                )}

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(pixData.copy_paste);
                    setPixCopied(true);
                    setTimeout(() => setPixCopied(false), 3000);
                  }}
                  className="w-full py-3 rounded-xl border border-dashed border-orange-300 bg-orange-50 text-xs font-bold text-orange-600 break-all px-3"
                >
                  {pixCopied ? '✓ Copiado!' : '📋 Copiar chave PIX'}
                </button>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Após o pagamento, seu pedido será confirmado automaticamente.
                </p>

                <button
                  onClick={async () => {
                    setPixSimulating(true);
                    await fetch('/api/payments/simulate', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ payment_id: pixData.payment_id }),
                    });
                    setTimeout(() => {
                      router.push(`/profile/orders?payment=success&new_order=${pixData.order_id}`);
                    }, 1500);
                  }}
                  disabled={pixSimulating}
                  className="w-full py-3 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold disabled:opacity-50"
                >
                  {pixSimulating ? 'Simulando pagamento…' : '🧪 Simular pagamento (sandbox)'}
                </button>
              </div>
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
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 h-12 text-sm focus:outline-none focus:ring-2" style={ringStyle} />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">CPF <span className="text-red-400">*</span></label>
                        <CpfInput value={cpf} onChange={setCpf} style={ringStyle} />
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
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 h-12 text-sm focus:outline-none focus:ring-2" style={ringStyle} />
                      </div>

                      <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100">
                        <label className="block text-sm font-bold text-slate-800 mb-2">🎁 Data de Aniversário</label>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1 ml-1">Dia</p>
                            <input type="number" min="1" max="31" value={birthdayDay} onChange={e => setBirthdayDay(e.target.value)} placeholder="01"
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 h-11 text-sm focus:outline-none" />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1 ml-1">Mês</p>
                            <select value={birthdayMonth} onChange={e => setBirthdayMonth(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 h-11 text-sm focus:outline-none">
                              <option value="">Mês</option>
                              {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].map((m, i) => (
                                <option key={m} value={i+1}>{m}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-3 leading-relaxed">
                          * Usaremos sua data para futuras promoções exclusivas.
                          <span className="block font-semibold">O benefício está sujeito a comprovação com documento oficial no dia.</span>
                        </p>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">E-mail <span className="text-red-400">*</span></label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 h-12 text-sm focus:outline-none focus:ring-2" style={ringStyle} />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Senha <span className="text-red-400">*</span></label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 h-12 text-sm focus:outline-none focus:ring-2" style={ringStyle} />
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
