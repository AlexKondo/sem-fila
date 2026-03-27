import { createAdminClient } from './src/lib/supabase/server';

async function deepCleanDatabase() {
  console.log('🚀 Iniciando limpeza profunda do banco de dados...');
  const admin = await createAdminClient();

  const tablesToTruncate = [
    'order_items',
    'orders',
    'waiter_calls',
    'menu_items',
    'staff',
    'staff_invites',
    'vendor_subscriptions',
    'vendors',
    'events',
    'organization_members',
    'organizations'
  ];

  for (const table of tablesToTruncate) {
    console.log(`🧹 Limpando tabela: ${table}...`);
    const { error } = await admin.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) console.error(`❌ Erro ao limpar ${table}:`, error.message);
  }

  console.log('👤 Removendo perfis de terceiros...');
  const { error: profileError } = await admin
    .from('profiles')
    .delete()
    .neq('email', 'alexandre.kondo@gmail.com');

  if (profileError) console.error('❌ Erro ao limpar perfis:', profileError.message);

  console.log('⭐ Atualizando perfil mestre (Alexandre Kondo)...');
  await admin
    .from('profiles')
    .update({ name: 'Alexandre Kondo' })
    .eq('email', 'alexandre.kondo@gmail.com');

  console.log('✅ Banco de dados limpo com sucesso!');
}

deepCleanDatabase().catch(console.error);
