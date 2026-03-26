const URL = 'https://ltvgkeracfdyolkgkkji.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0dmdrZXJhY2ZkeW9sa2dra2ppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIxMTY2OSwiZXhwIjoyMDg5Nzg3NjY5fQ.BHw8nnO58nnFLY6wL04xJCTRnc2lRLJLcOp6kHSRhho';
const ADMIN_ID = 'b0d707b5-c331-47d3-ab9d-5453163031a7';

async function run() {
  const profRes = await fetch(`${URL}/rest/v1/profiles?id=eq.${ADMIN_ID}`, {
    headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` }
  });
  const profiles = await profRes.json();
  console.log('public.profiles:', JSON.stringify(profiles, null, 2));
}

run().catch(console.error);
