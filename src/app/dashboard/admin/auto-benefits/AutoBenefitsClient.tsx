'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { AutoBenefitRule, AutoBenefitMetric, AutoBenefitOperator, PremiumFeature } from '@/types/database';

const METRIC_OPTIONS: { value: AutoBenefitMetric; label: string; unit: string }[] = [
  { value: 'monthly_revenue', label: 'Faturamento Mensal', unit: 'R$' },
  { value: 'order_count', label: 'Pedidos no Mês', unit: 'pedidos' },
  { value: 'rating_avg', label: 'Avaliação Média', unit: 'estrelas' },
  { value: 'cancellation_rate', label: 'Taxa de Cancelamento', unit: '%' },
  { value: 'avg_prep_time', label: 'Tempo Médio de Preparo', unit: 'min' },
];

const OPERATOR_OPTIONS: { value: AutoBenefitOperator; label: string }[] = [
  { value: '>=', label: '>= (maior ou igual)' },
  { value: '<=', label: '<= (menor ou igual)' },
  { value: '>', label: '> (maior que)' },
  { value: '<', label: '< (menor que)' },
  { value: '=', label: '= (igual a)' },
];

interface RuleDraft extends Omit<AutoBenefitRule, 'id' | 'created_at' | 'updated_at'> {
  id?: string;
  _isNew?: boolean;
}

export default function AutoBenefitsClient() {
  const [rules, setRules] = useState<RuleDraft[]>([]);
  const [features, setFeatures] = useState<PremiumFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);
  const [originalIds, setOriginalIds] = useState<string[]>([]);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from('auto_benefit_rules').select('*').order('sort_order'),
      supabase.from('premium_features').select('*').eq('active', true).order('sort_order'),
    ]).then(([{ data: r }, { data: pf }]) => {
      if (r) {
        const mapped = r.map((rule: AutoBenefitRule) => ({
          id: rule.id,
          name: rule.name,
          description: rule.description ?? '',
          metric: rule.metric,
          operator: rule.operator,
          threshold: Number(rule.threshold),
          benefit_slug: rule.benefit_slug,
          duration_days: rule.duration_days,
          active: rule.active,
          sort_order: rule.sort_order,
        }));
        setRules(mapped);
        setOriginalIds(mapped.map(f => f.id!));
      }
      if (pf) setFeatures(pf as PremiumFeature[]);
      setLoading(false);
    });
  }, []);

  const addRule = useCallback(() => {
    setRules(prev => [
      ...prev,
      {
        name: '',
        description: '',
        metric: 'monthly_revenue' as AutoBenefitMetric,
        operator: '>=' as AutoBenefitOperator,
        threshold: 0,
        benefit_slug: features[0]?.slug || '',
        duration_days: 30,
        active: true,
        sort_order: prev.length,
        _isNew: true,
      },
    ]);
  }, [features]);

  const removeRule = useCallback((index: number) => {
    setRules(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateRule = useCallback((index: number, field: keyof RuleDraft, value: string | number | boolean) => {
    setRules(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  }, []);

  async function saveAll() {
    setSaving(true);
    const supabase = createClient();

    const currentIds = rules.filter(r => r.id).map(r => r.id!);
    const removedIds = originalIds.filter(id => !currentIds.includes(id));

    if (removedIds.length > 0) {
      await supabase.from('auto_benefit_rules').delete().in('id', removedIds);
    }

    for (const r of rules.filter(r => r.id && !r._isNew)) {
      await supabase.from('auto_benefit_rules').update({
        name: r.name,
        description: r.description || null,
        metric: r.metric,
        operator: r.operator,
        threshold: r.threshold,
        benefit_slug: r.benefit_slug,
        duration_days: r.duration_days,
        active: r.active,
        sort_order: r.sort_order,
        updated_at: new Date().toISOString(),
      }).eq('id', r.id!);
    }

    const newRules = rules.filter(r => r._isNew && r.name);
    if (newRules.length > 0) {
      const { data } = await supabase.from('auto_benefit_rules').insert(
        newRules.map(r => ({
          name: r.name,
          description: r.description || null,
          metric: r.metric,
          operator: r.operator,
          threshold: r.threshold,
          benefit_slug: r.benefit_slug,
          duration_days: r.duration_days,
          active: r.active,
          sort_order: r.sort_order,
        }))
      ).select();
      if (data) {
        setRules(prev => prev.map(r => {
          if (!r._isNew) return r;
          const match = data.find(d => d.name === r.name && d.metric === r.metric);
          if (match) return { ...r, id: match.id, _isNew: false };
          return r;
        }));
      }
    }

    setOriginalIds(rules.filter(r => r.id || !r._isNew).map(r => r.id!));
    setSaving(false);
    alert('Regras salvas com sucesso!');
  }

  async function runNow() {
    setRunning(true);
    setRunResult(null);
    try {
      const res = await fetch(`/api/cron/auto-benefits?key=${encodeURIComponent(process.env.NEXT_PUBLIC_CRON_SECRET || '')}`, {
        method: 'GET',
      });
      const data = await res.json();
      if (res.ok) {
        setRunResult(`${data.granted} concedidos, ${data.revoked} revogados (${data.vendorsEvaluated} vendors avaliados)`);
      } else {
        setRunResult(`Erro: ${data.error || 'Falha ao executar'}`);
      }
    } catch {
      setRunResult('Erro de rede ao executar.');
    }
    setRunning(false);
  }

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
          <div>
            <h1 className="font-bold text-gray-900 leading-none">Benefícios Automáticos</h1>
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Regras por métrica de desempenho</p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Botão executar agora */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
          <div>
            <p className="font-bold text-sm text-gray-900">Executar Avaliação Agora</p>
            <p className="text-xs text-gray-400">Avalia todos os vendors contra as regras ativas e concede/revoga benefícios.</p>
            {runResult && (
              <p className="text-xs text-green-600 font-bold mt-1">{runResult}</p>
            )}
          </div>
          <button
            onClick={runNow}
            disabled={running}
            className="bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-emerald-600 transition disabled:opacity-50"
          >
            {running ? 'Executando...' : 'Executar'}
          </button>
        </div>

        {/* Lista de regras */}
        {rules.map((rule, index) => (
          <div key={rule.id ?? `new-${index}`} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${rule.active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  {rule.active ? 'Ativa' : 'Inativa'}
                </span>
                {rule._isNew && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">Nova</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rule.active}
                    onChange={e => updateRule(index, 'active', e.target.checked)}
                    className="w-4 h-4 accent-orange-500"
                  />
                  <span className="text-xs text-gray-500">Ativa</span>
                </label>
                <button
                  onClick={() => removeRule(index)}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="Remover"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Nome e Descrição */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Nome da Regra</label>
                <input
                  type="text"
                  value={rule.name}
                  onChange={e => updateRule(index, 'name', e.target.value)}
                  placeholder="Ex: Destaque por Faturamento"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Descrição</label>
                <input
                  type="text"
                  value={rule.description ?? ''}
                  onChange={e => updateRule(index, 'description', e.target.value)}
                  placeholder="Descrição para o vendor entender"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                />
              </div>
            </div>

            {/* Condição: Métrica + Operador + Threshold */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Métrica</label>
                <select
                  value={rule.metric}
                  onChange={e => updateRule(index, 'metric', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                >
                  {METRIC_OPTIONS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Condição</label>
                <select
                  value={rule.operator}
                  onChange={e => updateRule(index, 'operator', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                >
                  {OPERATOR_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">
                  Valor ({METRIC_OPTIONS.find(m => m.value === rule.metric)?.unit || ''})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={rule.threshold}
                  onChange={e => updateRule(index, 'threshold', parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                />
              </div>
            </div>

            {/* Benefício + Duração + Ordem */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Benefício Concedido</label>
                <select
                  value={rule.benefit_slug}
                  onChange={e => updateRule(index, 'benefit_slug', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                >
                  {features.map(f => (
                    <option key={f.slug} value={f.slug}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Duração (dias)</label>
                <input
                  type="number"
                  value={rule.duration_days}
                  onChange={e => updateRule(index, 'duration_days', parseInt(e.target.value) || 30)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Ordem</label>
                <input
                  type="number"
                  value={rule.sort_order}
                  onChange={e => updateRule(index, 'sort_order', parseInt(e.target.value) || 0)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                />
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={addRule}
          className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-4 text-sm font-bold text-gray-400 hover:text-orange-500 hover:border-orange-300 transition"
        >
          + Nova Regra Automática
        </button>

        <button
          onClick={saveAll}
          disabled={saving}
          className="w-full bg-orange-500 text-white text-sm font-bold py-3 rounded-2xl hover:bg-orange-600 transition disabled:opacity-50 sticky bottom-4 shadow-lg"
        >
          {saving ? 'Salvando...' : 'Salvar Todas as Regras'}
        </button>
      </div>
    </main>
  );
}
