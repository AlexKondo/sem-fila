// API Route — Atualização de status do pedido pelo vendor
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { UpdateOrderStatusSchema } from '@/lib/validations/order';

const STATUS_PUSH_MESSAGE: Record<string, { title: string; body: string }> = {
  preparing:    { title: '👨‍🍳 Preparando seu pedido!', body: 'O quiosque começou a preparar seu pedido.' },
  almost_ready: { title: '⏰ Quase pronto!',           body: 'Seu pedido está quase pronto. Fique por perto!' },
  ready:        { title: '🎉 Pedido pronto!',           body: 'Pode retirar! Seu pedido está esperando por você.' },
  delivered:    { title: '✅ Pedido entregue!',         body: 'Bom apetite! Obrigado por usar o QuickPick.' },
};

export async function PATCH(request: Request) {
  // Verifica autenticação
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  // Valida o body
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 });
  }

  const parsed = UpdateOrderStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 422 });
  }

  const { order_id, status } = parsed.data;

  // Verifica se o pedido pertence a um vendor do usuário autenticado (owner ou staff)
  const { data: order } = await userClient
    .from('orders')
    .select('id, vendor_id, vendors!inner(owner_id)')
    .eq('id', order_id)
    .single();

  if (!order) {
    return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
  }

  const vendor = (order as any).vendors;
  const isOwner = vendor?.owner_id === user.id;

  if (!isOwner) {
    // Verifica se é staff ativo do vendor
    const { data: staffSchedule } = await userClient
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

  // Atualiza o status
  const { error } = await userClient
    .from('orders')
    .update({ status })
    .eq('id', order_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Envia push notification para o customer
  const pushMsg = STATUS_PUSH_MESSAGE[status];
  if (pushMsg) {
    try {
      const { createAdminClient } = await import('@/lib/supabase/server');
      const adminSupabase = await createAdminClient();
      const { data: fullOrder } = await adminSupabase
        .from('orders')
        .select('user_id, pickup_code')
        .eq('id', order_id)
        .single();

      if (fullOrder?.user_id) {
        const { sendPushToUser } = await import('@/lib/push');
        await sendPushToUser(adminSupabase, fullOrder.user_id, {
          title: pushMsg.title,
          body: `Senha #${fullOrder.pickup_code} — ${pushMsg.body}`,
          url: `/order/${order_id}`,
          tag: `order-${order_id}`,
        });
      }
    } catch (pushErr) {
      console.error('[Push] Falha ao enviar notificação:', pushErr);
    }
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
