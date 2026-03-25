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

  async function wipe() {
    console.log("Limpando order_items...");
    const { error: e1 } = await supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (e1) console.error("Erro order_items:", e1);

    console.log("Limpando orders...");
    const { error: e2 } = await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (e2) console.error("Erro orders:", e2);

    console.log("Banco de dados de pedidos resetado com sucesso!");
  }

  wipe();
} catch (err) {
  console.error(err);
}
