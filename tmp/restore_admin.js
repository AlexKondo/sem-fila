const URL = 'https://ltvgkeracfdyolkgkkji.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0dmdrZXJhY2ZkeW9sa2dra2ppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIxMTY2OSwiZXhwIjoyMDg5Nzg3NjY5fQ.BHw8nnO58nnFLY6wL04xJCTRnc2lRLJLcOp6kHSRhho';

async function restoreAdmin() {
  console.log('--- RESTAURANDO PERFIL MASTER ADMIN ---');
  
  // Usando o ID que capturamos anteriormente para garantir o login
  const adminId = '154a6522-b08d-42e4-bbcd-faa26fe2890e';
  
  const res = await fetch(`${URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      'apikey': KEY,
      'Authorization': `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      id: adminId,
      name: 'Alexandre Kondo',
      email: 'alexandre.kondo@gmail.com',
      role: 'platform_admin'
    })
  });

  if (res.ok) {
     console.log('SUCESSO: Perfil Master Admin restaurado!');
  } else {
     console.error('ERRO ao restaurar:', await res.text());
     // Se der erro por email não existir na tabela, tentamos sem o email
     await fetch(`${URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: adminId, name: 'Alexandre Kondo', role: 'platform_admin' })
     });
  }
}

restoreAdmin();
