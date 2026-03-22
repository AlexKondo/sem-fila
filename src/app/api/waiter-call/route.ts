// API Route — Chamar garçom
// Sem autenticação obrigatória (cliente sem conta pode chamar)

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const WaiterCallSchema = z.object({
  vendor_id: z.string().uuid(),
  table_number: z.string().min(1).max(10),
});

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
  }

  const parsed = WaiterCallSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 422 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from('waiter_calls').insert({
    vendor_id: parsed.data.vendor_id,
    table_number: parsed.data.table_number,
    user_id: user?.id ?? null,
    status: 'pending',
  });

  if (error) {
    return NextResponse.json({ error: 'Erro ao chamar garçom.' }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
