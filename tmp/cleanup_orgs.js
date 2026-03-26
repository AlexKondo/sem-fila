const URL = 'https://ltvgkeracfdyolkgkkji.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0dmdrZXJhY2ZkeW9sa2dra2ppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIxMTY2OSwiZXhwIjoyMDg5Nzg3NjY5fQ.BHw8nnO58nnFLY6wL04xJCTRnc2lRLJLcOp6kHSRhho';
const h = { 'apikey': KEY, 'Authorization': `Bearer ${KEY}`, 'Prefer': 'return=representation' };

async function del(path) {
  const r = await fetch(`${URL}/rest/v1/${path}`, { method: 'DELETE', headers: h });
  if (!r.ok) console.error(`Erro ao limpar ${path}:`, await r.text());
}

async function run() {
  // ON DELETE CASCADE garante que events, vendors, menu_items são apagados junto
  await del('organizations?id=neq.00000000-0000-0000-0000-000000000000');
  console.log('Organizações, eventos, vendors e menus limpos.');
}
run().catch(console.error);
