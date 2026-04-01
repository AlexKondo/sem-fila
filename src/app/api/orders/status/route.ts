// API Route — Atualização de status do pedido pelo vendor
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { UpdateOrderStatusSchema } from '@/lib/validations/order';

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

  return NextResponse.json({ success: true }, { status: 200 });
}
