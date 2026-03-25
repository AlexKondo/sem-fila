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

  async function check() {
    console.log("=== DIAGNÓSTICO DO VENDOR 1 ===");

    // 1. Busca o user_id do vendor1@teste.com
    const { data: usersData } = await supabase.auth.admin.listUsers();
    const user = usersData.users.find(u => u.email === 'vendor1@teste.com');

    if (!user) {
        console.log("Usuário não encontrado.");
        return;
    }

    console.log(`User ID: ${user.id}`);

    // 2. Traz o Vendor
    const { data: vendors } = await supabase.from('vendors').select('*').eq('owner_id', user.id);
    
    console.log(`Encontrados ${vendors ? vendors.length : 0} vendors para esse usuário:`);

    if (vendors) {
        for (const v of vendors) {
            const { count } = await supabase.from('menu_items').select('*', { count: 'exact', head: true }).eq('vendor_id', v.id);
            console.log(`=> [${v.id}] ${v.name} ativo=${v.active} | Itens reais cadastrados: ${count}`);
        }
    }
  }

  check();
} catch (err) {
  console.error(err);
}
