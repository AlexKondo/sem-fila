const URL = 'https://ltvgkeracfdyolkgkkji.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0dmdrZXJhY2ZkeW9sa2dra2ppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIxMTY2OSwiZXhwIjoyMDg5Nzg3NjY5fQ.BHw8nnO58nnFLY6wL04xJCTRnc2lRLJLcOp6kHSRhho';
const h = { 'apikey': KEY, 'Authorization': `Bearer ${KEY}`, 'Accept': 'application/json' };

async function probe(table) {
  const r = await fetch(`${URL}/rest/v1/${table}?limit=1`, { headers: h });
  const text = await r.text();
  console.log(`\n${table}: status=${r.status}`);
  try { console.log(JSON.stringify(JSON.parse(text)[0] ?? {}, null, 2)); } catch { console.log(text.slice(0, 200)); }
}

async function run() {
  await probe('events');
  await probe('vendors');
}
run();
