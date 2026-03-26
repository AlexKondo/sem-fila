const URL = 'https://ltvgkeracfdyolkgkkji.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0dmdrZXJhY2ZkeW9sa2dra2ppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIxMTY2OSwiZXhwIjoyMDg5Nzg3NjY5fQ.BHw8nnO58nnFLY6wL04xJCTRnc2lRLJLcOp6kHSRhho';

async function countTable(table) {
  const res = await fetch(`${URL}/rest/v1/${table}?select=id`, {
    headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}`, 'Prefer': 'count=exact' }
  });
  console.log(`${table}: ${res.headers.get('content-range')}`);
}

async function check() {
  await countTable('profiles');
  await countTable('vendors');
  await countTable('orders');
  await countTable('events');
  await countTable('organizations');
}
check();
