'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Save, Percent, Calendar, Sparkles, Plus, Trash2, Star, X, GripVertical } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface PlanDraft {
  id?: string;
  name: string;
  price: number;
  order_limit: number;
  features: string[];
  ia_included: boolean;
  recommended: boolean;
  active: boolean;
  _isNew?: boolean;
}

export default function AdminSettingsClient() {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [platformFee, setPlatformFee] = useState(10);
  const [aiPackageSize, setAiPackageSize] = useState(50);
  const [aiPackagePrice, setAiPackagePrice] = useState(199.00);
  const [aiImagesPerCredit, setAiImagesPerCredit] = useState(10);
  const [aiDescriptionsPerCredit, setAiDescriptionsPerCredit] = useState(1);

  // Planos dinâmicos
  const [plans, setPlans] = useState<PlanDraft[]>([]);
  const [newFeatureInputs, setNewFeatureInputs] = useState<Record<number, string>>({});

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

      const { data: plansData } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price', { ascending: true });

      if (plansData) {
        setPlans(plansData.map(p => ({
          id: p.id,
          name: p.name,
          price: Number(p.price),
          order_limit: p.order_limit,
          features: p.features || [],
          ia_included: p.ia_included || false,
          recommended: p.recommended || false,
          active: p.active !== false,
        })));
      }

      setFetching(false);
    }
    loadConfigs();
  }, []);

  function updatePlan(index: number, field: keyof PlanDraft, value: any) {
    setPlans(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  }

  function addFeature(index: number) {
    const text = (newFeatureInputs[index] || '').trim();
    if (!text) return;
    setPlans(prev => prev.map((p, i) => i === index ? { ...p, features: [...p.features, text] } : p));
    setNewFeatureInputs(prev => ({ ...prev, [index]: '' }));
  }

  function removeFeature(planIndex: number, featureIndex: number) {
    setPlans(prev => prev.map((p, i) => i === planIndex ? { ...p, features: p.features.filter((_, fi) => fi !== featureIndex) } : p));
  }

  function addNewPlan() {
    setPlans(prev => [...prev, {
      name: '',
      price: 0,
      order_limit: 50,
      features: [],
      ia_included: false,
      recommended: false,
      active: true,
      _isNew: true,
    }]);
  }

  function removePlan(index: number) {
    setPlans(prev => prev.filter((_, i) => i !== index));
  }

  function setRecommended(index: number) {
    setPlans(prev => prev.map((p, i) => ({ ...p, recommended: i === index })));
  }

  async function handleSave() {
    setLoading(true);
    const supabase = createClient();
    const errors: string[] = [];

    const updates = [
      { key: 'platform_fee', value: String(platformFee) },
      { key: 'ai_photo_package_size', value: String(aiPackageSize) },
      { key: 'ai_photo_package_price', value: String(aiPackagePrice) },
      { key: 'ai_images_per_credit', value: String(aiImagesPerCredit) },
      { key: 'ai_descriptions_per_credit', value: String(aiDescriptionsPerCredit) }
    ];

    for (const item of updates) {
      const { error } = await supabase.from('platform_config').upsert({ key: item.key, value: item.value });
      if (error) errors.push(`Config "${item.key}": ${error.message}`);
    }

    // Salva planos — busca IDs existentes para detectar deletados
    const { data: existingPlans } = await supabase.from('subscription_plans').select('id');
    const existingIds = new Set((existingPlans || []).map(p => p.id));
    const currentIds = new Set(plans.filter(p => p.id).map(p => p.id));

    // Deleta planos removidos
    for (const id of existingIds) {
      if (!currentIds.has(id)) {
        const { error } = await supabase.from('subscription_plans').delete().eq('id', id);
        if (error) errors.push(`Deletar plano: ${error.message}`);
      }
    }

    // Upsert planos existentes e insere novos
    for (const plan of plans) {
      if (!plan.name.trim()) continue;
      const payload = {
        name: plan.name.trim(),
        price: plan.price,
        order_limit: plan.order_limit,
        features: plan.features,
        ia_included: plan.ia_included,
        recommended: plan.recommended,
        active: plan.active,
      };

      if (plan.id && !plan._isNew) {
        const { error } = await supabase.from('subscription_plans').update(payload).eq('id', plan.id);
        if (error) errors.push(`Atualizar "${plan.name}": ${error.message}`);
      } else {
        const { error } = await supabase.from('subscription_plans').insert(payload);
        if (error) errors.push(`Criar "${plan.name}": ${error.message}`);
      }
    }

    setLoading(false);

    if (errors.length > 0) {
      alert(`Erro ao salvar:\n\n${errors.join('\n')}`);
      return;
    }

    alert('Configurações salvas com sucesso!');

    // Recarrega planos para pegar IDs novos
    const { data: refreshed } = await supabase.from('subscription_plans').select('*').order('price', { ascending: true });
    if (refreshed) {
      setPlans(refreshed.map(p => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
        order_limit: p.order_limit,
        features: p.features || [],
        ia_included: p.ia_included || false,
        recommended: p.recommended || false,
        active: p.active !== false,
      })));
    }
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

        {/* Seção 2: Planos Dinâmicos */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-500" />
              <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">Assinaturas e Planos</h2>
            </div>
            <button
              type="button"
              onClick={addNewPlan}
              className="flex items-center gap-1.5 bg-orange-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-orange-600 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo Plano
            </button>
          </div>

          <div className="space-y-4">
            {plans.map((plan, idx) => (
              <div key={plan.id || `new-${idx}`} className={`bg-white rounded-[32px] p-6 md:p-8 border shadow-sm transition-all ${plan.recommended ? 'border-orange-300 ring-2 ring-orange-100' : 'border-gray-100'} ${!plan.active ? 'opacity-60' : ''}`}>

                {/* Header do plano */}
                <div className="flex items-start justify-between gap-3 mb-6">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={plan.name}
                        onChange={(e) => updatePlan(idx, 'name', e.target.value)}
                        placeholder="Nome do plano"
                        className="text-lg font-black text-gray-900 bg-transparent border-none outline-none w-full placeholder:text-gray-300"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setRecommended(idx)}
                      title="Marcar como recomendado"
                      className={`p-1.5 rounded-lg transition ${plan.recommended ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-300 hover:text-orange-400'}`}
                    >
                      <Star className="w-4 h-4" fill={plan.recommended ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removePlan(idx)}
                      title="Remover plano"
                      className="p-1.5 rounded-lg bg-gray-50 text-gray-300 hover:text-red-500 hover:bg-red-50 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Campos principais */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Preço (R$/mês)</p>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">R$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={plan.price}
                        onChange={(e) => updatePlan(idx, 'price', Number(e.target.value))}
                        className="w-full h-10 bg-gray-50 border border-gray-100 rounded-xl pl-9 pr-3 font-bold text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Limite Pedidos/mês</p>
                    <input
                      type="number"
                      min="1"
                      value={plan.order_limit}
                      onChange={(e) => updatePlan(idx, 'order_limit', Number(e.target.value))}
                      className="w-full h-10 bg-gray-50 border border-gray-100 rounded-xl px-3 font-bold text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    {plan.order_limit >= 99999 && (
                      <p className="text-[10px] text-green-600 font-bold mt-1">Ilimitado</p>
                    )}
                  </div>
                  <div className="col-span-2 sm:col-span-1 flex flex-col gap-3">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={plan.ia_included}
                        onChange={(e) => updatePlan(idx, 'ia_included', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 mt-0.5"
                      />
                      <div>
                        <span className="text-xs font-bold text-gray-700 block">Fotos com IA Inclusas</span>
                        <span className="text-[10px] text-gray-400 leading-tight block">Vendor gera fotos e descrições por IA sem comprar pacote avulso</span>
                      </div>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={plan.active}
                        onChange={(e) => updatePlan(idx, 'active', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <span className="text-xs font-bold text-gray-700">Ativo</span>
                    </label>
                  </div>
                </div>

                {/* Features / Vantagens */}
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Vantagens exibidas ao vendor</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {plan.features.map((feat, fi) => (
                      <span key={fi} className="inline-flex items-center gap-1 bg-gray-50 border border-gray-100 text-gray-700 text-xs font-bold px-2.5 py-1 rounded-lg">
                        {feat}
                        <button type="button" onClick={() => removeFeature(idx, fi)} className="text-gray-300 hover:text-red-500 transition ml-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {plan.features.length === 0 && (
                      <span className="text-[11px] text-gray-300 italic">Nenhuma vantagem adicionada</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newFeatureInputs[idx] || ''}
                      onChange={(e) => setNewFeatureInputs(prev => ({ ...prev, [idx]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFeature(idx); } }}
                      placeholder="Ex: Menu Sem Publicidade"
                      className="flex-1 h-9 bg-gray-50 border border-gray-100 rounded-xl px-3 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder:text-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => addFeature(idx)}
                      className="h-9 px-3 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-50">
                  {plan.recommended && (
                    <span className="text-[10px] font-black uppercase tracking-widest bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">Recomendado</span>
                  )}
                  {plan.price === 0 && (
                    <span className="text-[10px] font-black uppercase tracking-widest bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Gratuito</span>
                  )}
                  {!plan.active && (
                    <span className="text-[10px] font-black uppercase tracking-widest bg-red-50 text-red-500 px-2 py-0.5 rounded-full">Inativo</span>
                  )}
                  {plan.ia_included && (
                    <span className="text-[10px] font-black uppercase tracking-widest bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">Fotos com IA</span>
                  )}
                </div>
              </div>
            ))}

            {plans.length === 0 && (
              <div className="bg-white rounded-[32px] p-12 border border-gray-100 shadow-sm text-center">
                <p className="text-sm text-gray-400 font-bold">Nenhum plano cadastrado.</p>
                <button type="button" onClick={addNewPlan} className="mt-4 bg-orange-500 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-orange-600 transition">
                  Criar Primeiro Plano
                </button>
              </div>
            )}
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
