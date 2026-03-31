'use client';

import React, { useState, useCallback, memo } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import ThemeToggle from '@/components/ui/ThemeToggle';

const P = '#ec5b13';
const ringStyle = { '--tw-ring-color': P } as React.CSSProperties;

/* ─── Card Form (isolado para não re-renderizar o modal inteiro) ─── */
const CardForm = memo(function CardForm({
  onCardChange,
}: {
  onCardChange: (data: { number: string; holder: string; expiryMonth: string; expiryYear: string; cvv: string }) => void;
}) {
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const syncUp = useCallback(() => {
    const [mm, yy] = cardExpiry.split('/');
    onCardChange({
      number: cardNumber.replace(/\s/g, ''),
      holder: cardHolder,
      expiryMonth: mm || '',
      expiryYear: yy ? `20${yy}` : '',
      cvv: cardCvv,
    });
  }, [cardNumber, cardHolder, cardExpiry, cardCvv, onCardChange]);

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Número do cartão</label>
        <input
          type="text" inputMode="numeric" value={cardNumber} placeholder="0000 0000 0000 0000" maxLength={19}
          onChange={e => {
            const d = e.target.value.replace(/\D/g, '').substring(0, 16);
            setCardNumber(d.replace(/(.{4})/g, '$1 ').trim());
          }}
          onBlur={syncUp}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 text-sm focus:outline-none focus:ring-2"
          style={ringStyle}
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Nome impresso no cartão</label>
        <input
          type="text" value={cardHolder} placeholder="NOME COMPLETO"
          onChange={e => setCardHolder(e.target.value.toUpperCase())}
          onBlur={syncUp}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 text-sm focus:outline-none focus:ring-2"
          style={ringStyle}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Validade</label>
          <input
            type="text" inputMode="numeric" value={cardExpiry} placeholder="MM/AA" maxLength={5}
            onChange={e => {
              const d = e.target.value.replace(/\D/g, '').substring(0, 4);
              setCardExpiry(d.length > 2 ? `${d.substring(0, 2)}/${d.substring(2)}` : d);
            }}
            onBlur={syncUp}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 text-sm focus:outline-none focus:ring-2"
            style={ringStyle}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">CVV</label>
          <input
            type="text" inputMode="numeric" value={cardCvv} placeholder="000" maxLength={4}
            onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').substring(0, 4))}
            onBlur={syncUp}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 text-sm focus:outline-none focus:ring-2"
            style={ringStyle}
          />
        </div>
      </div>
      <p className="text-[10px] text-slate-400 flex items-center gap-1">
        <ShieldCheck className="w-3 h-3 text-green-500" />
        Seus dados são criptografados e não armazenamos o número do cartão.
      </p>
    </div>
  );
});

/* ─── Checkout Modal ─── */
type Step = 'payment' | 'pix' | 'success';

interface VendorCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorId: string;
  product: {
    type: 'plan' | 'ai_package' | 'premium_feature';
    planId?: string;
    featureId?: string;
    name: string;
    price: string;
  };
}

export default function VendorCheckoutModal({ isOpen, onClose, vendorId, product }: VendorCheckoutModalProps) {
  const [step, setStep] = useState<Step>('payment');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // PIX data
  const [pixData, setPixData] = useState<{ payment_id: string; qr_code: string; copy_paste: string } | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [pixSimulating, setPixSimulating] = useState(false);

  // Card data
  const [cardData, setCardData] = useState({ number: '', holder: '', expiryMonth: '', expiryYear: '', cvv: '' });
  const handleCardChange = useCallback((data: typeof cardData) => setCardData(data), []);

  if (!isOpen) return null;

  async function handlePay() {
    setError('');
    setLoading(true);

    if (paymentMethod === 'credit_card') {
      if (cardData.number.replace(/\s/g, '').length < 16) { setError('Número do cartão inválido.'); setLoading(false); return; }
      if (!cardData.holder.trim()) { setError('Informe o nome impresso no cartão.'); setLoading(false); return; }
      if (!cardData.expiryMonth || !cardData.expiryYear) { setError('Data de validade inválida.'); setLoading(false); return; }
      if (cardData.cvv.length < 3) { setError('CVV inválido.'); setLoading(false); return; }
    }

    try {
      const res = await fetch('/api/vendor/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: product.type,
          planId: product.planId,
          featureId: product.featureId,
          vendorId,
          paymentMethod,
          card: paymentMethod === 'credit_card' ? cardData : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao processar pagamento.');
        setLoading(false);
        return;
      }

      if (data.pix) {
        setPixData({ payment_id: data.paymentId, qr_code: data.pix.qr_code, copy_paste: data.pix.copy_paste });
        setStep('pix');
      } else if (data.paid) {
        setStep('success');
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    }

    setLoading(false);
  }

  function handleClose() {
    setStep('payment');
    setPaymentMethod('pix');
    setError('');
    setPixData(null);
    setCardData({ number: '', holder: '', expiryMonth: '', expiryYear: '', cvv: '' });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl border dark:border-slate-800">
        {/* Header */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-slate-200 dark:bg-slate-800 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <h2 className="font-bold text-slate-900 dark:text-white text-lg">
              {step === 'pix' ? 'Pagamento PIX' : step === 'success' ? 'Tudo certo!' : 'Checkout'}
            </h2>
          </div>
          <button onClick={handleClose} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ─── STEP: PAYMENT ─── */}
        {step === 'payment' && (
          <>
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
              {/* Resumo */}
              <div className="bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Voc está adquirindo</p>
                <p className="text-base font-black text-slate-900 dark:text-white">{product.name}</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">R$ {product.price}</span>
                </div>
              </div>

              {/* Método de pagamento */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Forma de pagamento</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('pix')}
                    className={`p-3.5 rounded-xl border-2 text-center text-sm font-bold transition-all ${paymentMethod === 'pix' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-slate-200 text-slate-600 bg-white hover:border-slate-300'}`}
                  >
                    PIX
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('credit_card')}
                    className={`p-3.5 rounded-xl border-2 text-center text-sm font-bold transition-all ${paymentMethod === 'credit_card' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-slate-200 text-slate-600 bg-white hover:border-slate-300'}`}
                  >
                    Cartão
                  </button>
                </div>
              </div>

              {/* Card form */}
              {paymentMethod === 'credit_card' && (
                <CardForm onCardChange={handleCardChange} />
              )}

              {paymentMethod === 'pix' && (
                <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
                  <p className="text-sm text-green-800 font-medium">
                    Ao confirmar, vamos gerar um QR Code PIX para você escanear e pagar instantaneamente.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 space-y-3">
              {error && (
                <div className="bg-red-50 text-red-700 text-xs font-medium px-4 py-3 rounded-xl">{error}</div>
              )}
              <button
                onClick={handlePay}
                disabled={loading}
                className="w-full h-14 font-bold rounded-xl text-white shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: P }}
              >
                {loading ? 'Processando...' : `Pagar R$ ${product.price}`}
              </button>
              <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <ShieldCheck className="w-3.5 h-3.5 text-green-500" /> Pagamento seguro
              </div>
            </div>
          </>
        )}

        {/* ─── STEP: PIX ─── */}
        {step === 'pix' && pixData && (
          <div className="flex flex-col flex-1 overflow-y-auto px-6 py-6 items-center text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-2xl font-black" style={{ backgroundColor: P }}>
              P
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
              Após o pagamento, os créditos serão ativados automaticamente.
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
                  setStep('success');
                  setPixSimulating(false);
                }, 1500);
              }}
              disabled={pixSimulating}
              className="w-full py-3 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold disabled:opacity-50"
            >
              {pixSimulating ? 'Simulando pagamento...' : '🧪 Simular pagamento (sandbox)'}
            </button>
          </div>
        )}

        {/* ─── STEP: SUCCESS ─── */}
        {step === 'success' && (
          <div className="flex flex-col flex-1 items-center justify-center px-6 py-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl">
              ✅
            </div>
            <h3 className="text-xl font-black text-slate-900">Pagamento Confirmado!</h3>
            <p className="text-sm text-slate-500 max-w-xs">
              Sua compra de <strong>{product.name}</strong> foi processada com sucesso. Os recursos já estão disponíveis.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 w-full py-3.5 rounded-xl font-bold text-white shadow-lg"
              style={{ backgroundColor: P }}
            >
              Voltar ao Painel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
