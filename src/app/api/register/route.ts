import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const { email, password, name, brandName, phone, cnpj, address } = await req.json();

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

  // 3. Criar a marca (vendor) explicitamente durante o cadastro
  // Busca o primeiro evento disponível para vincular (pode ser ajustado no futuro)
  const { data: firstEvent } = await admin.from('events').select('id').limit(1).single();

  const { error: vendorError } = await admin.from('vendors').insert({
    owner_id: authData.user.id,
    event_id: firstEvent?.id || null,
    name: brandName?.trim() || 'Nova Marca',
    description: 'Criada via cadastro',
    avg_prep_time: 15,
    payment_mode: 'optional',
    accept_cash: true,
    accept_pix: true,
    accept_card: true,
    active: true
  });

  if (vendorError) {
    console.error('Erro ao criar vendor automaticamente:', vendorError);
    // Não paramos o retorno porque o usuário foi criado, mas registramos o erro
  }

  return NextResponse.json({ ok: true });
}
