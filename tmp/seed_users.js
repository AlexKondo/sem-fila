const URL = 'https://ltvgkeracfdyolkgkkji.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0dmdrZXJhY2ZkeW9sa2dra2ppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIxMTY2OSwiZXhwIjoyMDg5Nzg3NjY5fQ.BHw8nnO58nnFLY6wL04xJCTRnc2lRLJLcOp6kHSRhho';
const PASSWORD = 'amksilver';

const users = [
  ...Array.from({ length: 10 }, (_, i) => ({
    email: `vendor${i + 1}@teste.com`,
    name: `Vendor ${i + 1}`,
    role: 'vendor'
  })),
  ...Array.from({ length: 10 }, (_, i) => ({
    email: `user${i + 1}@teste.com`,
    name: `User ${i + 1}`,
    role: 'customer'
  }))
];

async function createUser({ email, name, role }) {
  // 1. Criar em auth.users
  const authRes = await fetch(`${URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'apikey': KEY,
      'Authorization': `Bearer ${KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      password: PASSWORD,
      email_confirm: true
    })
  });

  const authData = await authRes.json();
  if (!authRes.ok) {
    console.error(`  ERRO auth [${email}]:`, authData.message ?? authData);
    return;
  }

  const id = authData.id;

  // 2. Upsert profile (trigger já cria, só atualiza role e name)
  const profRes = await fetch(`${URL}/rest/v1/profiles?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': KEY,
      'Authorization': `Bearer ${KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name, role })
  });

  if (!profRes.ok) {
    console.error(`  ERRO profile [${email}]:`, await profRes.text());
  } else {
    console.log(`  OK: ${email} (${role})`);
  }
}

async function run() {
  console.log(`Criando ${users.length} usuários...\n`);
  for (const u of users) {
    await createUser(u);
  }
  console.log('\n=== CONCLUÍDO ===');
}

run().catch(console.error);
