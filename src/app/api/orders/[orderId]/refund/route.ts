// API Route — Estorno de pedido
// Cancela o pedido no banco e estorna o pagamento no Asaas automaticamente.
// Autorizado apenas para: dono do vendor ou staff ativo.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface Props {
  params: Promise<{ orderId: string }>;
}

export async function POST(request: Request, { params }: Props) {
  const { orderId } = await params;

  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const { createAdminClient } = await import('@/lib/supabase/server');
  const supabase = await createAdminClient();

  // Busca o pedido com dados do vendor
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, status, payment_status, asaas_payment_id, vendor_id, vendors!inner(owner_id)')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
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

  // Impede estorno de pedido já cancelado ou já estornado
  if (order.status === 'cancelled' && order.payment_status === 'refunded') {
    return NextResponse.json({ error: 'Pedido já foi estornado.' }, { status: 409 });
  }

  // Tenta estorno no Asaas (apenas se havia cobrança eletrônica)
  const asaasPaymentId: string | null = (order as any).asaas_payment_id ?? null;
  let refundedInAsaas = false;

  if (asaasPaymentId && order.payment_status === 'paid') {
    try {
      const { refundPayment } = await import('@/lib/asaas');
      await refundPayment(asaasPaymentId);
      refundedInAsaas = true;
    } catch (err: any) {
      console.error('Asaas refund error:', err?.message);
      // Retorna erro — não cancela no banco se o estorno financeiro falhou
      return NextResponse.json(
        { error: `Falha ao estornar no Asaas: ${err?.message ?? 'Erro desconhecido'}` },
        { status: 502 },
      );
    }
  }

  // Atualiza o pedido no banco
  const newPaymentStatus = refundedInAsaas
    ? 'refunded'
    : order.payment_status === 'pending'
      ? 'cancelled' // PIX pendente que nunca foi pago
      : order.payment_status; // dinheiro, etc. — mantém

  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: 'cancelled', payment_status: newPaymentStatus })
    .eq('id', orderId);

  if (updateError) {
    return NextResponse.json({ error: 'Estorno realizado no Asaas, mas falha ao atualizar o pedido.' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    refunded_in_asaas: refundedInAsaas,
    payment_status: newPaymentStatus,
  });
}
