import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const { email, password, name, phone, cnpj, orgName } = await req.json();

  const admin = await createAdminClient();

  // 1. Cria usuário com role org_admin
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, phone, cnpj, role: 'org_admin' },
  });

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? 'Erro ao criar conta.' }, { status: 400 });
  }

  // 2. Garante role org_admin no profile
  await admin
    .from('profiles')
    .update({ role: 'org_admin', name, phone, cnpj, email })
    .eq('id', authData.user.id);

  // 3. Cria a organização
  const slug = orgName
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 60);

  const { data: org, error: orgError } = await admin.from('organizations').insert({
    name: orgName.trim(),
    slug: slug || `org-${Date.now()}`,
    created_by: authData.user.id,
  }).select().single();

  if (orgError) {
    console.error('Erro ao criar organização:', orgError);
    return NextResponse.json({ error: 'Conta criada, mas erro ao criar organização: ' + orgError.message }, { status: 400 });
  }

  // 4. Adiciona como membro da organização
  await admin.from('organization_members').insert({
    organization_id: org.id,
    user_id: authData.user.id,
  });

  return NextResponse.json({ ok: true });
}
