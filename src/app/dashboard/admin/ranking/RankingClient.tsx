'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { RankingSetting, VendorSubscription, PremiumFeature } from '@/types/database';

const FEATURE_LABELS: Record<string, { label: string; desc: string }> = {
  vendor_ranking: { label: 'Ranking de Vendedores', desc: 'Exibe posição dos quiosques por vendas e avaliações' },
  dish_ranking:   { label: 'Ranking de Pratos',     desc: 'Exibe os pratos mais pedidos na plataforma' },
  user_ranking:   { label: 'Ranking de Usuários',   desc: 'Exibe clientes mais ativos (pode ser sensível)' },
};

type VendorRow = { id: string; name: string };
type SubWithVendor = VendorSubscription & { vendors: VendorRow | null };

export default function RankingClient() {
  const [settings, setSettings] = useState<RankingSetting[]>([]);
  const [subs, setSubs] = useState<SubWithVendor[]>([]);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [premiumFeatures, setPremiumFeatures] = useState<PremiumFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const [newSub, setNewSub] = useState({ vendor_id: '', feature: '', price_paid: '', expires_days: '30' });
  const [addingNewSub, setAddingNewSub] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from('ranking_settings').select('*').order('feature'),
      supabase.from('vendor_subscriptions').select('*, vendors(id, name)').order('created_at', { ascending: false }),
      supabase.from('vendors').select('id, name').eq('active', true).order('name'),
      supabase.from('premium_features').select('*').eq('active', true).order('sort_order'),
    ]).then(([{ data: s }, { data: vs }, { data: v }, { data: pf }]) => {
      if (s) setSettings(s as RankingSetting[]);
      if (vs) setSubs(vs as SubWithVendor[]);
      if (v) setVendors(v as VendorRow[]);
      if (pf) {
        setPremiumFeatures(pf as PremiumFeature[]);
        if (pf.length > 0) setNewSub(prev => ({ ...prev, feature: pf[0].slug }));
      }
      setLoading(false);
    });
  }, []);

  async function toggleFeature(id: string, current: boolean) {
    setToggling(id);
    const supabase = createClient();
    await supabase.from('ranking_settings').update({ active: !current, updated_at: new Date().toISOString() }).eq('id', id);
    setSettings(prev => prev.map(s => s.id === id ? { ...s, active: !current } : s));
    setToggling(null);
  }

  async function toggleSub(id: string, current: boolean) {
    const supabase = createClient();
    await supabase.from('vendor_subscriptions').update({ active: !current }).eq('id', id);
    setSubs(prev => prev.map(s => s.id === id ? { ...s, active: !current } : s));
  }

  async function addSubscription() {
    if (!newSub.vendor_id) return;
    setAddingNewSub(true);
    const supabase = createClient();
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + parseInt(newSub.expires_days || '30'));
    const { data, error } = await supabase.from('vendor_subscriptions').insert({
      vendor_id: newSub.vendor_id,
      feature: newSub.feature,
      price_paid: newSub.price_paid ? parseFloat(newSub.price_paid) : null,
      expires_at: expires_at.toISOString(),
      active: true,
    }).select('*, vendors(id, name)').single();
    if (error) {
      alert(`Erro ao adicionar: ${error.message}`);
      setAddingNewSub(false);
      return;
    }
    if (data) setSubs(prev => [data as SubWithVendor, ...prev]);
    setNewSub({ vendor_id: '', feature: 'featured_badge', price_paid: '', expires_days: '30' });
    setAddingNewSub(false);
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
            <h1 className="font-bold text-gray-900 leading-none">Ranking & Monetização</h1>
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Features premium da plataforma</p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Rankings Globais</h2>
          <div className="grid gap-3">
            {settings.map(setting => {
              const info = FEATURE_LABELS[setting.feature] ?? { label: setting.feature, desc: '' };
              return (
                <div key={setting.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{info.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{info.desc}</p>
                  </div>
                  <button
                    onClick={() => toggleFeature(setting.id, setting.active)}
                    disabled={toggling === setting.id}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      setting.active ? 'bg-orange-500' : 'bg-gray-200'
                    } disabled:opacity-50`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      setting.active ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Nova Assinatura Premium</h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Quiosque</label>
                <select
                  value={newSub.vendor_id}
                  onChange={e => setNewSub(v => ({ ...v, vendor_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                >
                  <option value="">Selecione…</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Feature</label>
                <select
                  value={newSub.feature}
                  onChange={e => setNewSub(v => ({ ...v, feature: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                >
                  {premiumFeatures.map(pf => (
                    <option key={pf.slug} value={pf.slug}>{pf.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Valor pago (R$)</label>
                <input
                  type="number" step="0.01"
                  value={newSub.price_paid}
                  onChange={e => setNewSub(v => ({ ...v, price_paid: e.target.value }))}
                  placeholder="0,00"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Válido por (dias)</label>
                <input
                  type="number"
                  value={newSub.expires_days}
                  onChange={e => setNewSub(v => ({ ...v, expires_days: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                />
              </div>
            </div>
            <button
              onClick={addSubscription}
              disabled={addingNewSub || !newSub.vendor_id}
              className="w-full bg-orange-500 text-white text-sm font-bold py-2.5 rounded-xl hover:bg-orange-600 transition disabled:opacity-50"
            >
              {addingNewSub ? 'Adicionando…' : 'Adicionar Assinatura'}
            </button>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Assinaturas Premium ({subs.length})
          </h2>
          <div className="grid gap-3">
            {subs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
                Nenhuma assinatura ativa.
              </div>
            ) : (
              subs.map(sub => {
                const pf = premiumFeatures.find(f => f.slug === sub.feature);
                const info = { label: pf?.name ?? sub.feature, desc: pf?.description ?? '' };
                const expired = sub.expires_at ? new Date(sub.expires_at) < new Date() : false;
                return (
                  <div key={sub.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-gray-900 text-sm">{sub.vendors?.name ?? 'Vendor'}</p>
                        <span className="text-[10px] font-black bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full uppercase">{info.label}</span>
                      </div>
                      <p className="text-xs text-gray-400">
                        {sub.price_paid ? `R$ ${Number(sub.price_paid).toFixed(2)}` : 'Gratuito'}
                        {sub.expires_at && ` · Expira ${new Date(sub.expires_at).toLocaleDateString('pt-BR')}`}
                        {expired && <span className="text-red-500 font-bold ml-1">(EXPIRADO)</span>}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleSub(sub.id, sub.active)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        sub.active && !expired ? 'bg-orange-500' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        sub.active && !expired ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
