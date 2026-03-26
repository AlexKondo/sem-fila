const URL = 'https://ltvgkeracfdyolkgkkji.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0dmdrZXJhY2ZkeW9sa2dra2ppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIxMTY2OSwiZXhwIjoyMDg5Nzg3NjY5fQ.BHw8nnO58nnFLY6wL04xJCTRnc2lRLJLcOp6kHSRhho';

async function del(table, filter = '') {
  console.log(`Limpando ${table}${filter ? ' (com filtro)' : ''}...`);
  const endpoint = `${URL}/rest/v1/${table}${filter ? '?' + filter : ''}`;
  const res = await fetch(endpoint, {
    method: 'DELETE',
    headers: {
      'apikey': KEY,
      'Authorization': `Bearer ${KEY}`,
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) console.error(`Erro ao limpar ${table}:`, await res.text());
}

async function run() {
  console.log('--- INICIANDO RESET GERAL ---');

  // 1. Limpar Business Data (Hierarquia estrita de constraints)
  await del('order_items');
  await del('orders');
  await del('waiter_calls');
  await del('menu_items');
  await del('events');
  await del('vendors');
  await del('organizations');

  // 2. Limpar Perfis
  await del('profiles', 'role=neq.platform_admin');

  console.log('--- OPERAÇÃO CONCLUÍDA ---');
  console.log('O banco está limpo. Mantenha seu login alexandre.kondo@gmail.com para gerenciar a nova fase.');
}

run();
