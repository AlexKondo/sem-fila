'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Save, ShieldCheck, Zap, Percent, Calendar, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const P = '#ec5b13';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  // Configurações Reais do Banco
  const [platformFee, setPlatformFee] = useState(10);
  const [monthlySubscription, setMonthlySubscription] = useState(199.90);
  const [aiPackageSize, setAiPackageSize] = useState(50);
  const [aiPackagePrice, setAiPackagePrice] = useState(199.00);
  const [aiImagesPerCredit, setAiImagesPerCredit] = useState(10);
  const [aiDescriptionsPerCredit, setAiDescriptionsPerCredit] = useState(1);

  useEffect(() => {
    async function loadConfigs() {
      const supabase = createClient();
      const { data } = await supabase.from('platform_config').select('*');
      
      if (data) {
        data.forEach(item => {
          if (item.key === 'platform_fee') setPlatformFee(Number(item.value));
          if (item.key === 'ai_photo_package_size') setAiPackageSize(Number(item.value));
          if (item.key === 'ai_photo_package_price') setAiPackagePrice(Number(item.value));
          if (item.key === 'ai_images_per_credit') setAiImagesPerCredit(Number(item.value));
          if (item.key === 'ai_descriptions_per_credit') setAiDescriptionsPerCredit(Number(item.value));
        });
      }

      const { data: plans } = await supabase.from('subscription_plans').select('*').eq('name', 'Crescimento').single();
      if (plans) setMonthlySubscription(Number(plans.price));

      setFetching(false);
    }
    loadConfigs();
  }, []);

  async function handleSave() {
    setLoading(true);
    const supabase = createClient();

    const updates = [
      { key: 'platform_fee', value: String(platformFee) },
      { key: 'ai_photo_package_size', value: String(aiPackageSize) },
      { key: 'ai_photo_package_price', value: String(aiPackagePrice) },
      { key: 'ai_images_per_credit', value: String(aiImagesPerCredit) },
      { key: 'ai_descriptions_per_credit', value: String(aiDescriptionsPerCredit) }
    ];

    for (const item of updates) {
      await supabase.from('platform_config').upsert({ key: item.key, value: item.value });
    }

    // Atualiza o plano padrão também
    await supabase.from('subscription_plans').update({ price: monthlySubscription }).eq('name', 'Crescimento');

    setLoading(false);
    alert('Configurações salvas com sucesso no Banco de Dados!');
  }

  if (fetching) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 animate-spin rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/admin" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-900 transition">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <h1 className="font-bold text-gray-900 leading-none">Ajustes da Plataforma</h1>
          </div>
          <button 
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-800 transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Salvando...' : 'Salvar Tudo'}
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Seção 1: IA de Fotos */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-orange-500" />
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">Inteligência Artificial (IA)</h2>
          </div>
          <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
               <div>
                  <p className="font-bold text-gray-900 mb-1 leading-tight">Fotos por Pacote</p>
                  <p className="text-[11px] text-gray-400 mb-3">Qtd de créditos que o vendor ganha ao comprar.</p>
                  <input 
                    type="number" 
                    value={aiPackageSize} 
                    onChange={(e) => setAiPackageSize(Number(e.target.value))}
                    className="w-full h-12 bg-gray-50 border border-gray-100 rounded-xl px-4 font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
               </div>
               <div>
                  <p className="font-bold text-gray-900 mb-1 leading-tight">Preço do Pacote</p>
                  <p className="text-[11px] text-gray-400 mb-3">Valor de venda em Reais (R$).</p>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-sm">R$</span>
                    <input 
                      type="number" 
                      value={aiPackagePrice} 
                      onChange={(e) => setAiPackagePrice(Number(e.target.value))}
                      className="w-full h-12 bg-gray-50 border border-gray-100 rounded-xl pl-10 pr-4 font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
               </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
               <div>
                  <p className="font-bold text-gray-900 mb-1 leading-tight">Imagens por Crédito</p>
                  <p className="text-[11px] text-gray-400 mb-3">Sugestões de imagem geradas a cada uso de crédito.</p>
                  <input
                    type="number"
                    min="1"
                    value={aiImagesPerCredit}
                    onChange={(e) => setAiImagesPerCredit(Number(e.target.value))}
                    className="w-full h-12 bg-gray-50 border border-gray-100 rounded-xl px-4 font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
               </div>
               <div>
                  <p className="font-bold text-gray-900 mb-1 leading-tight">Descrições por Crédito</p>
                  <p className="text-[11px] text-gray-400 mb-3">Descrições IA geradas a cada uso de crédito.</p>
                  <input
                    type="number"
                    min="1"
                    value={aiDescriptionsPerCredit}
                    onChange={(e) => setAiDescriptionsPerCredit(Number(e.target.value))}
                    className="w-full h-12 bg-gray-50 border border-gray-100 rounded-xl px-4 font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
               </div>
            </div>
            <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
               <p className="text-[11px] text-orange-700 font-medium leading-relaxed">
                  Cada crédito dá ao vendor <strong>{aiImagesPerCredit} sugestões de imagem + {aiDescriptionsPerCredit} descrição por IA</strong>. O custo de API (Claude) é coberto pelo valor do pacote. Recomendamos margem de lucro de pelo menos 50%.
               </p>
            </div>
          </div>
        </section>

        {/* Seção 2: Mensalidades */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-orange-500" />
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">Assinaturas e Planos</h2>
          </div>
          <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="font-bold text-gray-900 mb-1">Valor do Plano Crescimento (Mensal)</p>
                <p className="text-xs text-gray-400">Valor fixo cobrado dos estabelecimentos mensalmente.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-400">R$</span>
                <input 
                  type="number" 
                  value={monthlySubscription} 
                  onChange={(e) => setMonthlySubscription(Number(e.target.value))}
                  className="w-32 h-12 bg-gray-50 border border-gray-100 rounded-xl px-4 text-center font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Seção 3: Taxas de Intermediação */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Percent className="w-4 h-4 text-orange-500" />
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">Economia do App</h2>
          </div>
          <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="font-bold text-gray-900 mb-1">Taxa por Pedido (Plataforma)</p>
                <p className="text-xs text-gray-400">Porcentagem retida de cada venda concluída.</p>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  value={platformFee} 
                  onChange={(e) => setPlatformFee(Number(e.target.value))}
                  className="w-24 h-12 bg-gray-50 border border-gray-100 rounded-xl px-4 text-center font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <span className="font-bold text-gray-400">%</span>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
