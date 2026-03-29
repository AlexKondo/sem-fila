'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { LevelConfig, PointRule } from '@/types/database';
import { Plus, Trash2, Save } from 'lucide-react';

const PROFILE_TYPES = [
  { key: 'customer', label: 'Clientes' },
  { key: 'vendor', label: 'Vendedores' },
  { key: 'org_admin', label: 'Organizadores' },
];

const LEVEL_LABELS: Record<string, string> = {
  bronze: '🥉 Bronze',
  silver: '🥈 Prata',
  gold: '🥇 Ouro',
  platinum: '💎 Platina',
};

const TARGET_OPTIONS = [
  { value: 'customer', label: 'Cliente' },
  { value: 'vendor', label: 'Vendedor' },
];

export default function GamificationClient() {
  const [configs, setConfigs] = useState<LevelConfig[]>([]);
  const [pointRules, setPointRules] = useState<PointRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('customer');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<LevelConfig>>({});

  // Point rules state
  const [editedRules, setEditedRules] = useState<Record<string, Partial<PointRule>>>({});
  const [savingRules, setSavingRules] = useState(false);
  const [newRule, setNewRule] = useState<{ action: string; label: string; target: string; points: number } | null>(null);
  const [ruleError, setRuleError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from('level_configs').select('*').order('profile_type').order('level_order'),
      supabase.from('point_rules').select('*').order('sort_order'),
    ]).then(([{ data: lc }, { data: pr }]) => {
      if (lc) setConfigs(lc as LevelConfig[]);
      if (pr) setPointRules(pr as PointRule[]);
      setLoading(false);
    });
  }, []);

  const tabConfigs = configs.filter(c => c.profile_type === activeTab);
  const [creatingSeed, setCreatingSeed] = useState(false);

  const DEFAULT_LEVELS = [
    { level_name: 'bronze', level_order: 1, min_points: 0, badge_color: '#cd7f32', badge_emoji: '🥉', benefits: [{ label: 'Acesso básico' }] },
    { level_name: 'silver', level_order: 2, min_points: 100, badge_color: '#c0c0c0', badge_emoji: '🥈', benefits: [{ label: 'Prioridade leve' }] },
    { level_name: 'gold', level_order: 3, min_points: 500, badge_color: '#ffd700', badge_emoji: '🥇', benefits: [{ label: 'Destaque no ranking' }] },
    { level_name: 'platinum', level_order: 4, min_points: 1500, badge_color: '#e5e4e2', badge_emoji: '💎', benefits: [{ label: 'Benefícios exclusivos' }] },
  ];

  async function createDefaultLevels() {
    setCreatingSeed(true);
    const supabase = createClient();
    const rows = DEFAULT_LEVELS.map(l => ({ ...l, profile_type: activeTab, active: true }));
    const { data } = await supabase.from('level_configs').insert(rows).select();
    if (data) setConfigs(prev => [...prev, ...(data as LevelConfig[])]);
    setCreatingSeed(false);
  }

  async function saveEdit(id: string) {
    setSaving(id);
    const supabase = createClient();
    await supabase.from('level_configs').update(editValues).eq('id', id);
    setConfigs(prev => prev.map(c => c.id === id ? { ...c, ...editValues } : c));
    setEditingId(null);
    setEditValues({});
    setSaving(null);
  }

  function startEdit(config: LevelConfig) {
    setEditingId(config.id);
    setEditValues({
      min_points: config.min_points,
      badge_color: config.badge_color,
      badge_emoji: config.badge_emoji,
      benefits: config.benefits,
      active: config.active,
    });
  }

  function updateRuleLocal(id: string, field: string, value: string | number | boolean) {
    setEditedRules(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  }

  function getRuleValue(rule: PointRule, field: keyof PointRule) {
    return editedRules[rule.id]?.[field] ?? rule[field];
  }

  async function saveAllRules() {
    setSavingRules(true);
    setRuleError('');
    const supabase = createClient();
    const entries = Object.entries(editedRules);
    for (const [id, changes] of entries) {
      const { error } = await supabase.from('point_rules').update(changes).eq('id', id);
      if (error) { setRuleError(error.message); setSavingRules(false); return; }
    }
    // Refresh
    const { data } = await supabase.from('point_rules').select('*').order('sort_order');
    if (data) setPointRules(data as PointRule[]);
    setEditedRules({});
    setSavingRules(false);
  }

  async function addRule() {
    if (!newRule || !newRule.action || !newRule.label) { setRuleError('Preencha ação e label'); return; }
    setSavingRules(true);
    setRuleError('');
    const supabase = createClient();
    const { data, error } = await supabase.from('point_rules').insert({
      action: newRule.action,
      label: newRule.label,
      target: newRule.target || 'customer',
      points: newRule.points || 0,
      active: true,
      sort_order: pointRules.length + 1,
    }).select().single();
    if (error) { setRuleError(error.message); setSavingRules(false); return; }
    setPointRules(prev => [...prev, data as PointRule]);
    setNewRule(null);
    setSavingRules(false);
  }

  async function deleteRule(id: string) {
    const supabase = createClient();
    await supabase.from('point_rules').delete().eq('id', id);
    setPointRules(prev => prev.filter(r => r.id !== id));
    const copy = { ...editedRules };
    delete copy[id];
    setEditedRules(copy);
  }

  async function toggleRuleActive(rule: PointRule) {
    const supabase = createClient();
    const newActive = !rule.active;
    await supabase.from('point_rules').update({ active: newActive }).eq('id', rule.id);
    setPointRules(prev => prev.map(r => r.id === rule.id ? { ...r, active: newActive } : r));
  }

  const hasRuleChanges = Object.keys(editedRules).length > 0;

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
            <h1 className="font-bold text-gray-900 leading-none">Níveis de Bonificação</h1>
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Gamificação da Plataforma</p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {/* ===== SEÇÃO 1: REGRAS DE PONTUAÇÃO ===== */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Regras de Pontuação</h2>
              <p className="text-xs text-gray-400 mt-0.5">Defina quantos pontos cada ação concede</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setNewRule({ action: '', label: '', target: 'customer', points: 0 })}
                className="flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-orange-50 px-3 py-2 rounded-xl hover:bg-orange-100 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Nova regra
              </button>
              {hasRuleChanges && (
                <button
                  onClick={saveAllRules}
                  disabled={savingRules}
                  className="flex items-center gap-1.5 text-xs font-bold text-white bg-orange-500 px-4 py-2 rounded-xl hover:bg-orange-600 transition disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" /> {savingRules ? 'Salvando...' : 'Salvar alterações'}
                </button>
              )}
            </div>
          </div>

          {ruleError && <p className="text-red-600 text-xs mb-3">{ruleError}</p>}

          {/* Form nova regra */}
          {newRule && (
            <div className="bg-white rounded-2xl border border-orange-200 shadow-sm p-4 mb-4 space-y-3">
              <h3 className="text-sm font-bold text-gray-900">Nova regra de pontuação</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-gray-500 block mb-1">Nome da ação</label>
                  <input
                    placeholder="ex: Pedido realizado"
                    value={newRule.label}
                    onChange={e => {
                      const label = e.target.value;
                      const slug = label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
                      setNewRule(p => p ? { ...p, label, action: slug } : null);
                    }}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">Quem recebe</label>
                  <select
                    value={newRule.target}
                    onChange={e => setNewRule(p => p ? { ...p, target: e.target.value } : null)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                  >
                    {TARGET_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">Pontos</label>
                  <input
                    type="number"
                    value={newRule.points}
                    onChange={e => setNewRule(p => p ? { ...p, points: parseInt(e.target.value) || 0 } : null)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setNewRule(null)} className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-xl text-xs font-bold">Cancelar</button>
                <button onClick={addRule} disabled={savingRules} className="flex-1 bg-orange-500 text-white py-2 rounded-xl text-xs font-bold disabled:opacity-50">
                  {savingRules ? 'Salvando...' : 'Adicionar'}
                </button>
              </div>
            </div>
          )}

          {/* Lista de regras */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="grid grid-cols-[1fr_110px_80px_80px_40px] gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              <span>Nome</span>
              <span>Quem recebe</span>
              <span className="text-center">Pontos</span>
              <span className="text-center">Status</span>
              <span></span>
            </div>
            {pointRules.map(rule => (
              <div key={rule.id} className={`grid grid-cols-[1fr_110px_80px_80px_40px] gap-2 px-4 py-3 border-b border-gray-50 items-center ${!rule.active ? 'opacity-50' : ''}`}>
                <input
                  value={getRuleValue(rule, 'label') as string}
                  onChange={e => updateRuleLocal(rule.id, 'label', e.target.value)}
                  className="text-sm text-gray-800 font-medium border border-transparent hover:border-gray-200 focus:border-orange-300 rounded-lg px-2 py-1 focus:outline-none transition"
                />
                <select
                  value={getRuleValue(rule, 'target') as string}
                  onChange={e => updateRuleLocal(rule.id, 'target', e.target.value)}
                  className="text-xs text-gray-600 border border-transparent hover:border-gray-200 focus:border-orange-300 rounded-lg px-1 py-1 focus:outline-none transition"
                >
                  {TARGET_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <input
                  type="number"
                  value={getRuleValue(rule, 'points') as number}
                  onChange={e => updateRuleLocal(rule.id, 'points', parseInt(e.target.value) || 0)}
                  className="text-xs font-bold text-center text-gray-800 border border-transparent hover:border-gray-200 focus:border-orange-300 rounded-lg px-1 py-1 w-full focus:outline-none transition"
                />
                <div className="flex justify-center">
                  <button
                    onClick={() => toggleRuleActive(rule)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition ${rule.active ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                  >
                    {rule.active ? 'Ativo' : 'Inativo'}
                  </button>
                </div>
                <button
                  onClick={() => deleteRule(rule.id)}
                  className="text-gray-300 hover:text-red-500 transition p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {pointRules.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-8">Nenhuma regra de pontuação cadastrada.</p>
            )}
          </div>
        </div>

        {/* ===== SEÇÃO 2: NÍVEIS ===== */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Níveis por Categoria</h2>
          <div className="flex gap-2 mb-6">
            {PROFILE_TYPES.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
                  activeTab === t.key
                    ? 'bg-orange-500 text-white shadow'
                    : 'bg-white text-gray-500 border border-gray-100 hover:border-orange-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tabConfigs.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-gray-400 text-sm mb-4">Nenhum nível configurado para esta categoria.</p>
              <button
                onClick={createDefaultLevels}
                disabled={creatingSeed}
                className="bg-orange-500 text-white text-sm font-bold px-6 py-2.5 rounded-xl hover:bg-orange-600 transition disabled:opacity-50"
              >
                {creatingSeed ? 'Criando...' : 'Criar níveis padrão (Bronze, Prata, Ouro, Platina)'}
              </button>
            </div>
          ) : (
          <div className="grid gap-4">
            {tabConfigs.map(config => (
              <div key={config.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm"
                      style={{ backgroundColor: config.badge_color + '20', border: `2px solid ${config.badge_color}40` }}
                    >
                      {config.badge_emoji}
                    </div>
                    <div>
                      <h3 className="font-black text-gray-900">{LEVEL_LABELS[config.level_name] ?? config.level_name}</h3>
                      <p className="text-xs text-gray-400">
                        A partir de <span className="font-bold text-gray-700">{config.min_points} pontos</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${config.active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                      {config.active ? 'Ativo' : 'Inativo'}
                    </span>
                    <button
                      onClick={() => editingId === config.id ? setEditingId(null) : startEdit(config)}
                      className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-xl hover:bg-orange-100 transition"
                    >
                      {editingId === config.id ? 'Cancelar' : 'Editar'}
                    </button>
                  </div>
                </div>

                {!editingId || editingId !== config.id ? (
                  <div className="px-4 pb-4 flex flex-wrap gap-2">
                    {config.benefits?.map((b, i) => (
                      <span key={i} className="text-xs bg-gray-50 border border-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                        {b.label}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 pb-4 space-y-3 border-t border-gray-50 pt-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1">Mínimo de Pontos</label>
                        <input
                          type="number"
                          value={editValues.min_points ?? config.min_points}
                          onChange={e => setEditValues(v => ({ ...v, min_points: parseInt(e.target.value) }))}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1">Emoji do Badge</label>
                        <input
                          type="text"
                          value={editValues.badge_emoji ?? config.badge_emoji}
                          onChange={e => setEditValues(v => ({ ...v, badge_emoji: e.target.value }))}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">Cor do Badge (hex)</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={editValues.badge_color ?? config.badge_color}
                          onChange={e => setEditValues(v => ({ ...v, badge_color: e.target.value }))}
                          className="h-10 w-14 rounded-lg border border-gray-200 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={editValues.badge_color ?? config.badge_color}
                          onChange={e => setEditValues(v => ({ ...v, badge_color: e.target.value }))}
                          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">Benefícios (um por linha)</label>
                      <textarea
                        rows={3}
                        value={(editValues.benefits ?? config.benefits)?.map(b => b.label).join('\n')}
                        onChange={e => setEditValues(v => ({
                          ...v,
                          benefits: e.target.value.split('\n').filter(Boolean).map(label => ({ label }))
                        }))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 resize-none"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editValues.active ?? config.active}
                          onChange={e => setEditValues(v => ({ ...v, active: e.target.checked }))}
                          className="w-4 h-4 accent-orange-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Nível ativo</span>
                      </label>
                      <button
                        onClick={() => saveEdit(config.id)}
                        disabled={saving === config.id}
                        className="bg-orange-500 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-orange-600 transition disabled:opacity-50"
                      >
                        {saving === config.id ? 'Salvando…' : 'Salvar'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          )}
        </div>
      </div>
    </main>
  );
}
