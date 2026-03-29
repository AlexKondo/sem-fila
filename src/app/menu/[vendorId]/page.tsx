// Página pública do cardápio — acessada via QR Code. Não exige login.
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency, estimatedWaitTime } from '@/lib/utils';
import CartSheet from '@/components/menu/CartSheet';
import type { MenuItem, Vendor } from '@/types/database';

const P = '#ec5b13';

interface Props {
  params: Promise<{ vendorId: string }>;
  searchParams: Promise<{ mesa?: string }>;
}

import MenuClient from '@/components/menu/MenuClient';

export default async function MenuPage({ params, searchParams }: Props) {
  const { vendorId } = await params;
  const { mesa } = await searchParams;
  const supabase = await createClient();

  let vendor = null;
  const { data: directVendor } = await supabase
    .from('vendors').select('*').eq('id', vendorId).eq('active', true).single();
  
  if (directVendor) {
    vendor = directVendor;
  } else {
    // Busca por código numérico (ex: 123456 ou 123.456)
    const cleanId = vendorId.replace(/\./g, '');
    const { data: allVendors } = await supabase
      .from('vendors').select('*').eq('active', true);
    
    if (allVendors) {
      const match = allVendors.find(v => {
        let hash = 0;
        for (let i = 0; i < v.id.length; i++) {
          hash = (hash << 5) - hash + v.id.charCodeAt(i);
          hash |= 0;
        }
        const num = Math.abs(hash) % 1000000;
        return num === parseInt(cleanId);
      });
      if (match) vendor = match;
    }
  }

  if (!vendor) notFound();

  // Optimizing Database Calls - Executa as buscas ao MESMO TEMPO
  const [
    { data: items },
    { data: pastOrders },
    { count: activeOrders },
    { data: featuredFeature },
    { data: featuredSub },
  ] = await Promise.all([
    supabase.from('menu_items').select('*').eq('vendor_id', vendor.id).eq('available', true).order('position', { ascending: true }),
    supabase.from('orders').select('created_at, updated_at').eq('vendor_id', vendor.id).eq('status', 'delivered').order('created_at', { ascending: false }).limit(3),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('vendor_id', vendor.id).in('status', ['received', 'preparing', 'almost_ready']),
    supabase.from('premium_features').select('free_for_all').eq('slug', 'destaque_plataforma').eq('active', true).single(),
    supabase.from('vendor_subscriptions').select('active, expires_at').eq('vendor_id', vendor.id).eq('feature', 'destaque_plataforma').single(),
  ]);

  // Verifica selo destaque: free_for_all ou subscription ativa
  const hasFeaturedBadge = featuredFeature?.free_for_all === true ||
    (featuredSub?.active === true && (!featuredSub.expires_at || new Date(featuredSub.expires_at) > new Date()));

  let realAvgTime = 0; // Começa em 0 para indicar que não há histórico real

  if (pastOrders && pastOrders.length > 0) {
    let totalSecs = 0;
    let validOrders = 0;
    for (const po of pastOrders) {
      if (po.updated_at) {
        const duration = (new Date(po.updated_at).getTime() - new Date(po.created_at).getTime()) / 1000;
        if (duration > 30) { // Ignorar lixo (< 30s)
          totalSecs += duration;
          validOrders++;
        }
      }
    }
    if (validOrders > 0) {
      realAvgTime = Math.ceil((totalSecs / validOrders) / 60);
    }
  }

  const fila = activeOrders || 0;
  const avgText = realAvgTime > 0 ? `${realAvgTime} min` : '-- min';
  const waitTime = `Média: ${avgText} (Fila: ${fila})`;

  return (
    <MenuClient
      vendor={vendor as Vendor}
      items={(items || []) as MenuItem[]}
      mesa={mesa}
      waitTime={waitTime}
      hasFeaturedBadge={hasFeaturedBadge}
    />
  );
}
