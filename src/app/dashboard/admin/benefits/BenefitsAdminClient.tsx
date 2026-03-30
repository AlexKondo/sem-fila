'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ToggleLeft, ToggleRight, Plus, Trash2, Save, ChevronDown, ChevronUp, Store, Users, UserCheck, DollarSign, Zap } from 'lucide-react';
import type { AutoBenefitMetric, AutoBenefitOperator, BenefitAudience } from '@/types/database';

// ── Audience config ──
const AUDIENCE_TABS: { value: BenefitAudience; label: string; icon: typeof Store; color: string; bg: string; border: string; desc: string }[] = [
  { value: 'vendor', label: 'Vendors', icon: Store, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', desc: 'Benefícios para barracas/quiosques' },
  { value: 'affiliate', label: 'Afiliados', icon: UserCheck, color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-200', desc: 'Benefícios para afiliados da plataforma' },
  { value: 'customer', label: 'Clientes', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', desc: 'Benefícios para clientes/consumidores' },
];

const METRIC_OPTIONS: { value: AutoBenefitMetric; label: string; unit: string }[] = [
  { value: 'monthly_revenue', label: 'Faturamento Mensal', unit: 'R$' },
  { value: 'order_count', label: 'Pedidos no Mês', unit: 'pedidos' },
  { value: 'rating_avg', label: 'Avaliação Média', unit: 'estrelas' },
  { value: 'cancellation_rate', label: 'Taxa de Cancelamento', unit: '%' },
  { value: 'avg_prep_time', label: 'Tempo Médio de Preparo', unit: 'min' },
];

const OPERATOR_OPTIONS: { value: AutoBenefitOperator; label: string }[] = [
  { value: '>=', label: '>= (acima de)' },
  { value: '<=', label: '<= (abaixo de)' },
  { value: '>', label: '> (maior que)' },
  { value: '<', label: '< (menor que)' },
  { value: '=', label: '= (igual a)' },
];

// ── Card unificado: 1 benefício = feature + regra (opcional) ──
interface BenefitCard {
  // Feature fields
  featureId: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  duration_days: number;
  active: boolean;
  free_for_all: boolean;
  trial_days: number;
  sort_order: number;
  target_audience: BenefitAudience;
  _isNewFeature?: boolean;
  // Rule fields (meta automática, opcional)
  ruleId: string;
  hasAutoRule: boolean;
  metric: AutoBenefitMetric;
  operator: AutoBenefitOperator;
  threshold: number;
  rule_duration_days: number;
  ruleActive: boolean;
  _isNewRule?: boolean;
}

export default function BenefitsAdminClient() {
  const [cards, setCards] = useState<BenefitCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [originalFeatureIds, setOriginalFeatureIds] = useState<string[]>([]);
  const [originalRuleIds, setOriginalRuleIds] = useState<string[]>([]);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [showValidation, setShowValidation] = useState(false);
  const [activeTab, setActiveTab] = useState<BenefitAudience>('vendor');

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from('premium_features').select('*').order('sort_order'),
      supabase.from('auto_benefit_rules').select('*').order('sort_order'),
    ]).then(([{ data: pf }, { data: ar }]) => {
      const features = pf || [];
      const rules = ar || [];

      const merged: BenefitCard[] = features.map((f: any) => {
        // Pega a primeira regra vinculada (1:1 simplificado)
        const rule = rules.find((r: any) => r.benefit_slug === f.slug);
        return {
          featureId: f.id,
          slug: f.slug,
          name: f.name,
          description: f.description ?? '',
          price: Number(f.price),
          duration_days: f.duration_days,
          active: f.active,
          free_for_all: f.free_for_all ?? false,
          trial_days: f.trial_days ?? 0,
          sort_order: f.sort_order,
          target_audience: (f.target_audience as BenefitAudience) || 'vendor',
          ruleId: rule?.id || '',
          hasAutoRule: !!rule,
          metric: (rule?.metric as AutoBenefitMetric) || 'monthly_revenue',
          operator: (rule?.operator as AutoBenefitOperator) || '>=',
          threshold: rule ? Number(rule.threshold) : 0,
          rule_duration_days: rule?.duration_days || 30,
          ruleActive: rule?.active ?? true,
          _isNewRule: !rule,
        };
      });

      setCards(merged);
      setOriginalFeatureIds(features.map((f: any) => f.id));
      setOriginalRuleIds(rules.map((r: any) => r.id));
      setExpandedCards(new Set(merged.map(c => c.featureId)));
      setLoading(false);
    });
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const addCard = useCallback((audience: BenefitAudience) => {
    const id = `new_${Date.now()}`;
    setCards(prev => [...prev, {
      featureId: id, slug: '', name: '', description: '', price: 0,
      duration_days: 30, active: true, free_for_all: false, trial_days: 0,
      sort_order: prev.filter(c => c.target_audience === audience).length,
      target_audience: audience, _isNewFeature: true,
      ruleId: '', hasAutoRule: false,
      metric: 'monthly_revenue' as AutoBenefitMetric,
      operator: '>=' as AutoBenefitOperator,
      threshold: 0, rule_duration_days: 30, ruleActive: true, _isNewRule: true,
    }]);
    setExpandedCards(prev => new Set([...prev, id]));
  }, []);

  const removeCard = useCallback((featureId: string) => {
    const card = cards.find(c => c.featureId === featureId);
    if (card && !card._isNewFeature) {
      if (!window.confirm(`Remover "${card.name || card.slug}"? Isso exclui o benefício e sua meta automática.`)) return;
    }
    setCards(prev => prev.filter(c => c.featureId !== featureId));
  }, [cards]);

  const updateCard = useCallback((featureId: string, field: keyof BenefitCard, value: any) => {
    setCards(prev => prev.map(c => {
      if (c.featureId !== featureId) return c;
      const updated = { ...c, [field]: value };
      if (field === 'name' && c._isNewFeature) {
        updated.slug = String(value)
          .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      }
      return updated;
    }));
  }, []);

  // ── Save all ──
  async function saveAll() {
    const invalid = cards.filter(c => c._isNewFeature && (!c.name || !c.slug));
    if (invalid.length > 0) {
      setShowValidation(true);
      setMsg(`Erro: Preencha o nome dos ${invalid.length} benefício(s) incompleto(s)`);
      setTimeout(() => setMsg(''), 5000);
      return;
    }
    setShowValidation(false);
    setSaving(true);
    setMsg('Salvando...');
    const supabase = createClient();

    let hasAudienceCol = true;
    const testRes = await supabase.from('premium_features').select('target_audience').limit(1);
    if (testRes.error) hasAudienceCol = false;

    try {
      // ── 1) Deletar rules removidas ──
      const currentRuleIds = cards.filter(c => c.ruleId && !c._isNewRule).map(c => c.ruleId);
      const removedRuleIds = originalRuleIds.filter(id => !currentRuleIds.includes(id));
      if (removedRuleIds.length > 0) {
        const { error } = await supabase.from('auto_benefit_rules').delete().in('id', removedRuleIds);
        if (error) throw new Error(`Erro ao deletar regras: ${error.message}`);
      }

      // ── 2) Deletar features removidas ──
      const currentFeatureIds = cards.filter(c => !c._isNewFeature).map(c => c.featureId);
      const removedFeatureIds = originalFeatureIds.filter(id => !currentFeatureIds.includes(id));
      if (removedFeatureIds.length > 0) {
        const { data: removedFeatData } = await supabase
          .from('premium_features').select('slug').in('id', removedFeatureIds);
        if (removedFeatData && removedFeatData.length > 0) {
          const slugs = removedFeatData.map((f: any) => f.slug);
          await supabase.from('auto_benefit_rules').delete().in('benefit_slug', slugs);
        }
        const { error } = await supabase.from('premium_features').delete().in('id', removedFeatureIds);
        if (error) throw new Error(`Erro ao deletar benefícios: ${error.message}`);
      }

      // ── 3) Upsert features ──
      for (const c of cards) {
        const fPayload: any = {
          name: c.name, slug: c.slug, description: c.description || null,
          price: c.price, duration_days: c.duration_days, active: c.active,
          free_for_all: c.free_for_all, trial_days: c.trial_days, sort_order: c.sort_order,
        };
        if (hasAudienceCol) fPayload.target_audience = c.target_audience;

        if (c._isNewFeature) {
          const { data, error } = await supabase.from('premium_features').insert(fPayload).select();
          if (error) throw new Error(`Erro ao inserir "${c.name}": ${error.message}`);
          if (data && data[0]) {
            c.featureId = data[0].id;
            c._isNewFeature = false;
          }
        } else {
          const { data, error } = await supabase
            .from('premium_features').update(fPayload).eq('id', c.featureId).select();
          if (error) throw new Error(`Erro ao atualizar "${c.name}": ${error.message}`);
          if (!data || data.length === 0) throw new Error(`Sem permissão para atualizar "${c.name}" (RLS).`);
        }

        // ── 4) Upsert rule se hasAutoRule ──
        if (c.hasAutoRule && c.threshold > 0) {
          const rPayload: any = {
            name: c.name, description: c.description || null,
            metric: c.metric, operator: c.operator, threshold: c.threshold,
            benefit_slug: c.slug, duration_days: c.rule_duration_days,
            active: c.ruleActive, sort_order: c.sort_order,
          };
          if (hasAudienceCol) rPayload.target_audience = c.target_audience;

          if (c._isNewRule || !c.ruleId) {
            const { data, error } = await supabase.from('auto_benefit_rules').insert(rPayload).select();
            if (error) throw new Error(`Erro ao inserir meta de "${c.name}": ${error.message}`);
            if (data && data[0]) {
              c.ruleId = data[0].id;
              c._isNewRule = false;
            }
          } else {
            const { data, error } = await supabase
              .from('auto_benefit_rules').update(rPayload).eq('id', c.ruleId).select();
            if (error) throw new Error(`Erro ao atualizar meta de "${c.name}": ${error.message}`);
            if (!data || data.length === 0) throw new Error(`Sem permissão para atualizar meta de "${c.name}" (RLS).`);
          }
        } else if (!c.hasAutoRule && c.ruleId && !c._isNewRule) {
          // Remove rule se desativou a meta
          await supabase.from('auto_benefit_rules').delete().eq('id', c.ruleId);
          c.ruleId = '';
          c._isNewRule = true;
        }
      }

      setCards([...cards]); // force re-render with updated ids
      setOriginalFeatureIds(cards.map(c => c.featureId));
      setOriginalRuleIds(cards.filter(c => c.ruleId).map(c => c.ruleId));
      setMsg('Tudo salvo com sucesso!');
      setTimeout(() => setMsg(''), 8000);
    } catch (err: any) {
      setMsg(`Erro: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  const tabCards = cards.filter(c => c.target_audience === activeTab);
  const currentTabConfig = AUDIENCE_TABS.find(t => t.value === activeTab)!;
  const countPerTab = (aud: BenefitAudience) => cards.filter(c => c.target_audience === aud).length;

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard/admin" className="p-2 text-gray-400 hover:text-gray-900 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div className="flex-1">
            <h1 className="font-bold text-gray-900 leading-none">Benefícios & Metas</h1>
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">
              Defina benefícios e como são ativados
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 flex border-t border-gray-50">
          {AUDIENCE_TABS.map(tab => {
            const Icon = tab.icon;
            const count = countPerTab(tab.value);
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition border-b-2 ${
                  isActive ? `${tab.color} border-current` : 'text-gray-400 border-transparent hover:text-gray-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0 rounded-full ${isActive ? tab.bg : 'bg-gray-100'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">

        <div className={`rounded-2xl border ${currentTabConfig.border} ${currentTabConfig.bg} p-3 flex items-center gap-3`}>
          {(() => { const Icon = currentTabConfig.icon; return <Icon className={`w-5 h-5 ${currentTabConfig.color} flex-shrink-0`} />; })()}
          <p className={`text-xs font-medium ${currentTabConfig.color}`}>{currentTabConfig.desc}</p>
        </div>

        {tabCards.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <p className="text-gray-400 text-sm">Nenhum benefício para <strong>{currentTabConfig.label}</strong> ainda.</p>
          </div>
        )}

        {tabCards.map((card) => {
          const isExpanded = expandedCards.has(card.featureId);
          const metricInfo = METRIC_OPTIONS.find(m => m.value === card.metric);

          return (
            <div key={card.featureId} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${currentTabConfig.border}`}>
              {/* Header do card */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${card.active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                      {card.active ? 'Ativo' : 'Inativo'}
                    </span>
                    {card._isNewFeature && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 uppercase">Novo</span>
                    )}
                    {card.price > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 flex items-center gap-0.5">
                        <DollarSign className="w-2.5 h-2.5" /> R$ {card.price.toFixed(2)}
                      </span>
                    )}
                    {card.hasAutoRule && card.threshold > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 flex items-center gap-0.5">
                        <Zap className="w-2.5 h-2.5" /> Meta automática
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggleExpand(card.featureId)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button onClick={() => removeCard(card.featureId)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="font-bold text-gray-900 text-sm">{card.name || <span className="text-gray-300 italic">Sem nome</span>}</p>
                {card.description && <p className="text-xs text-gray-400 mt-0.5">{card.description}</p>}

                {/* Resumo quando fechado */}
                {!isExpanded && card.hasAutoRule && card.threshold > 0 && (
                  <p className="text-[11px] text-purple-600 mt-1">
                    Meta: {metricInfo?.label} {card.operator} {card.threshold} {metricInfo?.unit}
                  </p>
                )}
              </div>

              {/* Detalhes expandidos */}
              {isExpanded && (
                <div className="border-t border-gray-100 p-4 space-y-4">
                  {/* Nome + Descrição */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Nome do benefício</label>
                    <input
                      value={card.name}
                      onChange={e => updateCard(card.featureId, 'name', e.target.value)}
                      placeholder="Ex: Destaque na Plataforma"
                      className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 ${
                        showValidation && card._isNewFeature && !card.name ? 'border-red-400 bg-red-50' : 'border-gray-200'
                      }`}
                    />
                    {showValidation && card._isNewFeature && !card.name && (
                      <p className="text-[10px] text-red-500 font-bold mt-0.5">Obrigatório</p>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Descrição</label>
                    <input
                      value={card.description}
                      onChange={e => updateCard(card.featureId, 'description', e.target.value)}
                      placeholder="Descreva o que este benefício oferece"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                    />
                  </div>

                  {/* ── ATIVAÇÃO POR PAGAMENTO ── */}
                  <div className="bg-emerald-50 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      <p className="text-xs font-bold text-emerald-700">Ativação por pagamento</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-emerald-600 uppercase block mb-1">Preço (R$)</label>
                        <input
                          type="number" step="0.01"
                          value={card.price}
                          onChange={e => updateCard(card.featureId, 'price', parseFloat(e.target.value) || 0)}
                          className="w-full border border-emerald-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30 bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-emerald-600 uppercase block mb-1">Duração (dias)</label>
                        <input
                          type="number"
                          value={card.duration_days}
                          onChange={e => updateCard(card.featureId, 'duration_days', parseInt(e.target.value) || 30)}
                          className="w-full border border-emerald-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30 bg-white"
                        />
                      </div>
                    </div>
                    {card.price > 0 && (
                      <p className="text-[10px] text-emerald-600">
                        Cobra <strong>R$ {card.price.toFixed(2)}</strong> via Asaas por <strong>{card.duration_days} dias</strong>
                      </p>
                    )}
                    {card.price === 0 && (
                      <p className="text-[10px] text-emerald-500 italic">Preço R$ 0 = não disponível para compra</p>
                    )}
                  </div>

                  {/* ── ATIVAÇÃO POR META AUTOMÁTICA ── */}
                  <div className={`rounded-xl p-3 space-y-2 ${card.hasAutoRule ? 'bg-purple-50' : 'bg-gray-50'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className={`w-4 h-4 ${card.hasAutoRule ? 'text-purple-600' : 'text-gray-400'}`} />
                        <p className={`text-xs font-bold ${card.hasAutoRule ? 'text-purple-700' : 'text-gray-500'}`}>
                          Ativação automática por meta
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateCard(card.featureId, 'hasAutoRule', !card.hasAutoRule)}
                        className="flex-shrink-0"
                      >
                        {card.hasAutoRule
                          ? <ToggleRight className="w-6 h-6 text-purple-500" />
                          : <ToggleLeft className="w-6 h-6 text-gray-300" />
                        }
                      </button>
                    </div>

                    {card.hasAutoRule && (
                      <>
                        <div className="grid grid-cols-3 gap-2">
                          <select
                            value={card.metric}
                            onChange={e => updateCard(card.featureId, 'metric', e.target.value)}
                            className="border border-purple-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/30"
                          >
                            {METRIC_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                          </select>
                          <select
                            value={card.operator}
                            onChange={e => updateCard(card.featureId, 'operator', e.target.value)}
                            className="border border-purple-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/30"
                          >
                            {OPERATOR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                          <input
                            type="number" step="0.01"
                            value={card.threshold}
                            onChange={e => updateCard(card.featureId, 'threshold', parseFloat(e.target.value) || 0)}
                            placeholder="Valor"
                            className="border border-purple-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/30"
                          />
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="text-[10px] font-bold text-purple-600">Duração da meta:</label>
                          <input
                            type="number"
                            value={card.rule_duration_days}
                            onChange={e => updateCard(card.featureId, 'rule_duration_days', parseInt(e.target.value) || 30)}
                            className="w-16 border border-purple-200 rounded-lg px-2 py-1 text-xs text-center bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/30"
                          />
                          <span className="text-[10px] text-purple-500">dias</span>
                        </div>

                        {card.threshold > 0 && (
                          <div className="bg-purple-100/50 rounded-lg px-3 py-1.5">
                            <p className="text-[11px] text-purple-700 font-medium">
                              Concedido automaticamente quando <strong>{metricInfo?.label}</strong>
                              {' '}{card.operator} <strong>{card.threshold} {metricInfo?.unit}</strong>
                              {' '}por <strong>{card.rule_duration_days}d</strong>
                            </p>
                          </div>
                        )}
                      </>
                    )}

                    {!card.hasAutoRule && (
                      <p className="text-[10px] text-gray-400 italic">Desativado. Ative para conceder automaticamente por desempenho.</p>
                    )}
                  </div>

                  {/* ── Opções gerais ── */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="flex items-center gap-3 bg-amber-50 rounded-xl px-3 py-2.5">
                      <button type="button" onClick={() => updateCard(card.featureId, 'free_for_all', !card.free_for_all)} className="flex-shrink-0">
                        {card.free_for_all ? <ToggleRight className="w-6 h-6 text-amber-500" /> : <ToggleLeft className="w-6 h-6 text-gray-300" />}
                      </button>
                      <div>
                        <p className="text-[11px] font-bold text-amber-700">Grátis p/ todos</p>
                        <p className="text-[9px] text-amber-500">{card.free_for_all ? 'Sim' : 'Não'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-blue-50 rounded-xl px-3 py-2.5">
                      <input
                        type="number" min="0"
                        value={card.trial_days}
                        onChange={e => updateCard(card.featureId, 'trial_days', parseInt(e.target.value) || 0)}
                        className="w-12 border border-blue-200 rounded-lg px-2 py-1 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-400/30 flex-shrink-0"
                      />
                      <div>
                        <p className="text-[11px] font-bold text-blue-700">Dias de teste</p>
                        <p className="text-[9px] text-blue-500">{card.trial_days > 0 ? `${card.trial_days}d grátis` : 'Sem teste'}</p>
                      </div>
                    </div>
                    <label className="flex items-center gap-3 bg-green-50 rounded-xl px-3 py-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={card.active}
                        onChange={e => updateCard(card.featureId, 'active', e.target.checked)}
                        className="w-4 h-4 accent-green-500 flex-shrink-0"
                      />
                      <div>
                        <p className="text-[11px] font-bold text-green-700">Ativo</p>
                        <p className="text-[9px] text-green-500">{card.active ? 'Visível' : 'Oculto'}</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <button
          onClick={() => addCard(activeTab)}
          className={`w-full border-2 border-dashed rounded-2xl py-4 text-sm font-bold transition flex items-center justify-center gap-2 ${currentTabConfig.border} text-gray-400 hover:${currentTabConfig.color}`}
        >
          <Plus className="w-4 h-4" /> Novo Benefício para {currentTabConfig.label}
        </button>

        {msg && (
          <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm max-w-[90vw] text-center ${
            msg.startsWith('Erro') ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
          }`}>
            {msg}
          </div>
        )}

        <button
          onClick={saveAll}
          disabled={saving}
          className="w-full bg-orange-500 text-white text-sm font-bold py-3 rounded-2xl hover:bg-orange-600 transition disabled:opacity-50 sticky bottom-4 shadow-lg flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Salvando...' : 'Salvar Tudo'}
        </button>
      </div>
    </main>
  );
}
