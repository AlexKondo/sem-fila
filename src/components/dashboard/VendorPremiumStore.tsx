'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Sparkles, Check, Clock, Zap, Target } from 'lucide-react';
import type { PremiumFeature, VendorSubscription, AutoBenefitRule } from '@/types/database';
import VendorCheckoutModal from './VendorCheckoutModal';
import PremiumAdminModal from './PremiumAdminModal';

const METRIC_LABELS: Record<string, { label: string; unit: string; format: (v: number) => string }> = {
  monthly_revenue: { label: 'Faturamento Mensal', unit: 'R$', format: v => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
  order_count: { label: 'Pedidos no Mês', unit: '', format: v => `${v} pedidos` },
  rating_avg: { label: 'Avaliação Média', unit: '', format: v => `${v.toFixed(1)} estrelas` },
  cancellation_rate: { label: 'Taxa de Cancelamento', unit: '%', format: v => `${v.toFixed(1)}%` },
  avg_prep_time: { label: 'Tempo Médio de Preparo', unit: 'min', format: v => `${v} min` },
};

const OPERATOR_LABELS: Record<string, string> = {
  '>=': 'acima de',
  '<=': 'abaixo de',
  '>': 'maior que',
  '<': 'menor que',
  '=': 'igual a',
};

interface Props {
  vendorId: string;
}

export default function VendorPremiumStore({ vendorId }: Props) {
  const [features, setFeatures] = useState<PremiumFeature[]>([]);
  const [mySubs, setMySubs] = useState<VendorSubscription[]>([]);
  const [autoRules, setAutoRules] = useState<AutoBenefitRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutProduct, setCheckoutProduct] = useState<{
    type: 'premium_feature';
    featureId: string;
    name: string;
    price: string;
  } | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from('premium_features').select('*').eq('active', true).order('sort_order'),
      supabase.from('vendor_subscriptions').select('*').eq('vendor_id', vendorId),
      supabase.from('auto_benefit_rules').select('*').eq('active', true).order('sort_order'),
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return null;
        return supabase.from('profiles').select('role').eq('id', user.id).single();
      }),
    ]).then(([{ data: pf }, { data: vs }, { data: ar }, profileRes]) => {
      if (pf) setFeatures(pf as PremiumFeature[]);
      if (vs) setMySubs(vs as VendorSubscription[]);
      if (ar) setAutoRules(ar as AutoBenefitRule[]);
      const role = profileRes?.data?.role;
      if (role === 'platform_admin' || role === 'vendor') setIsOwner(true);
      setLoading(false);
    });
  }, [vendorId]);

  function getSubStatus(slug: string): { sub: VendorSubscription | null; isActive: boolean; isExpired: boolean; isAuto: boolean } {
    const sub = mySubs.find(s => s.feature === slug) ?? null;
    if (!sub) return { sub: null, isActive: false, isExpired: false, isAuto: false };
    const expired = sub.expires_at ? new Date(sub.expires_at) < new Date() : false;
    const isAuto = Number(sub.price_paid) === 0;
    return { sub, isActive: sub.active && !expired, isExpired: expired, isAuto };
  }

  if (loading) return null;
  if (features.length === 0 && autoRules.length === 0) return null;

  return (
    <>
      {/* Benefícios para comprar */}
      {features.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4 px-2">
            <Sparkles className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-bold text-slate-900">Benefícios Premium</h2>
          </div>
          <div className="grid gap-3">
            {features.map(feature => {
              const { sub, isActive, isExpired, isAuto } = getSubStatus(feature.slug);
              return (
                <div key={feature.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-bold text-sm text-slate-900">{feature.name}</h3>
                        {isActive && isAuto && (
                          <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full uppercase flex items-center gap-0.5">
                            <Zap className="w-3 h-3" /> Automático
                          </span>
                        )}
                        {isActive && !isAuto && (
                          <span className="text-[10px] font-black bg-green-50 text-green-600 px-2 py-0.5 rounded-full uppercase flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> Ativo
                          </span>
                        )}
                        {isExpired && (
                          <span className="text-[10px] font-black bg-red-50 text-red-500 px-2 py-0.5 rounded-full uppercase flex items-center gap-0.5">
                            <Clock className="w-3 h-3" /> Expirado
                          </span>
                        )}
                      </div>
                      {feature.description && (
                        <p className="text-xs text-slate-400 mb-2">{feature.description}</p>
                      )}
                      {isActive && sub?.expires_at && (
                        <p className="text-[11px] text-slate-400">
                          Expira em {new Date(sub.expires_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                          {isAuto && ' (concedido por desempenho)'}
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4 flex-shrink-0">
                      <p className="text-lg font-black text-slate-900">
                        R$ {Number(feature.price).toFixed(2).replace('.', ',')}
                      </p>
                      <p className="text-[10px] text-slate-400">{feature.duration_days} dias</p>
                      {!isActive && (
                        <button
                          onClick={() => setCheckoutProduct({
                            type: 'premium_feature',
                            featureId: feature.id,
                            name: feature.name,
                            price: `R$ ${Number(feature.price).toFixed(2).replace('.', ',')}`,
                          })}
                          className="mt-2 bg-orange-500 text-white text-xs font-bold px-4 py-1.5 rounded-xl hover:bg-orange-600 transition"
                        >
                          {isExpired ? 'Renovar' : 'Comprar'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Metas para ganhar benefícios automaticamente */}
      {autoRules.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-4 px-2">
            <Target className="w-5 h-5 text-emerald-500" />
            <h2 className="text-lg font-bold text-slate-900">Metas de Desempenho</h2>
          </div>
          <p className="text-xs text-slate-400 mb-3 px-2">
            Atinja essas metas e ganhe benefícios automaticamente, sem precisar pagar!
          </p>
          <div className="grid gap-3">
            {autoRules.map(rule => {
              const featureName = features.find(f => f.slug === rule.benefit_slug)?.name ?? rule.benefit_slug;
              const metric = METRIC_LABELS[rule.metric];
              const operatorLabel = OPERATOR_LABELS[rule.operator] || rule.operator;
              const { isActive, isAuto } = getSubStatus(rule.benefit_slug);
              const achieved = isActive && isAuto;

              return (
                <div
                  key={rule.id}
                  className={`rounded-2xl border shadow-sm p-4 ${
                    achieved
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-white border-gray-100'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-bold text-sm ${achieved ? 'text-emerald-800' : 'text-slate-900'}`}>
                          {rule.name}
                        </h3>
                        {achieved && (
                          <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> Conquistado
                          </span>
                        )}
                      </div>
                      {rule.description && (
                        <p className={`text-xs mb-2 ${achieved ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {rule.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          achieved ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-50 text-orange-600'
                        }`}>
                          {metric?.label}: {operatorLabel} {metric?.format(Number(rule.threshold))}
                        </span>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                          achieved ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          Prêmio: {featureName} ({rule.duration_days}d)
                        </span>
                      </div>
                    </div>
                    {achieved && (
                      <Zap className="w-6 h-6 text-emerald-500 flex-shrink-0 ml-2" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Botão admin para editar benefícios/metas */}
      {isOwner && (
        <div className="mt-6 text-center">
          <button
            onClick={() => setShowAdmin(true)}
            className="text-xs font-bold text-slate-400 hover:text-orange-600 transition underline underline-offset-2"
          >
            Gerenciar benefícios e metas
          </button>
        </div>
      )}

      <PremiumAdminModal
        isOpen={showAdmin}
        onClose={() => {
          setShowAdmin(false);
          // Refresh data
          const supabase = createClient();
          Promise.all([
            supabase.from('premium_features').select('*').eq('active', true).order('sort_order'),
            supabase.from('auto_benefit_rules').select('*').eq('active', true).order('sort_order'),
          ]).then(([{ data: pf }, { data: ar }]) => {
            if (pf) setFeatures(pf as PremiumFeature[]);
            if (ar) setAutoRules(ar as AutoBenefitRule[]);
          });
        }}
      />

      {checkoutProduct && (
        <VendorCheckoutModal
          isOpen={true}
          onClose={() => {
            setCheckoutProduct(null);
            const supabase = createClient();
            supabase.from('vendor_subscriptions').select('*').eq('vendor_id', vendorId)
              .then(({ data }) => { if (data) setMySubs(data as VendorSubscription[]); });
          }}
          vendorId={vendorId}
          product={checkoutProduct}
        />
      )}
    </>
  );
}
