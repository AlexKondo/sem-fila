'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Plus, Trash2, Save } from 'lucide-react';
import type { PremiumFeature, AutoBenefitRule, AutoBenefitMetric, AutoBenefitOperator } from '@/types/database';

const METRIC_OPTIONS: { value: AutoBenefitMetric; label: string }[] = [
  { value: 'monthly_revenue', label: 'Faturamento Mensal (R$)' },
  { value: 'order_count', label: 'Pedidos no Mês' },
  { value: 'rating_avg', label: 'Avaliação Média' },
  { value: 'cancellation_rate', label: 'Taxa de Cancelamento (%)' },
  { value: 'avg_prep_time', label: 'Tempo Médio de Preparo (min)' },
];

const OPERATOR_OPTIONS: { value: AutoBenefitOperator; label: string }[] = [
  { value: '>=', label: '>= (acima de)' },
  { value: '<=', label: '<= (abaixo de)' },
  { value: '>', label: '> (maior que)' },
  { value: '<', label: '< (menor que)' },
  { value: '=', label: '= (igual a)' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function PremiumAdminModal({ isOpen, onClose }: Props) {
  const [tab, setTab] = useState<'features' | 'rules'>('features');
  const [features, setFeatures] = useState<PremiumFeature[]>([]);
  const [rules, setRules] = useState<AutoBenefitRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const supabase = createClient();
    Promise.all([
      supabase.from('premium_features').select('*').order('sort_order'),
      supabase.from('auto_benefit_rules').select('*').order('sort_order'),
    ]).then(([{ data: pf }, { data: ar }]) => {
      setFeatures((pf || []) as PremiumFeature[]);
      setRules((ar || []) as AutoBenefitRule[]);
      setLoading(false);
    });
  }, [isOpen]);

  function updateFeature(idx: number, field: string, value: any) {
    setFeatures(prev => prev.map((f, i) => i === idx ? { ...f, [field]: value } : f));
  }

  function addFeature() {
    setFeatures(prev => [...prev, {
      id: `new_${Date.now()}`,
      slug: '',
      name: '',
      description: '',
      price: 0,
      duration_days: 30,
      active: true,
      free_for_all: false,
      trial_days: 0,
      sort_order: prev.length + 1,
      target_audience: 'vendor' as const,
      created_at: '',
      updated_at: '',
    }]);
  }

  function removeFeature(idx: number) {
    setFeatures(prev => prev.filter((_, i) => i !== idx));
  }

  function updateRule(idx: number, field: string, value: any) {
    setRules(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  }

  function addRule() {
    setRules(prev => [...prev, {
      id: `new_${Date.now()}`,
      name: '',
      description: '',
      metric: 'monthly_revenue' as AutoBenefitMetric,
      operator: '>=' as AutoBenefitOperator,
      threshold: 0,
      benefit_slug: '',
      duration_days: 30,
      active: true,
      sort_order: prev.length + 1,
      target_audience: 'vendor' as const,
      created_at: '',
      updated_at: '',
    }]);
  }

  function removeRule(idx: number) {
    setRules(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    setSaving(true);
    setMsg('');
    const supabase = createClient();

    try {
      // Save features
      const { data: existingFeatures } = await supabase.from('premium_features').select('id');
      const existingIds = new Set((existingFeatures || []).map(f => f.id));
      const currentIds = new Set(features.filter(f => !f.id.startsWith('new_')).map(f => f.id));

      // Delete removed
      const toDelete = [...existingIds].filter(id => !currentIds.has(id));
      if (toDelete.length > 0) {
        await supabase.from('premium_features').delete().in('id', toDelete);
      }

      // Upsert existing + insert new
      for (const f of features) {
        const payload = {
          slug: f.slug,
          name: f.name,
          description: f.description || null,
          price: Number(f.price),
          duration_days: Number(f.duration_days),
          active: f.active,
          free_for_all: f.free_for_all,
          trial_days: Number(f.trial_days),
          sort_order: Number(f.sort_order),
        };
        if (f.id.startsWith('new_')) {
          await supabase.from('premium_features').insert(payload);
        } else {
          await supabase.from('premium_features').update(payload).eq('id', f.id);
        }
      }

      // Save rules
      const { data: existingRules } = await supabase.from('auto_benefit_rules').select('id');
      const existingRuleIds = new Set((existingRules || []).map(r => r.id));
      const currentRuleIds = new Set(rules.filter(r => !r.id.startsWith('new_')).map(r => r.id));

      const rulesToDelete = [...existingRuleIds].filter(id => !currentRuleIds.has(id));
      if (rulesToDelete.length > 0) {
        await supabase.from('auto_benefit_rules').delete().in('id', rulesToDelete);
      }

      for (const r of rules) {
        const payload = {
          name: r.name,
          description: r.description || null,
          metric: r.metric,
          operator: r.operator,
          threshold: Number(r.threshold),
          benefit_slug: r.benefit_slug,
          duration_days: Number(r.duration_days),
          active: r.active,
          sort_order: Number(r.sort_order),
        };
        if (r.id.startsWith('new_')) {
          await supabase.from('auto_benefit_rules').insert(payload);
        } else {
          await supabase.from('auto_benefit_rules').update(payload).eq('id', r.id);
        }
      }

      setMsg('Salvo com sucesso!');
      setTimeout(() => setMsg(''), 2000);
    } catch (err: any) {
      setMsg(`Erro: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-slate-900">Gerenciar Benefícios e Metas</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setTab('features')}
            className={`flex-1 py-3 text-sm font-bold transition ${tab === 'features' ? 'text-orange-600 border-b-2 border-orange-500' : 'text-slate-400'}`}
          >
            Benefícios Premium ({features.length})
          </button>
          <button
            onClick={() => setTab('rules')}
            className={`flex-1 py-3 text-sm font-bold transition ${tab === 'rules' ? 'text-orange-600 border-b-2 border-orange-500' : 'text-slate-400'}`}
          >
            Metas Automáticas ({rules.length})
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <p className="text-center text-slate-400 py-8">Carregando...</p>
          ) : tab === 'features' ? (
            <div className="space-y-4">
              {features.map((f, idx) => (
                <div key={f.id} className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                    <button onClick={() => removeFeature(idx)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Nome</label>
                      <input
                        value={f.name}
                        onChange={e => updateFeature(idx, 'name', e.target.value)}
                        className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Slug</label>
                      <input
                        value={f.slug}
                        onChange={e => updateFeature(idx, 'slug', e.target.value)}
                        className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
                        placeholder="ex: destaque_plataforma"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase">Descrição</label>
                    <input
                      value={f.description || ''}
                      onChange={e => updateFeature(idx, 'description', e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Preço (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={f.price}
                        onChange={e => updateFeature(idx, 'price', e.target.value)}
                        className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Duração (dias)</label>
                      <input
                        type="number"
                        value={f.duration_days}
                        onChange={e => updateFeature(idx, 'duration_days', e.target.value)}
                        className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Ordem</label>
                      <input
                        type="number"
                        value={f.sort_order}
                        onChange={e => updateFeature(idx, 'sort_order', e.target.value)}
                        className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={f.active}
                      onChange={e => updateFeature(idx, 'active', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-slate-600">Ativo</span>
                  </label>
                </div>
              ))}
              <button
                onClick={addFeature}
                className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm font-bold text-slate-400 hover:border-orange-300 hover:text-orange-500 transition flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Adicionar Benefício
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {rules.map((r, idx) => (
                <div key={r.id} className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                    <button onClick={() => removeRule(idx)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Nome</label>
                      <input
                        value={r.name}
                        onChange={e => updateRule(idx, 'name', e.target.value)}
                        className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Slug do Benefício</label>
                      <select
                        value={r.benefit_slug}
                        onChange={e => updateRule(idx, 'benefit_slug', e.target.value)}
                        className="w-full mt-1 px-3 py-2 rounded-lg border text-sm bg-white"
                      >
                        <option value="">Selecione...</option>
                        {features.map(f => (
                          <option key={f.slug} value={f.slug}>{f.name} ({f.slug})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase">Descrição</label>
                    <input
                      value={r.description || ''}
                      onChange={e => updateRule(idx, 'description', e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Métrica</label>
                      <select
                        value={r.metric}
                        onChange={e => updateRule(idx, 'metric', e.target.value)}
                        className="w-full mt-1 px-3 py-2 rounded-lg border text-sm bg-white"
                      >
                        {METRIC_OPTIONS.map(m => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Operador</label>
                      <select
                        value={r.operator}
                        onChange={e => updateRule(idx, 'operator', e.target.value)}
                        className="w-full mt-1 px-3 py-2 rounded-lg border text-sm bg-white"
                      >
                        {OPERATOR_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Valor</label>
                      <input
                        type="number"
                        step="0.01"
                        value={r.threshold}
                        onChange={e => updateRule(idx, 'threshold', e.target.value)}
                        className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Duração (dias)</label>
                      <input
                        type="number"
                        value={r.duration_days}
                        onChange={e => updateRule(idx, 'duration_days', e.target.value)}
                        className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Ordem</label>
                      <input
                        type="number"
                        value={r.sort_order}
                        onChange={e => updateRule(idx, 'sort_order', e.target.value)}
                        className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={r.active}
                      onChange={e => updateRule(idx, 'active', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-slate-600">Ativa</span>
                  </label>
                </div>
              ))}
              <button
                onClick={addRule}
                className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm font-bold text-slate-400 hover:border-orange-300 hover:text-orange-500 transition flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Adicionar Meta
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t">
          {msg && (
            <p className={`text-sm font-bold ${msg.startsWith('Erro') ? 'text-red-500' : 'text-emerald-600'}`}>
              {msg}
            </p>
          )}
          {!msg && <div />}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-orange-500 text-white text-sm font-bold px-6 py-2.5 rounded-xl hover:bg-orange-600 transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar Tudo'}
          </button>
        </div>
      </div>
    </div>
  );
}
