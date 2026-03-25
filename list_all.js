const fs = require('fs');
const path = require('path');

try {
  const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf-8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) env[key.trim()] = value.join('=').trim().replace(/^"|"$/g, '');
  });

  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  async function listAll() {
    console.log("=== LISTANDO USUÁRIOS (PROFILES) ===");
    const { data: profiles } = await supabase.from('profiles').select('name, role').order('name');
    if (profiles) {
      profiles.forEach(p => console.log(`👤 ${p.name || 'Sem nome'} [${p.role || 'customer'}]`));
    }

    console.log("\n=== LISTANDO VENDORS (BARRACAS) ===");
    const { data: vendors } = await supabase.from('vendors').select('name').order('name');
    if (vendors) {
      vendors.forEach(v => console.log(`🏪 ${v.name}`));
    }
  }

  listAll();
} catch (err) {
  console.error(err);
}
