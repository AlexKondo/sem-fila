// Página de acompanhamento de pedido em tempo real
// Usa Supabase Realtime para atualizar o status sem recarregar a página

import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import OrderTracker from '@/components/orders/OrderTracker';

interface Props {
  params: Promise<{ orderId: string }>;
}

export default async function OrderPage({ params }: Props) {
  const { orderId } = await params;
  const supabase = await createClient();

  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      vendors (id, name, logo_url, avg_prep_time),
      order_items (
        id, quantity, unit_price,
        menu_items (id, name, image_url)
      )
    `)
    .eq('id', orderId)
    .single();

  if (error || !order) notFound();

  return <OrderTracker initialOrder={order} />;
}
