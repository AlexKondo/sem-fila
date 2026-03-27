import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ltvgkeracfdyolkgkkji.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0dmdrZXJhY2ZkeW9sa2dra2ppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIxMTY2OSwiZXhwIjoyMDg5Nzg3NjY5fQ.BHw8nnO58nnFLY6wL04xJCTRnc2lRLJLcOp6kHSRhho';

const supabase = createClient(supabaseUrl, supabaseKey);

async function clean() {
  console.log('🧹 Iniciando limpeza profunda...');

  // Tabelas operacionais e de estrutura
  const tables = [
    'order_items', 'orders', 'waiter_calls', 'menu_items', 
    'staff', 'staff_invites', 'vendor_subscriptions', 'vendors', 
    'events', 'organization_members', 'organizations'
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().filter('id', 'neq', '00000000-0000-0000-0000-000000000000');
    if (error) console.log(`❌ Erro em ${table}: ${error.message}`);
    else console.log(`✅ Tabela ${table} limpa.`);
  }

  // Identifica o Alexandre Kondo pelo email no Auth
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
     console.log('❌ Erro ao listar usuários:', authError.message);
     return;
  }

  const alexandre = users.find(u => u.email === 'alexandre.kondo@gmail.com');

  if (alexandre) {
    console.log(`👤 Preservando Alexandre (${alexandre.id})...`);
    
    // Remove todos os perfis EXCETO o do Alexandre
    const { error: profError } = await supabase.from('profiles').delete().filter('id', 'neq', alexandre.id);
    if (profError) console.log('❌ Erro ao limpar perfis:', profError.message);

    // Garante que o nome esteja correto no perfil
    await supabase.from('profiles').update({ name: 'Alexandre Kondo' }).eq('id', alexandre.id);
    
    // Remove outros usuários do AUTH também para não poluir
    for (const u of users) {
      if (u.email !== 'alexandre.kondo@gmail.com') {
        await supabase.auth.admin.deleteUser(u.id);
      }
    }
  }

  console.log('✨ Banco de dados resetado com sucesso!');
}

clean();
