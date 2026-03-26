const URL = 'https://ltvgkeracfdyolkgkkji.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0dmdrZXJhY2ZkeW9sa2dra2ppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIxMTY2OSwiZXhwIjoyMDg5Nzg3NjY5fQ.BHw8nnO58nnFLY6wL04xJCTRnc2lRLJLcOp6kHSRhho';
const h = { 'apikey': KEY, 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' };

async function run() {
  // Testar se os novos campos existem tentando um INSERT num evento
  const orgRes = await fetch(`${URL}/rest/v1/organizations?limit=1`, { headers: h });
  const orgs = await orgRes.json();
  const orgId = orgs[0]?.id;
  if (!orgId) { console.error('Nenhuma organização encontrada'); return; }

  const evRes = await fetch(`${URL}/rest/v1/events`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({
      organization_id: orgId,
      name: '_teste_migration_',
      location: 'Local Teste',
      address: 'Rua Teste, 123, São Paulo - SP',
      description: 'Evento de verificação da migration',
      start_date: '2026-06-01T00:00:00Z',
      end_date: '2026-06-30T00:00:00Z',
      start_time: '09:00:00',
      end_time: '22:00:00',
      active: false,
    })
  });

  if (!evRes.ok) {
    console.error('❌ Migration NÃO aplicada corretamente:', await evRes.text());
    return;
  }

  const [event] = await evRes.json();
  console.log('✅ Migration OK! Campos confirmados:');
  console.log(`  address:     ${event.address}`);
  console.log(`  description: ${event.description}`);
  console.log(`  start_date:  ${event.start_date}`);
  console.log(`  end_date:    ${event.end_date}`);
  console.log(`  start_time:  ${event.start_time}`);
  console.log(`  end_time:    ${event.end_time}`);

  // Limpa o evento de teste
  await fetch(`${URL}/rest/v1/events?id=eq.${event.id}`, { method: 'DELETE', headers: h });
  console.log('  (evento de teste removido)');
}

run().catch(console.error);
