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

  async function forceWipe() {
    console.log("Deletando ALL order_items...");
    await supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log("Deletando ALL orders...");
    await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log("Deletando ALL vendors...");
    await supabase.from('vendors').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log("Deletando ALL profiles...");
    await supabase.from('profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log("Deletando ALL users do Auth...");
    const { data } = await supabase.auth.admin.listUsers();
    if (data && data.users) {
       for (const u of data.users) {
          await supabase.auth.admin.deleteUser(u.id);
          console.log(`- Auth deletado: ${u.email}`);
       }
    }

    console.log("\n=== LIMPEZA TOTAL CONCLUÍDA! ===");
  }

  forceWipe();
} catch (err) {
  console.error(err);
}
