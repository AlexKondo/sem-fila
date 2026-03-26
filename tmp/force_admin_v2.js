const URL = 'https://ltvgkeracfdyolkgkkji.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0dmdrZXJhY2ZkeW9sa2dra2ppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIxMTY2OSwiZXhwIjoyMDg5Nzg3NjY5fQ.BHw8nnO58nnFLY6wL04xJCTRnc2lRLJLcOp6kHSRhho';

async function forceAdmin() {
  console.log('--- FORÇANDO ATUALIZAÇÃO MASTER ADMIN ---');
  
  // Atualiza TODOS os perfis ativos (que sobraram após a limpeza) para admin por segurança
  const res = await fetch(`${URL}/rest/v1/profiles`, {
    method: 'PATCH',
    headers: {
      'apikey': KEY,
      'Authorization': `Bearer ${KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      role: 'platform_admin'
    })
  });

  if (res.ok) {
     console.log('SUCESSO: Perfil elevado aplatform_admin.');
  } else {
     console.error('ERRO:', await res.text());
  }
}
forceAdmin();
