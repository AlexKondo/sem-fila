const URL = 'https://ltvgkeracfdyolkgkkji.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0dmdrZXJhY2ZkeW9sa2dra2ppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIxMTY2OSwiZXhwIjoyMDg5Nzg3NjY5fQ.BHw8nnO58nnFLY6wL04xJCTRnc2lRLJLcOp6kHSRhho';

async function forceAdmin() {
  console.log('--- BUSCANDO PERFIS RESTANTES ---');
  const res = await fetch(`${URL}/rest/v1/profiles?select=id`, {
    headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` }
  });
  const profiles = await res.json();
  
  if (!profiles.length) {
    console.log('Nenhum perfil encontrado para promover.');
    return;
  }

  for (const p of profiles) {
    console.log(`Promovendo ID: ${p.id} para Master Admin...`);
    await fetch(`${URL}/rest/v1/profiles?id=eq.${p.id}`, {
      method: 'PATCH',
      headers: {
        'apikey': KEY,
        'Authorization': `Bearer ${KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: 'platform_admin' })
    });
  }
  
  console.log('--- CONCLUÍDO! TENTE LOGAR NOVAMENTE ---');
}
forceAdmin();
