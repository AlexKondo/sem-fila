'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { LevelConfig } from '@/types/database';

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

export default function GamificationPage() {
  const [configs, setConfigs] = useState<LevelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('customer');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<LevelConfig>>({});

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('level_configs')
      .select('*')
      .order('profile_type')
      .order('level_order')
      .then(({ data }) => {
        if (data) setConfigs(data as LevelConfig[]);
        setLoading(false);
      });
  }, []);

  const tabConfigs = configs.filter(c => c.profile_type === activeTab);

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

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Tabs */}
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

              {/* Benefícios */}
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

        {/* Info box */}
        <div className="mt-6 bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <p className="text-xs font-bold text-blue-700 mb-1">Como funciona a pontuação</p>
          <ul className="text-xs text-blue-600 space-y-1 list-disc list-inside">
            <li>Pedido realizado: +10 pontos (cliente)</li>
            <li>Pedido entregue: +5 pontos (cliente)</li>
            <li>Avaliação dada: +5 pontos (cliente)</li>
            <li>Venda realizada: +10 pontos (vendor)</li>
          </ul>
          <p className="text-xs text-blue-400 mt-2">Os pontos são adicionados automaticamente pelos triggers do banco.</p>
        </div>
      </div>
    </main>
  );
}
