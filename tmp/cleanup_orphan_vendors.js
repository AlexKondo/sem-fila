const URL = 'https://ltvgkeracfdyolkgkkji.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0dmdrZXJhY2ZkeW9sa2dra2ppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIxMTY2OSwiZXhwIjoyMDg5Nzg3NjY5fQ.BHw8nnO58nnFLY6wL04xJCTRnc2lRLJLcOp6kHSRhho';
const h = { 'apikey': KEY, 'Authorization': `Bearer ${KEY}`, 'Prefer': 'return=representation' };

async function run() {
  // Buscar vendors sem event_id
  const listRes = await fetch(`${URL}/rest/v1/vendors?event_id=is.null&select=id,name,owner_id`, { headers: h });
  const orphans = await listRes.json();
  console.log(`Vendors órfãos (sem evento): ${orphans.length}`);
  orphans.forEach(v => console.log(` - ${v.name} (${v.id})`));

  if (orphans.length === 0) { console.log('Nada a limpar.'); return; }

  // Deletar todos sem event_id
  const delRes = await fetch(`${URL}/rest/v1/vendors?event_id=is.null`, {
    method: 'DELETE',
    headers: h
  });

  if (!delRes.ok) {
    console.error('Erro ao deletar:', await delRes.text());
  } else {
    console.log(`\n${orphans.length} vendor(s) órfão(s) removido(s).`);
  }
}

run().catch(console.error);
