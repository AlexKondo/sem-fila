const URL = 'https://ltvgkeracfdyolkgkkji.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0dmdrZXJhY2ZkeW9sa2dra2ppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIxMTY2OSwiZXhwIjoyMDg5Nzg3NjY5fQ.BHw8nnO58nnFLY6wL04xJCTRnc2lRLJLcOp6kHSRhho';

async function setAdmin() {
  console.log('--- ATUALIZANDO CARGO DE ADMINISTRADOR ---');
  
  // 1. Encontrar o usuário pelo email
  // (Nota: caso não encontre na tabela profiles, é porque ele ainda não logou após o reset)
  // Mas como você está logado, o perfil deve existir.
  const res = await fetch(`${URL}/rest/v1/profiles?email=eq.alexandre.kondo@gmail.com`, {
    method: 'PATCH',
    headers: {
      'apikey': KEY,
      'Authorization': `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      role: 'platform_admin'
    })
  });

  if (res.ok) {
    const data = await res.json();
    if (data.length > 0) {
      console.log('SUCESSO: Seu usuário agora é MASTER ADMIN.');
    } else {
      console.log('AVISO: Perfil não encontrado. Tente sair e entrar novamente no app para o perfil ser criado, ou me avise.');
    }
  } else {
    console.error('ERRO ao atualizar cargo:', await res.text());
  }
}

setAdmin();
