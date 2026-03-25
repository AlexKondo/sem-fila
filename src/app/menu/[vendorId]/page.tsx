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
        return num.toString().padStart(6, '0') === cleanId;
      });
      if (match) vendor = match;
    }
  }

  if (!vendor) notFound();

  const { data: items } = await supabase
    .from('menu_items').select('*').eq('vendor_id', vendor.id).eq('available', true).order('position', { ascending: true });

  const { count: activeOrders } = await supabase
    .from('orders').select('*', { count: 'exact', head: true })
    .eq('vendor_id', vendor.id).in('status', ['received', 'preparing']);

  const waitTime = estimatedWaitTime(activeOrders ?? 0, vendor.avg_prep_time);

  return (
    <MenuClient 
      vendor={vendor as Vendor} 
      items={(items || []) as MenuItem[]} 
      mesa={mesa} 
      waitTime={waitTime} 
    />
  );
}
