'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ToggleLeft, ToggleRight, Plus, Trash2, Save, Zap, ChevronDown, ChevronUp, Eye, Store, Users, UserCheck } from 'lucide-react';
import type { PremiumFeature, AutoBenefitRule, AutoBenefitMetric, AutoBenefitOperator, BenefitAudience } from '@/types/database';

// ── Audience config ──
const AUDIENCE_TABS: { value: BenefitAudience; label: string; icon: typeof Store; color: string; bg: string; border: string; desc: string }[] = [
  { value: 'vendor', label: 'Vendors', icon: Store, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', desc: 'Benefícios para barracas/quiosques' },
  { value: 'affiliate', label: 'Afiliados', icon: UserCheck, color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-200', desc: 'Benefícios para afiliados da plataforma' },
  { value: 'customer', label: 'Clientes', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', desc: 'Benefícios para clientes/consumidores' },
];

// ── Badge preview config (mesma do MenuClient) ──
const BADGE_PREVIEW: Record<string, { label: string; bg: string; text: string; border: string; icon: string }> = {
  destaque_plataforma: {
    label: 'Destaque', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200',
    icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  },
  selo_top_vendas: {
    label: 'Top Vendas', bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  },
  painel_eficiencia: {
    label: 'Atendimento Eficiente', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  analise_cardapio: {
    label: 'Preparo Rápido', bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-200',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
};

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

interface FeatureDraft {
  id: string;
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
  _isNew?: boolean;
}

interface RuleDraft {
  id: string;
  name: string;
  description: string;
  metric: AutoBenefitMetric;
  operator: AutoBenefitOperator;
  threshold: number;
  benefit_slug: string;
  duration_days: number;
  active: boolean;
  sort_order: number;
  target_audience: BenefitAudience;
  _isNew?: boolean;
}

function BadgePreview({ slug }: { slug: string }) {
  const cfg = BADGE_PREVIEW[slug];
  if (!cfg) return (
    <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-400 text-[9px] font-black px-2 py-0.5 rounded-full border border-gray-200 uppercase">
      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
      {slug || 'sem slug'}
    </span>
  );
  return (
    <span className={`inline-flex items-center gap-0.5 ${cfg.bg} ${cfg.text} text-[9px] font-black px-2 py-0.5 rounded-full border ${cfg.border} uppercase`}>
      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d={cfg.icon}/></svg>
      {cfg.label}
    </span>
  );
}

function AudienceBadge({ audience }: { audience: BenefitAudience }) {
  const tab = AUDIENCE_TABS.find(t => t.value === audience)!;
  const Icon = tab.icon;
  return (
    <span className={`inline-flex items-center gap-1 ${tab.bg} ${tab.color} text-[9px] font-black px-2 py-0.5 rounded-full border ${tab.border} uppercase`}>
      <Icon className="w-2.5 h-2.5" />
      {tab.label}
    </span>
  );
}

export default function BenefitsAdminClient() {
  const [features, setFeatures] = useState<FeatureDraft[]>([]);
  const [rules, setRules] = useState<RuleDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [originalFeatureIds, setOriginalFeatureIds] = useState<string[]>([]);
  const [originalRuleIds, setOriginalRuleIds] = useState<string[]>([]);
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<BenefitAudience>('vendor');

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from('premium_features').select('*').order('sort_order'),
      supabase.from('auto_benefit_rules').select('*').order('sort_order'),
    ]).then(([{ data: pf }, { data: ar }]) => {
      const mappedF = (pf || []).map((f: any) => ({
        id: f.id,
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
      }));
      const mappedR = (ar || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        description: r.description ?? '',
        metric: r.metric,
        operator: r.operator,
        threshold: Number(r.threshold),
        benefit_slug: r.benefit_slug,
        duration_days: r.duration_days,
        active: r.active,
        sort_order: r.sort_order,
        target_audience: (r.target_audience as BenefitAudience) || 'vendor',
      }));
      setFeatures(mappedF);
      setRules(mappedR);
      setOriginalFeatureIds(mappedF.map((f: FeatureDraft) => f.id));
      setOriginalRuleIds(mappedR.map((r: RuleDraft) => r.id));
      setExpandedFeatures(new Set(mappedF.map((f: FeatureDraft) => f.id)));
      setLoading(false);
    });
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedFeatures(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // ── Feature CRUD ──
  const addFeature = useCallback((audience: BenefitAudience) => {
    const id = `new_${Date.now()}`;
    setFeatures(prev => [...prev, {
      id, slug: '', name: '', description: '', price: 0,
      duration_days: 30, active: true, free_for_all: false,
      trial_days: 0, sort_order: prev.filter(f => f.target_audience === audience).length,
      target_audience: audience, _isNew: true,
    }]);
    setExpandedFeatures(prev => new Set([...prev, id]));
  }, []);

  const removeFeature = useCallback((id: string) => {
    setFeatures(prev => {
      const feat = prev.find(f => f.id === id);
      if (feat) {
        setRules(r => r.filter(rule => rule.benefit_slug !== feat.slug));
      }
      return prev.filter(f => f.id !== id);
    });
  }, []);

  const updateFeature = useCallback((id: string, field: keyof FeatureDraft, value: string | number | boolean) => {
    setFeatures(prev => prev.map(f => {
      if (f.id !== id) return f;
      const updated = { ...f, [field]: value };
      if (field === 'name' && f._isNew) {
        updated.slug = String(value)
          .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      }
      return updated;
    }));
  }, []);

  // ── Rule CRUD ──
  const addRule = useCallback((benefitSlug: string, audience: BenefitAudience) => {
    const id = `new_${Date.now()}`;
    setRules(prev => [...prev, {
      id, name: '', description: '',
      metric: 'monthly_revenue' as AutoBenefitMetric,
      operator: '>=' as AutoBenefitOperator,
      threshold: 0, benefit_slug: benefitSlug,
      duration_days: 30, active: true,
      sort_order: prev.filter(r => r.benefit_slug === benefitSlug).length,
      target_audience: audience, _isNew: true,
    }]);
  }, []);

  const removeRule = useCallback((id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
  }, []);

  const updateRule = useCallback((id: string, field: keyof RuleDraft, value: string | number | boolean) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }, []);

  // ── Helper: throw on supabase error ──
  function check<T>(result: { data: T; error: any }): T {
    if (result.error) throw new Error(result.error.message || 'Erro desconhecido do Supabase');
    return result.data;
  }

  // ── Save all ──
  async function saveAll() {
    setSaving(true);
    setMsg('');
    const supabase = createClient();

    // Detecta se coluna target_audience existe (migration pode não ter rodado)
    let hasAudienceCol = true;
    const testRes = await supabase.from('premium_features').select('target_audience').limit(1);
    if (testRes.error && testRes.error.message.includes('target_audience')) {
      hasAudienceCol = false;
    }

    try {
      // ── Features ──
      const currentFeatureIds = features.filter(f => !f._isNew).map(f => f.id);
      const removedFeatureIds = originalFeatureIds.filter(id => !currentFeatureIds.includes(id));

      if (removedFeatureIds.length > 0) {
        check(await supabase.from('premium_features').delete().in('id', removedFeatureIds));
      }

      for (const f of features.filter(f => !f._isNew)) {
        const payload: any = {
          name: f.name, slug: f.slug, description: f.description || null,
          price: f.price, duration_days: f.duration_days, active: f.active,
          free_for_all: f.free_for_all, trial_days: f.trial_days, sort_order: f.sort_order,
          updated_at: new Date().toISOString(),
        };
        if (hasAudienceCol) payload.target_audience = f.target_audience;
        check(await supabase.from('premium_features').update(payload).eq('id', f.id));
      }

      const newFeatures = features.filter(f => f._isNew && f.name && f.slug);
      if (newFeatures.length > 0) {
        const inserts = newFeatures.map(f => {
          const payload: any = {
            slug: f.slug, name: f.name, description: f.description || null,
            price: f.price, duration_days: f.duration_days, active: f.active,
            free_for_all: f.free_for_all, trial_days: f.trial_days, sort_order: f.sort_order,
          };
          if (hasAudienceCol) payload.target_audience = f.target_audience;
          return payload;
        });
        const data = check(await supabase.from('premium_features').insert(inserts).select());
        if (data) {
          setFeatures(prev => prev.map(f => {
            if (!f._isNew) return f;
            const match = (data as any[]).find((d: any) => d.slug === f.slug);
            if (match) return { ...f, id: match.id, _isNew: false };
            return f;
          }));
        }
      }

      // ── Rules ──
      const currentRuleIds = rules.filter(r => !r._isNew).map(r => r.id);
      const removedRuleIds = originalRuleIds.filter(id => !currentRuleIds.includes(id));

      if (removedRuleIds.length > 0) {
        check(await supabase.from('auto_benefit_rules').delete().in('id', removedRuleIds));
      }

      for (const r of rules.filter(r => !r._isNew)) {
        const payload: any = {
          name: r.name, description: r.description || null,
          metric: r.metric, operator: r.operator, threshold: r.threshold,
          benefit_slug: r.benefit_slug, duration_days: r.duration_days,
          active: r.active, sort_order: r.sort_order,
          updated_at: new Date().toISOString(),
        };
        if (hasAudienceCol) payload.target_audience = r.target_audience;
        check(await supabase.from('auto_benefit_rules').update(payload).eq('id', r.id));
      }

      const newRules = rules.filter(r => r._isNew && r.name);
      if (newRules.length > 0) {
        const inserts = newRules.map(r => {
          const payload: any = {
            name: r.name, description: r.description || null,
            metric: r.metric, operator: r.operator, threshold: r.threshold,
            benefit_slug: r.benefit_slug, duration_days: r.duration_days,
            active: r.active, sort_order: r.sort_order,
          };
          if (hasAudienceCol) payload.target_audience = r.target_audience;
          return payload;
        });
        const data = check(await supabase.from('auto_benefit_rules').insert(inserts).select());
        if (data) {
          setRules(prev => prev.map(r => {
            if (!r._isNew) return r;
            const match = (data as any[]).find((d: any) => d.name === r.name && d.benefit_slug === r.benefit_slug);
            if (match) return { ...r, id: match.id, _isNew: false };
            return r;
          }));
        }
      }

      setOriginalFeatureIds(features.map(f => f._isNew ? '' : f.id).filter(Boolean));
      setOriginalRuleIds(rules.map(r => r._isNew ? '' : r.id).filter(Boolean));
      setMsg(hasAudienceCol ? 'Tudo salvo com sucesso!' : 'Salvo! (Rode a migration target_audience para habilitar abas)');
      setTimeout(() => setMsg(''), 5000);
    } catch (err: any) {
      setMsg(`Erro: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  // ── Run auto-benefits evaluation ──
  async function runNow() {
    setRunning(true);
    setRunResult(null);
    try {
      const res = await fetch(`/api/cron/auto-benefits?key=${encodeURIComponent(process.env.NEXT_PUBLIC_CRON_SECRET || '')}`, { method: 'GET' });
      const data = await res.json();
      if (res.ok) {
        setRunResult(`${data.granted} concedidos, ${data.revoked} revogados (${data.vendorsEvaluated} vendors avaliados)`);
      } else {
        setRunResult(`Erro: ${data.error || 'Falha'}`);
      }
    } catch {
      setRunResult('Erro de rede.');
    }
    setRunning(false);
  }

  function rulesForSlug(slug: string) {
    return rules.filter(r => r.benefit_slug === slug);
  }

  // Features and orphan rules for current tab
  const tabFeatures = features.filter(f => f.target_audience === activeTab);
  const featureSlugs = new Set(features.map(f => f.slug));
  const orphanRules = rules.filter(r => r.benefit_slug && !featureSlugs.has(r.benefit_slug));
  const currentTabConfig = AUDIENCE_TABS.find(t => t.value === activeTab)!;

  // Counts per tab
  const countPerTab = (aud: BenefitAudience) => features.filter(f => f.target_audience === aud).length;

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
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
              Configure benefícios e regras automáticas por público
            </p>
          </div>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition ${showPreview ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </button>
        </div>

        {/* Audience Tabs */}
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

        {/* Tab description */}
        <div className={`rounded-2xl border ${currentTabConfig.border} ${currentTabConfig.bg} p-3 flex items-center gap-3`}>
          {(() => { const Icon = currentTabConfig.icon; return <Icon className={`w-5 h-5 ${currentTabConfig.color} flex-shrink-0`} />; })()}
          <p className={`text-xs font-medium ${currentTabConfig.color}`}>{currentTabConfig.desc}</p>
        </div>

        {/* Preview dos selos */}
        {showPreview && (
          <div className="bg-white rounded-2xl border border-orange-200 shadow-sm p-4">
            <p className="text-xs font-bold text-orange-600 uppercase mb-3">Preview — Como o cliente vê os selos (vendor)</p>
            <div className="bg-gray-50 rounded-xl p-4 flex flex-wrap gap-2">
              {features.filter(f => f.active && f.target_audience === 'vendor').map(f => (
                <BadgePreview key={f.id} slug={f.slug} />
              ))}
              {features.filter(f => f.active && f.target_audience === 'vendor').length === 0 && (
                <p className="text-xs text-gray-400">Nenhum benefício vendor ativo</p>
              )}
            </div>
          </div>
        )}

        {/* Executar avaliação */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
          <div>
            <p className="font-bold text-sm text-gray-900">Executar Avaliação</p>
            <p className="text-xs text-gray-400">Avalia contra regras ativas e concede/revoga benefícios.</p>
            {runResult && <p className="text-xs text-green-600 font-bold mt-1">{runResult}</p>}
          </div>
          <button
            onClick={runNow}
            disabled={running}
            className="bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-emerald-600 transition disabled:opacity-50 flex-shrink-0"
          >
            {running ? 'Executando...' : 'Executar'}
          </button>
        </div>

        {/* ── BENEFÍCIOS do tab ativo ── */}
        {tabFeatures.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <p className="text-gray-400 text-sm">Nenhum benefício para <strong>{currentTabConfig.label}</strong> ainda.</p>
          </div>
        )}

        {tabFeatures.map((feature) => {
          const linkedRules = rulesForSlug(feature.slug);
          const isExpanded = expandedFeatures.has(feature.id);

          return (
            <div key={feature.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${currentTabConfig.border}`}>
              {/* Feature header */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <AudienceBadge audience={feature.target_audience} />
                    <BadgePreview slug={feature.slug} />
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${feature.active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                      {feature.active ? 'Ativo' : 'Inativo'}
                    </span>
                    {feature._isNew && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 uppercase">Novo</span>
                    )}
                    {linkedRules.length > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">
                        {linkedRules.length} meta{linkedRules.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggleExpand(feature.id)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button onClick={() => removeFeature(feature.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Remover">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="space-y-3">
                    {/* Nome + Slug */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Nome</label>
                        <input
                          value={feature.name}
                          onChange={e => updateFeature(feature.id, 'name', e.target.value)}
                          placeholder="Ex: Destaque Plataforma"
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Slug</label>
                        <input
                          value={feature.slug}
                          onChange={e => updateFeature(feature.id, 'slug', e.target.value)}
                          placeholder="destaque_plataforma"
                          disabled={!feature._isNew}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 disabled:bg-gray-50 disabled:text-gray-400"
                        />
                      </div>
                    </div>

                    {/* Descrição */}
                    <div>
                      <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Descrição</label>
                      <input
                        value={feature.description}
                        onChange={e => updateFeature(feature.id, 'description', e.target.value)}
                        placeholder="O que este público ganha com este benefício"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                      />
                    </div>

                    {/* Preço / Duração / Ordem */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Preço (R$)</label>
                        <input
                          type="number" step="0.01"
                          value={feature.price}
                          onChange={e => updateFeature(feature.id, 'price', parseFloat(e.target.value) || 0)}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Duração (dias)</label>
                        <input
                          type="number"
                          value={feature.duration_days}
                          onChange={e => updateFeature(feature.id, 'duration_days', parseInt(e.target.value) || 30)}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Ordem</label>
                        <input
                          type="number"
                          value={feature.sort_order}
                          onChange={e => updateFeature(feature.id, 'sort_order', parseInt(e.target.value) || 0)}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                        />
                      </div>
                    </div>

                    {/* Toggles */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="flex items-center gap-3 bg-amber-50 rounded-xl px-3 py-2.5">
                        <button type="button" onClick={() => updateFeature(feature.id, 'free_for_all', !feature.free_for_all)} className="flex-shrink-0">
                          {feature.free_for_all ? <ToggleRight className="w-6 h-6 text-amber-500" /> : <ToggleLeft className="w-6 h-6 text-gray-300" />}
                        </button>
                        <div>
                          <p className="text-[11px] font-bold text-amber-700">Grátis p/ todos</p>
                          <p className="text-[9px] text-amber-500">{feature.free_for_all ? 'Sim' : 'Não'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-blue-50 rounded-xl px-3 py-2.5">
                        <input
                          type="number" min="0"
                          value={feature.trial_days}
                          onChange={e => updateFeature(feature.id, 'trial_days', parseInt(e.target.value) || 0)}
                          className="w-12 border border-blue-200 rounded-lg px-2 py-1 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-400/30 flex-shrink-0"
                        />
                        <div>
                          <p className="text-[11px] font-bold text-blue-700">Dias de teste</p>
                          <p className="text-[9px] text-blue-500">{feature.trial_days > 0 ? `${feature.trial_days}d grátis` : 'Sem teste'}</p>
                        </div>
                      </div>
                      <label className="flex items-center gap-3 bg-green-50 rounded-xl px-3 py-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={feature.active}
                          onChange={e => updateFeature(feature.id, 'active', e.target.checked)}
                          className="w-4 h-4 accent-green-500 flex-shrink-0"
                        />
                        <div>
                          <p className="text-[11px] font-bold text-green-700">Ativo</p>
                          <p className="text-[9px] text-green-500">{feature.active ? 'Visível' : 'Oculto'}</p>
                        </div>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Metas vinculadas ── */}
              {isExpanded && (
                <div className="border-t border-gray-100 bg-slate-50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-purple-500" />
                      <p className="text-xs font-bold text-slate-600">
                        Metas que concedem este benefício automaticamente
                      </p>
                    </div>
                    <button
                      onClick={() => addRule(feature.slug, feature.target_audience)}
                      className="flex items-center gap-1 text-[11px] font-bold text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg transition"
                    >
                      <Plus className="w-3 h-3" /> Meta
                    </button>
                  </div>

                  {linkedRules.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      Nenhuma meta automática. Só ganha comprando.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {linkedRules.map(rule => (
                        <div key={rule.id} className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${rule.active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                {rule.active ? 'Ativa' : 'Inativa'}
                              </span>
                              {rule._isNew && (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 uppercase">Nova</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input type="checkbox" checked={rule.active} onChange={e => updateRule(rule.id, 'active', e.target.checked)} className="w-3.5 h-3.5 accent-green-500" />
                                <span className="text-[10px] text-gray-500">Ativa</span>
                              </label>
                              <button onClick={() => removeRule(rule.id)} className="p-1 text-red-400 hover:text-red-600 rounded transition">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <input
                            value={rule.name}
                            onChange={e => updateRule(rule.id, 'name', e.target.value)}
                            placeholder="Nome da meta (ex: Faturamento > R$ 5.000)"
                            className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                          />

                          <div className="grid grid-cols-3 gap-2">
                            <select value={rule.metric} onChange={e => updateRule(rule.id, 'metric', e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30">
                              {METRIC_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                            <select value={rule.operator} onChange={e => updateRule(rule.id, 'operator', e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30">
                              {OPERATOR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                            <input type="number" step="0.01" value={rule.threshold} onChange={e => updateRule(rule.id, 'threshold', parseFloat(e.target.value) || 0)} placeholder="Valor" className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/30" />
                          </div>

                          <div className="bg-purple-50 rounded-lg px-3 py-1.5">
                            <p className="text-[11px] text-purple-700 font-medium">
                              Se <strong>{METRIC_OPTIONS.find(m => m.value === rule.metric)?.label}</strong>
                              {' '}{rule.operator} <strong>{rule.threshold} {METRIC_OPTIONS.find(m => m.value === rule.metric)?.unit}</strong>
                              {' '}→ concede <strong>{feature.name || feature.slug}</strong> por <strong>{rule.duration_days}d</strong>
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <label className="text-[10px] font-bold text-slate-500">Duração:</label>
                            <input type="number" value={rule.duration_days} onChange={e => updateRule(rule.id, 'duration_days', parseInt(e.target.value) || 30)} className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-xs text-center focus:outline-none focus:ring-2 focus:ring-purple-500/30" />
                            <span className="text-[10px] text-slate-400">dias</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Orphan rules */}
        {orphanRules.length > 0 && (
          <div className="bg-red-50 rounded-2xl border border-red-200 p-4">
            <p className="text-xs font-bold text-red-600 mb-2">Metas sem benefício ({orphanRules.length})</p>
            {orphanRules.map(rule => (
              <div key={rule.id} className="bg-white rounded-xl border border-red-200 p-3 mb-2 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900">{rule.name || '(sem nome)'}</p>
                  <p className="text-[11px] text-red-500">Slug: {rule.benefit_slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select value={rule.benefit_slug} onChange={e => updateRule(rule.id, 'benefit_slug', e.target.value)} className="border border-red-200 rounded-lg px-2 py-1 text-xs bg-white">
                    <option value="">Selecione...</option>
                    {features.map(f => <option key={f.slug} value={f.slug}>{f.name} ({f.slug})</option>)}
                  </select>
                  <button onClick={() => removeRule(rule.id)} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add button */}
        <button
          onClick={() => addFeature(activeTab)}
          className={`w-full border-2 border-dashed rounded-2xl py-4 text-sm font-bold transition flex items-center justify-center gap-2 ${currentTabConfig.border} text-gray-400 hover:${currentTabConfig.color}`}
        >
          <Plus className="w-4 h-4" /> Novo Benefício para {currentTabConfig.label}
        </button>

        {/* Feedback toast */}
        {msg && (
          <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-lg font-bold text-sm animate-pulse ${
            msg.startsWith('Erro') ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
          }`}>
            {msg.startsWith('Erro') ? msg : `${msg}`}
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
