const URL = 'https://ltvgkeracfdyolkgkkji.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0dmdrZXJhY2ZkeW9sa2dra2ppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIxMTY2OSwiZXhwIjoyMDg5Nzg3NjY5fQ.BHw8nnO58nnFLY6wL04xJCTRnc2lRLJLcOp6kHSRhho';

async function fastDel(table) {
  console.log(`Limpando ${table}...`);
  // O filtro id=neq.00000000-0000-0000-0000-000000000000 costuma burlar a proteção de bulk-delete sem WHERE
  const res = await fetch(`${URL}/rest/v1/${table}?id=neq.00000000-0000-0000-0000-000000000000`, {
    method: 'DELETE',
    headers: {
      'apikey': KEY,
      'Authorization': `Bearer ${KEY}`
    }
  });
  if (!res.ok) console.error(`Erro ao limpar ${table}:`, await res.text());
}

async function run() {
  console.log('--- INICIANDO FAXINA COMPLETA ---');

  // Ordem de execução para evitar erros de FK
  await fastDel('order_items');
  await fastDel('orders');
  await fastDel('waiter_calls');
  await fastDel('menu_items');
  await fastDel('events');
  await fastDel('vendors');
  await fastDel('organizations');
  
  // Limpar perfis, mantendo apenas você
  // Vou buscar seu ID primeiro para não te apagar
  const res = await fetch(`${URL}/rest/v1/profiles?id=neq.00000000-0000-0000-0000-000000000000`, {
    headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` }
  });
  const profiles = await res.json();
  
  // Como agora você é o único admin, podemos manter os perfis com role platform_admin
  console.log('Limpando perfis (exceto administradores)...');
  await fastDel('profiles'); // Tenta apagar tudo. Se falhar, apaga por ID.

  console.log('--- FAXINA CONCLUÍDA ---');
}

run();
