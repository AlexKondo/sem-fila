'use client';

import React from 'react';
import { Check, Zap, Sparkles, ShieldCheck, X } from 'lucide-react';

const P = '#ec5b13';

interface PlanProps {
  name: string;
  price: string;
  features: string[];
  recommended?: boolean;
  onSelect: () => void;
}

function PlanCard({ name, price, features, recommended, onSelect }: PlanProps) {
  return (
    <div className={`relative p-6 rounded-3xl border-2 transition-all flex flex-col h-full ${recommended ? 'border-orange-500 bg-orange-50/30 shadow-xl shadow-orange-200/50 scale-105 z-10' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
      {recommended && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
          Recomendado
        </span>
      )}
      
      <div className="mb-6">
        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{name}</h3>
        <div className="flex items-baseline gap-1 mt-2">
          <span className="text-3xl font-black text-slate-900">R$ {price}</span>
          <span className="text-sm text-slate-400 font-medium">/mês</span>
        </div>
      </div>

      <ul className="space-y-3 mb-8 flex-1">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-slate-600 font-medium">
            <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={onSelect}
        className={`w-full py-3 rounded-2xl font-bold transition-all ${recommended ? 'bg-orange-500 text-white shadow-lg shadow-orange-400/40 hover:bg-orange-600' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
      >
        {price === '0' ? 'Começar Grátis' : 'Assinar Plano'}
      </button>
    </div>
  );
}

export default function VendorPlansModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [plans, setPlans] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [aiConfig, setAiConfig] = React.useState({ size: '50', price: '199.00' });

  React.useEffect(() => {
    if (!isOpen) return;
    
    async function fetchData() {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      
      // Busca Planos
      const plansRes = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('active', true)
        .order('price', { ascending: true });

      if (plansRes.data) setPlans(plansRes.data);

      // Busca Config de IA
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[40px] w-full max-w-4xl max-h-[90vh] overflow-y-auto relative shadow-2xl no-scrollbar">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all z-20"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 md:p-12">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-600 text-[10px] font-black uppercase tracking-widest mb-4">
              <Zap className="w-3 h-3 fill-orange-600" />
              Upgrade de Potencial
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 tracking-tight">Escolha o Plano Ideal</h2>
            <p className="text-slate-500 max-w-md mx-auto font-medium">
              Aumente seu limite de pedidos e desbloqueie ferramentas de inteligência artificial para vender mais.
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 animate-spin rounded-full" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Carregando Melhores Preços...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 items-stretch">
              {plans.length > 0 ? plans.map((p) => (
                <PlanCard 
                  key={p.id || p.name}
                  name={p.name} 
                  price={String(p.price)} 
                  recommended={p.recommended}
                  features={p.features}
                  onSelect={() => alert(`Assinando ${p.name}...`)}
                />
              )) : (
                 <p className="col-span-3 text-center text-slate-400 font-bold uppercase tracking-widest py-10">Serviço de Assinaturas Indisponível</p>
              )}
            </div>
          )}

          {/* Add-ons Section */}
          <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-center md:text-left">
              <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-2xl shadow-sm">
                ✨
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-900 flex items-center gap-2 justify-center md:justify-start">
                  Pacote de IA ({aiConfig.size} fotos)
                  <span className="text-[10px] bg-orange-500 text-white px-2 py-0.5 rounded-full font-black uppercase">Exclusivo</span>
                </h4>
                <p className="text-sm text-slate-500 font-medium max-w-sm">
                  Deixe suas fotos de comida com aspecto profissional usando nosso motor de IA. Melhore {aiConfig.size} pratos.
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center md:items-end gap-2">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900">R$ {aiConfig.price}</span>
                <span className="text-xs text-slate-400 font-bold">/pacote</span>
              </div>
              <button 
                onClick={() => alert(`Compra de ${aiConfig.size} fotos por R$ ${aiConfig.price} iniciada!`)}
                className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-sm"
              >
                Habilitar Agora
              </button>
            </div>
          </div>

          {/* Trust Footer */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-slate-400 grayscale opacity-60">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
              <ShieldCheck className="w-4 h-4" /> Pagamento Seguro
            </div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
              <Check className="w-4 h-4" /> Cancelamento Fácil
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
