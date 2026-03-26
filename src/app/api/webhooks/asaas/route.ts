// Webhook do Asaas — atualiza payment_status dos pedidos conforme eventos de cobrança
// Requer SUPABASE_SERVICE_ROLE_KEY para atualizar sem sessão de usuário
// Requer ASAAS_WEBHOOK_TOKEN para validar a origem da requisição

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function POST(request: Request) {
  // Valida o token de segurança configurado no painel do Asaas
  const token = request.headers.get('asaas-access-token');
  if (process.env.ASAAS_WEBHOOK_TOKEN && token !== process.env.ASAAS_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });
  }

  let payload: { event: string; payment?: { id: string; externalReference?: string } };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
  }

  const { event, payment } = payload;
  const orderId = payment?.externalReference;

  if (!orderId) {
    // Evento sem referência ao pedido — ignorar silenciosamente
    return NextResponse.json({ received: true });
  }

  const supabase = createServerClient<any>( // eslint-disable-line @typescript-eslint/no-explicit-any
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  switch (event) {
    case 'PAYMENT_CONFIRMED':
    case 'PAYMENT_RECEIVED':
      await supabase
        .from('orders')
        .update({ payment_status: 'paid' })
        .eq('id', orderId);
      break;

    case 'PAYMENT_REFUNDED':
      await supabase
        .from('orders')
        .update({ payment_status: 'refunded' })
        .eq('id', orderId);
      break;

    case 'PAYMENT_OVERDUE':
    case 'PAYMENT_DELETED':
      await supabase
        .from('orders')
        .update({ payment_status: 'failed', status: 'cancelled' })
        .eq('id', orderId);
      break;
  }

  return NextResponse.json({ received: true });
}
