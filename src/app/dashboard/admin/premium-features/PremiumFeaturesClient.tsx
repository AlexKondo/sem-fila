'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { PremiumFeature } from '@/types/database';

interface FeatureDraft {
  id?: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  duration_days: number;
  active: boolean;
  sort_order: number;
  _isNew?: boolean;
}

export default function PremiumFeaturesClient() {
  const [features, setFeatures] = useState<FeatureDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [originalIds, setOriginalIds] = useState<string[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('premium_features')
      .select('*')
      .order('sort_order')
      .order('created_at')
      .then(({ data }) => {
        if (data) {
          const mapped = data.map((f: PremiumFeature) => ({
            id: f.id,
            slug: f.slug,
            name: f.name,
            description: f.description ?? '',
            price: Number(f.price),
            duration_days: f.duration_days,
            active: f.active,
            sort_order: f.sort_order,
          }));
          setFeatures(mapped);
          setOriginalIds(mapped.map(f => f.id!));
        }
        setLoading(false);
      });
  }, []);

  function addFeature() {
    setFeatures(prev => [
      ...prev,
      {
        slug: '',
        name: '',
        description: '',
        price: 0,
        duration_days: 30,
        active: true,
        sort_order: prev.length,
        _isNew: true,
      },
    ]);
  }

  function removeFeature(index: number) {
    setFeatures(prev => prev.filter((_, i) => i !== index));
  }

  function updateFeature(index: number, field: keyof FeatureDraft, value: string | number | boolean) {
    setFeatures(prev => prev.map((f, i) => {
      if (i !== index) return f;
      const updated = { ...f, [field]: value };
      if (field === 'name' && f._isNew) {
        updated.slug = String(value)
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_|_$/g, '');
      }
      return updated;
    }));
  }

  async function saveAll() {
    setSaving(true);
    const supabase = createClient();

    const currentIds = features.filter(f => f.id).map(f => f.id!);
    const removedIds = originalIds.filter(id => !currentIds.includes(id));

    // Deletar removidos
    if (removedIds.length > 0) {
      await supabase.from('premium_features').delete().in('id', removedIds);
    }

    // Atualizar existentes
    for (const f of features.filter(f => f.id && !f._isNew)) {
      await supabase.from('premium_features').update({
        name: f.name,
        slug: f.slug,
        description: f.description || null,
        price: f.price,
        duration_days: f.duration_days,
        active: f.active,
        sort_order: f.sort_order,
        updated_at: new Date().toISOString(),
      }).eq('id', f.id!);
    }

    // Inserir novos
    const newFeatures = features.filter(f => f._isNew && f.name && f.slug);
    if (newFeatures.length > 0) {
      const { data } = await supabase.from('premium_features').insert(
        newFeatures.map(f => ({
          slug: f.slug,
          name: f.name,
          description: f.description || null,
          price: f.price,
          duration_days: f.duration_days,
          active: f.active,
          sort_order: f.sort_order,
        }))
      ).select();
      if (data) {
        setFeatures(prev => prev.map(f => {
          if (!f._isNew) return f;
          const match = data.find(d => d.slug === f.slug);
          if (match) return { ...f, id: match.id, _isNew: false };
          return f;
        }));
      }
    }

    setOriginalIds(features.filter(f => f.id || !f._isNew).map(f => f.id!));
    setSaving(false);
    alert('Beneficios salvos com sucesso!');
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
            <h1 className="font-bold text-gray-900 leading-none">Beneficios Premium</h1>
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Configure os beneficios que vendors podem comprar</p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {features.map((feature, index) => (
          <div key={feature.id ?? `new-${index}`} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${feature.active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  {feature.active ? 'Ativo' : 'Inativo'}
                </span>
                {feature._isNew && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">Novo</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={feature.active}
                    onChange={e => updateFeature(index, 'active', e.target.checked)}
                    className="w-4 h-4 accent-orange-500"
                  />
                  <span className="text-xs text-gray-500">Ativo</span>
                </label>
                <button
                  onClick={() => removeFeature(index)}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="Remover"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Nome</label>
                <input
                  type="text"
                  value={feature.name}
                  onChange={e => updateFeature(index, 'name', e.target.value)}
                  placeholder="Ex: Badge Destaque"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Slug</label>
                <input
                  type="text"
                  value={feature.slug}
                  onChange={e => updateFeature(index, 'slug', e.target.value)}
                  placeholder="badge_destaque"
                  disabled={!feature._isNew}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 disabled:bg-gray-50 disabled:text-gray-400"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Descricao</label>
              <input
                type="text"
                value={feature.description}
                onChange={e => updateFeature(index, 'description', e.target.value)}
                placeholder="Descricao do beneficio para o vendor"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Preco (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={feature.price}
                  onChange={e => updateFeature(index, 'price', parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Duracao (dias)</label>
                <input
                  type="number"
                  value={feature.duration_days}
                  onChange={e => updateFeature(index, 'duration_days', parseInt(e.target.value) || 30)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Ordem</label>
                <input
                  type="number"
                  value={feature.sort_order}
                  onChange={e => updateFeature(index, 'sort_order', parseInt(e.target.value) || 0)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                />
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={addFeature}
          className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-4 text-sm font-bold text-gray-400 hover:text-orange-500 hover:border-orange-300 transition"
        >
          + Novo Beneficio
        </button>

        <button
          onClick={saveAll}
          disabled={saving}
          className="w-full bg-orange-500 text-white text-sm font-bold py-3 rounded-2xl hover:bg-orange-600 transition disabled:opacity-50 sticky bottom-4 shadow-lg"
        >
          {saving ? 'Salvando...' : 'Salvar Todos os Beneficios'}
        </button>
      </div>
    </main>
  );
}
