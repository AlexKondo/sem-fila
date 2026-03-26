const URL = 'https://ltvgkeracfdyolkgkkji.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0dmdrZXJhY2ZkeW9sa2dra2ppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIxMTY2OSwiZXhwIjoyMDg5Nzg3NjY5fQ.BHw8nnO58nnFLY6wL04xJCTRnc2lRLJLcOp6kHSRhho';

async function listAuthUsers() {
  const res = await fetch(`${URL}/auth/v1/admin/users?per_page=1000`, {
    headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` }
  });
  const data = await res.json();
  return data.users ?? data;
}

async function updateProfile(id, name, role) {
  const res = await fetch(`${URL}/rest/v1/profiles?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': KEY,
      'Authorization': `Bearer ${KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name, role })
  });
  if (!res.ok) console.error(`  ERRO [${id}]:`, await res.text());
}

async function run() {
  const authUsers = await listAuthUsers();

  for (const u of authUsers) {
    if (u.email === 'alexandre.kondo@gmail.com') continue;

    const num = u.email.match(/\d+/)?.[0];
    if (u.email.startsWith('vendor')) {
      console.log(`vendor: ${u.email}`);
      await updateProfile(u.id, `Vendor ${num}`, 'vendor');
    } else if (u.email.startsWith('user')) {
      console.log(`user:   ${u.email}`);
      await updateProfile(u.id, `User ${num}`, 'customer');
    }
  }

  console.log('\n=== ROLES ATUALIZADOS ===');
}

run().catch(console.error);
