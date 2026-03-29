'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface FeatureAccess {
  hasAccess: boolean;
  loading: boolean;
  isFreeForAll: boolean;
  isSubscribed: boolean;
  isTrial: boolean;
  expiresAt: string | null;
}

/**
 * Verifica se um vendor tem acesso a uma premium feature.
 * Acesso é concedido se:
 * 1. A feature tem free_for_all = true (admin liberou grátis para todos)
 * 2. O vendor tem uma subscription ativa e não expirada para essa feature
 * 3. A feature tem trial_days > 0 e o vendor ainda não usou o trial (auto-ativa)
 */
export function useVendorFeature(vendorId: string, featureSlug: string): FeatureAccess {
  const [state, setState] = useState<FeatureAccess>({
    hasAccess: false,
    loading: true,
    isFreeForAll: false,
    isSubscribed: false,
    isTrial: false,
    expiresAt: null,
  });

  useEffect(() => {
    const supabase = createClient();

    Promise.all([
      supabase.from('premium_features').select('free_for_all, trial_days').eq('slug', featureSlug).eq('active', true).single(),
      supabase.from('vendor_subscriptions').select('active, expires_at, price_paid').eq('vendor_id', vendorId).eq('feature', featureSlug).single(),
    ]).then(async ([{ data: feature }, { data: sub }]) => {
      const isFreeForAll = feature?.free_for_all === true;
      const isSubscribed = sub?.active === true && (!sub.expires_at || new Date(sub.expires_at) > new Date());

      // Se já tem acesso por free_for_all ou subscription ativa, retorna direto
      if (isFreeForAll || isSubscribed) {
        const isTrial = isSubscribed && sub?.price_paid === 0;
        setState({
          hasAccess: true,
          loading: false,
          isFreeForAll,
          isSubscribed,
          isTrial,
          expiresAt: sub?.expires_at ?? null,
        });
        return;
      }

      // Se a feature tem trial e o vendor NÃO tem nenhuma subscription (nunca usou)
      const trialDays = feature?.trial_days ?? 0;
      if (trialDays > 0 && !sub) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + trialDays);
        const expiresIso = expiresAt.toISOString();

        // Auto-ativa o trial
        const { error } = await supabase.from('vendor_subscriptions').insert({
          vendor_id: vendorId,
          feature: featureSlug,
          active: true,
          price_paid: 0,
          expires_at: expiresIso,
        });

        if (!error) {
          setState({
            hasAccess: true,
            loading: false,
            isFreeForAll: false,
            isSubscribed: true,
            isTrial: true,
            expiresAt: expiresIso,
          });
          return;
        }
      }

      // Sem acesso
      setState({
        hasAccess: false,
        loading: false,
        isFreeForAll: false,
        isSubscribed: false,
        isTrial: false,
        expiresAt: sub?.expires_at ?? null,
      });
    });
  }, [vendorId, featureSlug]);

  return state;
}

/**
 * Versão server-side: checa acesso a feature premium.
 * Usar em server components com o supabase server client.
 */
export async function checkVendorFeature(
  supabase: ReturnType<typeof createClient>,
  vendorId: string,
  featureSlug: string
): Promise<boolean> {
  const [{ data: feature }, { data: sub }] = await Promise.all([
    supabase.from('premium_features').select('free_for_all, trial_days').eq('slug', featureSlug).eq('active', true).single(),
    supabase.from('vendor_subscriptions').select('active, expires_at').eq('vendor_id', vendorId).eq('feature', featureSlug).single(),
  ]);

  if (feature?.free_for_all) return true;
  if (sub?.active && (!sub.expires_at || new Date(sub.expires_at) > new Date())) return true;
  // Trial: se tem trial_days e vendor nunca usou, considerar como acesso (server-side não auto-ativa)
  if ((feature?.trial_days ?? 0) > 0 && !sub) return true;
  return false;
}
