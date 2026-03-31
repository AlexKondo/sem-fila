'use client';

import React from 'react';
import { Check, Zap, ShieldCheck, X } from 'lucide-react';
import VendorCheckoutModal from './VendorCheckoutModal';

const P = '#ec5b13';

interface PlanProps {
  name: string;
  price: string;
  features: string[];
  recommended?: boolean;
  isCurrent?: boolean;
  isDowngrade?: boolean;
  proRataPrice?: string | null;
  onSelect: () => void;
}

function PlanCard({ name, price, features, recommended, isCurrent, isDowngrade, proRataPrice, onSelect }: PlanProps) {
  return (
    <div className={`relative p-6 rounded-3xl border-2 transition-all flex flex-col h-full ${isCurrent ? 'border-green-500 bg-green-50/30' : recommended ? 'border-orange-500 bg-orange-50/30 dark:bg-orange-950/20 shadow-xl shadow-orange-200/50 dark:shadow-none scale-105 z-10' : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-600'}`}>
      {isCurrent && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
          Plano Atual
        </span>
      )}
      {!isCurrent && recommended && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
          Recomendado
        </span>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{name}</h3>
        <div className="flex items-baseline gap-1 mt-2">
          <span className="text-3xl font-black text-slate-900 dark:text-white">R$ {price}</span>
          <span className="text-sm text-slate-400 dark:text-slate-500 font-medium">/mês</span>
        </div>
        {proRataPrice && !isCurrent && !isDowngrade && (
          <p className="text-[11px] text-green-600 font-bold mt-1">
            Pague apenas R$ {proRataPrice} (diferença pro-rata)
          </p>
        )}
      </div>

      <ul className="space-y-3 mb-8 flex-1">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400 font-medium">
            <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <div className="w-full py-3 rounded-2xl font-bold text-center bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm">
          Ativo
        </div>
      ) : isDowngrade ? (
        <div className="w-full py-3 rounded-2xl font-bold text-center bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 text-sm cursor-not-allowed">
          Downgrade não disponível
        </div>
      ) : (
        <button
          onClick={onSelect}
          className={`w-full py-3 rounded-2xl font-bold transition-all ${recommended && !isCurrent ? 'bg-orange-500 text-white shadow-lg shadow-orange-400/40 hover:bg-orange-600' : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200'}`}
        >
          {price === '0' ? 'Começar Grátis' : proRataPrice ? `Upgrade — R$ ${proRataPrice}` : 'Assinar Plano'}
        </button>
      )}
    </div>
  );
}

interface CurrentPlanInfo {
  name: string;
  price: number;
  expiresAt: string | null;
}

export default function VendorPlansModal({ isOpen, onClose, onlyShowAi, vendorId, currentPlan }: { isOpen: boolean; onClose: () => void; onlyShowAi?: boolean; vendorId?: string; currentPlan?: CurrentPlanInfo }) {
  const [plans, setPlans] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [aiConfig, setAiConfig] = React.useState({ size: '50', price: '199.00' });
  const [checkoutProduct, setCheckoutProduct] = React.useState<{
    type: 'plan' | 'ai_package';
    planId?: string;
    name: string;
    price: string;
  } | null>(null);

  // Calcula dias restantes do plano atual para pro-rata
  const getDaysRemaining = () => {
    if (!currentPlan?.expiresAt) return 0;
    const now = new Date();
    const expires = new Date(currentPlan.expiresAt);
    const diff = Math.max(0, Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    return diff;
  };

  const getProRataPrice = (newPrice: number) => {
    if (!currentPlan || currentPlan.price <= 0) return null;
    const daysRemaining = getDaysRemaining();
    if (daysRemaining <= 0) return null;
    const dailyDiff = (newPrice - currentPlan.price) / 30;
    const proRata = Math.max(0, Math.round(dailyDiff * daysRemaining * 100) / 100);
    return proRata > 0 ? proRata.toFixed(2) : null;
  };

  React.useEffect(() => {
    if (!isOpen) return;

    async function fetchData() {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      const plansRes = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('active', true)
        .order('price', { ascending: true });

      if (plansRes.data) setPlans(plansRes.data);

      const configRes = await supabase
        .from('platform_config')
        .select('key, value');

      if (configRes.data) {
        const size = configRes.data.find(c => c.key === 'ai_photo_package_size')?.value || '50';
        const price = configRes.data.find(c => c.key === 'ai_photo_package_price')?.value || '199.00';
        setAiConfig({ size, price });
      }

      setLoading(false);
    }
    fetchData();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
        <div className="bg-white dark:bg-slate-950 rounded-[40px] w-full max-w-4xl max-h-[90vh] overflow-y-auto relative shadow-2xl no-scrollbar border dark:border-slate-800">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-200 transition-all z-20"
          >
            <X className="w-5 h-5" />
          </button>

          <div className={`p-8 md:p-12 ${onlyShowAi ? 'md:pt-16 md:pb-16' : ''}`}>

            {!onlyShowAi && (
              <>
                {/* Header */}
                <div className="text-center mb-12">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 text-[10px] font-black uppercase tracking-widest mb-4">
                    <Zap className="w-3 h-3 fill-orange-600 dark:fill-orange-400" />
                    Upgrade de Potencial
                  </div>
                  <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">Escolha o Plano Ideal</h2>
                  <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto font-medium">
                    Aumente seu limite de pedidos e desbloqueie ferramentas de inteligência artificial para vender mais.
                  </p>
                </div>

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 animate-spin rounded-full" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Carregando Melhores Preços...</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-4 items-stretch">
                      {plans.length > 0 ? plans.map((p) => {
                        const planPrice = Number(p.price);
                        const isCurrent = currentPlan ? p.name === currentPlan.name : planPrice === 0;
                        const isDowngrade = currentPlan && currentPlan.price > 0 && planPrice < currentPlan.price && planPrice > 0;
                        const proRata = currentPlan && planPrice > currentPlan.price ? getProRataPrice(planPrice) : null;

                        return (
                          <PlanCard
                            key={p.id || p.name}
                            name={p.name}
                            price={String(p.price)}
                            recommended={p.recommended}
                            isCurrent={isCurrent}
                            isDowngrade={!!isDowngrade}
                            proRataPrice={proRata}
                            features={p.features}
                            onSelect={() => {
                              if (planPrice === 0) {
                                onClose();
                                return;
                              }
                              const checkoutPrice = proRata || String(p.price);
                              setCheckoutProduct({
                                type: 'plan',
                                planId: p.id,
                                name: `Plano ${p.name}`,
                                price: checkoutPrice,
                              });
                            }}
                          />
                        );
                      }) : (
                        <p className="col-span-3 text-center text-slate-400 font-bold uppercase tracking-widest py-10">Serviço de Assinaturas Indisponível</p>
                      )}
                    </div>

                    {/* Mensagem pro-rata */}
                    {currentPlan && currentPlan.price > 0 && (
                      <div className="bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/50 rounded-2xl p-4 mb-12 text-center">
                        <p className="text-xs text-green-700 dark:text-green-400 font-bold">
                          Ao fazer upgrade, você paga apenas a diferença proporcional aos dias restantes do ciclo atual.
                        </p>
                        {currentPlan.expiresAt && (
                          <p className="text-[10px] text-green-600 dark:text-green-500 mt-1">
                            Seu plano atual ({currentPlan.name}) renova em {new Date(currentPlan.expiresAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} &mdash; faltam {getDaysRemaining()} dias.
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* Seção IA */}
            <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl p-6 md:p-10 border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 shadow-inner">
              <div className="flex items-center gap-6 text-center md:text-left">
                <div className="w-20 h-20 rounded-3xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-4xl shadow-md rotate-3">
                  ✨
                </div>
                <div>
                  <h4 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 justify-center md:justify-start">
                    Melhorias com IA
                    <span className="text-[10px] bg-orange-500 text-white px-2 py-0.5 rounded-full font-black uppercase">Plus</span>
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium max-w-sm mt-1">
                    Deixe suas fotos de comida com aspecto profissional usando nosso motor de IA. Pacote exclusivo para {aiConfig.size} pratos.
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-center md:items-end gap-3 shrink-0">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">R$ {aiConfig.price}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-bold">/pacote</span>
                </div>
                <button
                  onClick={() => setCheckoutProduct({
                    type: 'ai_package',
                    name: `Pacote IA — ${aiConfig.size} fotos`,
                    price: aiConfig.price,
                  })}
                  className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-slate-200 transition-all shadow-lg shadow-black/20"
                >
                  Habilitar Agora
                </button>
              </div>
            </div>

            {/* Trust Footer */}
            <div className="mt-12 flex items-center justify-center text-slate-400">
              <div className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.2em] text-slate-500">
                <ShieldCheck className="w-6 h-6 text-green-500" /> PAGAMENTO SEGURO
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout transparente */}
      {checkoutProduct && vendorId && (
        <VendorCheckoutModal
          isOpen={true}
          onClose={() => setCheckoutProduct(null)}
          vendorId={vendorId}
          product={checkoutProduct}
        />
      )}
    </>
  );
}
