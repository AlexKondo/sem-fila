// Simula confirmação de pagamento PIX no Asaas Sandbox
// Apenas funciona com chaves $aact_hmlg — bloqueado em produção

import { NextResponse } from 'next/server';
import { IS_SANDBOX, simulatePayment } from '@/lib/asaas';

export async function POST(request: Request) {
  if (!IS_SANDBOX) {
    return NextResponse.json({ error: 'Simulação disponível apenas no sandbox.' }, { status: 403 });
  }

  const { payment_id } = await request.json();
  if (!payment_id) {
    return NextResponse.json({ error: 'payment_id obrigatório.' }, { status: 400 });
  }

  try {
    await simulatePayment(payment_id);
  } catch (err: any) {
    console.error('[simulate] erro no Asaas:', err?.message);
    return NextResponse.json({ error: err?.message ?? 'Erro ao simular' }, { status: 502 });
  }
  return NextResponse.json({ simulated: true });
}
