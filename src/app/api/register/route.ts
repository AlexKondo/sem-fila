import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const { email, password, name, phone, cnpj, address } = await req.json();

  const admin = await createAdminClient();

  // 1. Criar usuário
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: false, // exige confirmação de email
    user_metadata: { name, phone, cnpj, address },
  });

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? 'Erro ao criar conta.' }, { status: 400 });
  }

  // 2. Garantir role vendor no profile (o trigger pode ter criado com role padrão)
  await admin
    .from('profiles')
    .update({ role: 'vendor', name, phone, cnpj, address })
    .eq('id', authData.user.id);

  return NextResponse.json({ ok: true });
}
