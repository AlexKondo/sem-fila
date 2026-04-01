// API Route — Confirmação de pagamento em dinheiro pelo vendor ou garçom
// Apenas pedidos com payment_method = 'dinheiro' e payment_status = 'pending'

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface Props {
  params: Promise<{ orderId: string }>;
}

export async function POST(_request: Request, { params }: Props) {
  const { orderId } = await params;

  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const { createAdminClient } = await import('@/lib/supabase/server');
  const supabase = await createAdminClient();

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, payment_method, payment_status, vendor_id, vendors!inner(owner_id)')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
  }

  if (order.payment_method !== 'dinheiro') {
    return NextResponse.json({ error: 'Confirmação manual disponível apenas para pagamentos em dinheiro.' }, { status: 422 });
  }

  if (order.payment_status !== 'pending') {
    return NextResponse.json({ error: 'Pagamento já confirmado.' }, { status: 409 });
  }

  // Verifica permissão: dono do vendor ou staff ativo
  const vendor = (order as any).vendors;
  const isOwner = vendor?.owner_id === user.id;

  if (!isOwner) {
    const { data: staffSchedule } = await supabase
      .from('staff_schedules')
      .select('id')
      .eq('user_id', user.id)
      .eq('vendor_id', order.vendor_id)
      .eq('active', true)
      .limit(1)
      .single();

    if (!staffSchedule) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }
  }

  const { error } = await supabase
    .from('orders')
    .update({ payment_status: 'paid' })
    .eq('id', orderId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
