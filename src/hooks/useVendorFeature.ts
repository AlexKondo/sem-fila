'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface FeatureAccess {
  hasAccess: boolean;
  loading: boolean;
  isFreeForAll: boolean;
  isSubscribed: boolean;
  expiresAt: string | null;
}

/**
 * Verifica se um vendor tem acesso a uma premium feature.
 * Acesso é concedido se:
 * 1. A feature tem free_for_all = true (admin liberou grátis para todos)
 * 2. O vendor tem uma subscription ativa e não expirada para essa feature
 */
export function useVendorFeature(vendorId: string, featureSlug: string): FeatureAccess {
  const [state, setState] = useState<FeatureAccess>({
    hasAccess: false,
    loading: true,
    isFreeForAll: false,
    isSubscribed: false,
    expiresAt: null,
  });

  useEffect(() => {
    const supabase = createClient();

    Promise.all([
      supabase.from('premium_features').select('free_for_all').eq('slug', featureSlug).eq('active', true).single(),
      supabase.from('vendor_subscriptions').select('active, expires_at').eq('vendor_id', vendorId).eq('feature', featureSlug).single(),
    ]).then(([{ data: feature }, { data: sub }]) => {
      const isFreeForAll = feature?.free_for_all === true;
      const isSubscribed = sub?.active === true && (!sub.expires_at || new Date(sub.expires_at) > new Date());

      setState({
        hasAccess: isFreeForAll || isSubscribed,
        loading: false,
        isFreeForAll,
        isSubscribed,
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
    supabase.from('premium_features').select('free_for_all').eq('slug', featureSlug).eq('active', true).single(),
    supabase.from('vendor_subscriptions').select('active, expires_at').eq('vendor_id', vendorId).eq('feature', featureSlug).single(),
  ]);

  if (feature?.free_for_all) return true;
  if (sub?.active && (!sub.expires_at || new Date(sub.expires_at) > new Date())) return true;
  return false;
}
