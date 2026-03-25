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

  async function purge() {
    console.log("=== INICIANDO PURGA COMPLETA DO BANCO ===");

    // 1. Descobre o ID do Admin para poupá-lo
    const { data: admins } = await supabase.from('profiles').select('id, name').eq('role', 'platform_admin');
    const adminIds = admins ? admins.map(a => a.id) : [];
    console.log(`Poupando ${adminIds.length} Administradores da exclusão...`);

    // 2. Limpando tabelas transacionais e estruturais
    console.log("Limpando order_items...");
    await supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log("Limpando orders...");
    await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log("Limpando menu_items...");
    await supabase.from('menu_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log("Limpando waiter_calls...");
    await supabase.from('waiter_calls').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log("Limpando vendors...");
    await supabase.from('vendors').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log("Limpando events...");
    await supabase.from('events').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log("Limpando organizations...");
    await supabase.from('organizations').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 3. Deletando usuários do Auth e do Profile
    console.log("\nBuscando usuários para deletar do Auth...");
    const { data: usersData } = await supabase.auth.admin.listUsers();
    
    if (usersData && usersData.users) {
       for (const u of usersData.users) {
          if (!adminIds.includes(u.id)) {
             // Deleta Profile primeiro se o Supabase não tiver onDelete CASCADE
             await supabase.from('profiles').delete().eq('id', u.id);
             // Deleta do Auth
             await supabase.auth.admin.deleteUser(u.id);
             console.log(`- Usuário deletado: ${u.email}`);
          }
       }
    }

    console.log("\n=== BANCO DE DADOS FORMATADO COM SUCESSO! ===");
  }

  purge();
} catch (err) {
  console.error("Erro na purga:", err);
}
