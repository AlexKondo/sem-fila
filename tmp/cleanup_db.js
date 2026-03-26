const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanup() {
  console.log('--- INICIANDO LIMPEZA TOTAL DO BANCO ---');

  // 1. Identificar o ID do Administrador Principal
  const { data: admin } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', 'alexandre.kondo@gmail.com')
    .single();

  if (!admin) {
    console.error('ERRO: Usuário alexandre.kondo@gmail.com não encontrado. Operação cancelada por segurança.');
    return;
  }

  console.log(`Preservando Admin ID: ${admin.id}`);

  // 2. Limpar dados de negócio (ordem importa por causa de FKs)
  console.log('Limpando chamados de garçom...');
  await supabase.from('waiter_calls').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  console.log('Limpando itens de pedidos...');
  await supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('Limpando pedidos...');
  await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('Limpando itens de menu...');
  await supabase.from('menu_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('Limpando vendedores/quiosques...');
  await supabase.from('vendors').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('Limpando eventos...');
  await supabase.from('events').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('Limpando organizações...');
  await supabase.from('organizations').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // 3. Limpar outros perfis (menos o admin)
  console.log('Limpando outros perfis de usuários...');
  const { error: profileErr } = await supabase
    .from('profiles')
    .delete()
    .neq('id', admin.id);
  
  if (profileErr) console.error('Erro ao limpar perfis:', profileErr.message);

  console.log('--- LIMPEZA CONCLUÍDA COM SUCESSO ---');
}

cleanup();
