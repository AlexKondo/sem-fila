const fs = require('fs');
const path = require('path');
const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) env[key.trim()] = value.join('=').trim().replace(/^"|"$/g, '');
});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: v } = await supabase.from('vendors').select('id, name, owner_id, active').eq('name', 'Hamburgueria do Zeca').single();
  console.log('--- VENDOR ---');
  console.log(v);
  if (v) {
    const { data: o } = await supabase.from('orders').select('id, total_price, status, user_id').eq('vendor_id', v.id);
    console.log('--- ORDERS ---');
    console.log(o);
    const { data: p } = await supabase.from('profiles').select('id, name, role').eq('id', v.owner_id).single();
    console.log('--- OWNER PROFILE ---');
    console.log(p);
  }
}
check();
