const URL = 'https://ltvgkeracfdyolkgkkji.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0dmdrZXJhY2ZkeW9sa2dra2ppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIxMTY2OSwiZXhwIjoyMDg5Nzg3NjY5fQ.BHw8nnO58nnFLY6wL04xJCTRnc2lRLJLcOp6kHSRhho';
const KEEP_EMAIL = 'alexandre.kondo@gmail.com';

async function listAuthUsers() {
  const res = await fetch(`${URL}/auth/v1/admin/users?per_page=1000`, {
    headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` }
  });
  if (!res.ok) throw new Error('Erro ao listar auth.users: ' + await res.text());
  const data = await res.json();
  return data.users ?? data;
}

async function deleteAuthUser(id) {
  const res = await fetch(`${URL}/auth/v1/admin/users/${id}`, {
    method: 'DELETE',
    headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` }
  });
  if (!res.ok) console.error(`  Erro ao deletar auth user ${id}:`, await res.text());
}

async function run() {
  console.log('Buscando usuários em auth.users...');
  const users = await listAuthUsers();
  console.log(`Total encontrado: ${users.length}`);

  const toDelete = users.filter(u => u.email !== KEEP_EMAIL);
  const keep = users.find(u => u.email === KEEP_EMAIL);

  if (!keep) {
    console.error(`ERRO: ${KEEP_EMAIL} não encontrado em auth.users. Abortando.`);
    return;
  }

  console.log(`Mantendo: ${keep.email} (${keep.id})`);
  console.log(`Deletando ${toDelete.length} usuário(s)...\n`);

  for (const u of toDelete) {
    console.log(`  Deletando: ${u.email} (${u.id})`);
    await deleteAuthUser(u.id);
  }

  // Limpar profiles órfãos (caso existam sem auth user correspondente)
  const cleanProfiles = await fetch(`${URL}/rest/v1/profiles?id=neq.${keep.id}`, {
    method: 'DELETE',
    headers: {
      'apikey': KEY,
      'Authorization': `Bearer ${KEY}`,
      'Prefer': 'return=representation'
    }
  });
  if (!cleanProfiles.ok) console.error('Erro ao limpar profiles:', await cleanProfiles.text());

  console.log('\n=== CONCLUÍDO ===');
  console.log(`Usuário mantido: ${keep.email}`);
}

run().catch(console.error);
