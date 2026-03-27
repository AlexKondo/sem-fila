import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  // Verifica que quem chama é um vendor autenticado
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { email, password, name, phone, role, vendor_id } = await req.json();

  if (!email || !password || !name || !role || !vendor_id) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando.' }, { status: 400 });
  }

  // Confirma que o vendor_id pertence ao usuário
  const { data: vendor } = await supabase.from('vendors').select('id').eq('id', vendor_id).eq('owner_id', user.id).single();
  if (!vendor) return NextResponse.json({ error: 'Vendor não encontrado.' }, { status: 403 });

  const admin = await createAdminClient();

  // Cria o usuário no Supabase Auth
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, phone },
  });

  if (authError || !authData.user) {
    const msg = authError?.message ?? '';
    const translated =
      msg.includes('already been registered') || msg.includes('already registered')
        ? 'Este email já está cadastrado no sistema.'
        : msg.includes('invalid email') ? 'Email inválido.'
        : msg.includes('password') ? 'A senha deve ter pelo menos 6 caracteres.'
        : 'Erro ao criar conta. Tente novamente.';
    return NextResponse.json({ error: translated }, { status: 400 });
  }

  // Atualiza o profile com role e vendor_id
  await admin
    .from('profiles')
    .update({ role, name, full_name: name, phone: phone || null, vendor_id })
    .eq('id', authData.user.id);

  // Cria o schedule de staff vinculando ao vendor
  await admin.from('staff_schedules').insert({
    user_id: authData.user.id,
    vendor_id,
    days_of_week: [1, 2, 3, 4, 5],
    permissions: role === 'waitstaff'
      ? ['view_orders', 'call_waiter']
      : role === 'deliverer'
        ? ['view_orders', 'deliver_orders']
        : ['view_orders', 'manage_menu', 'call_waiter', 'deliver_orders'],
    active: true,
  });

  return NextResponse.json({ ok: true, userId: authData.user.id });
}
