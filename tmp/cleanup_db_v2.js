const URL = 'https://ltvgkeracfdyolkgkkji.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0dmdrZXJhY2ZkeW9sa2dra2ppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIxMTY2OSwiZXhwIjoyMDg5Nzg3NjY5fQ.BHw8nnO58nnFLY6wL04xJCTRnc2lRLJLcOp6kHSRhho';

async function del(table, filter = '') {
  console.log(`Limpando ${table}...`);
  const res = await fetch(`${URL}/rest/v1/${table}?${filter}`, {
    method: 'DELETE',
    headers: {
      'apikey': KEY,
      'Authorization': `Bearer ${KEY}`,
      'Prefer': 'representation=count'
    }
  });
  if (!res.ok) console.error(`Erro em ${table}:`, await res.text());
}

async function run() {
  // 1. Achar o id de alexandre.kondo@gmail.com
  const profileRes = await fetch(`${URL}/rest/v1/profiles?email=eq.alexandre.kondo@gmail.com&select=id`, {
    headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` }
  });
  const profiles = await profileRes.json();
  const adminId = profiles[0]?.id;

  if (!adminId) {
    console.error('ERRO: Admin não encontrado. Operação abortada.');
    return;
  }
  console.log(`ID Admin encontrado: ${adminId}`);

  // 2. Limpar tabelas (ordem de FK)
  await del('waiter_calls');
  await del('order_items');
  await del('orders');
  await del('menu_items');
  await del('vendors');
  await del('events');
  await del('organizations');
  
  // 3. Limpar outros perfis
  await del('profiles', `id=neq.${adminId}`);

  console.log('--- BANCO LIMPO ---');
}

run();
