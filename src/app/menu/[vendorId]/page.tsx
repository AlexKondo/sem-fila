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

  // Optimizing Database Calls - Executa as três buscas ao MESMO TEMPO em vez de esperar uma terminar
  const [
    { data: items },
    { data: pastOrders },
    { count: activeOrders }
  ] = await Promise.all([
    supabase.from('menu_items').select('*').eq('vendor_id', vendor.id).eq('available', true).order('position', { ascending: true }),
    supabase.from('orders').select('created_at, updated_at').eq('vendor_id', vendor.id).eq('status', 'delivered').order('created_at', { ascending: false }).limit(3),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('vendor_id', vendor.id).in('status', ['received', 'preparing', 'almost_ready'])
  ]);

  let realAvgTime = vendor.avg_prep_time || 0;

  if (pastOrders && pastOrders.length > 0) {
    let totalSecs = 0;
    let validOrders = 0;
    for (const po of pastOrders) {
      if (po.updated_at) {
         const duration = (new Date(po.updated_at).getTime() - new Date(po.created_at).getTime()) / 1000;
         if (duration > 30) { // Ignorar lixo (testes e cliques < 30s)
            totalSecs += duration;
            validOrders++;
         }
      }
    }
    if (validOrders > 0) {
      const mediaSegundos = totalSecs / validOrders;
      realAvgTime = Math.ceil(mediaSegundos / 60);
    }
  }

  const fila = activeOrders || 0;
  
  // Se a fila tá vazia, tempo é 1x a média (o tempo do próprio cara).
  // Se tem 3 pessoas na frente, tempo é as 3 + a vez dele = 4x a média.
  const multiplier = fila + 1;
  const estimatedTime = realAvgTime * multiplier;

  const waitTime = estimatedTime > 0 ? `~${estimatedTime} min (Fila: ${fila})` : 'Preparo imediato';

  return (
    <MenuClient 
      vendor={vendor as Vendor} 
      items={(items || []) as MenuItem[]} 
      mesa={mesa} 
      waitTime={waitTime} 
    />
  );
}
