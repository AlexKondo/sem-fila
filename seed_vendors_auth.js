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

  async function createVendorUsers() {
    console.log("=== INICIANDO CRIAÇÃO DE LOGINS PARA VENDORS ===");

    // 1. Busca os vendors que não têm dono (owner_id nulo)
    const { data: vendors, error: vE } = await supabase.from('vendors').select('id, name').order('name');
    if (vE || !vendors) throw vE;

    console.log(`Encontrados ${vendors.length} vendors para vincular logins...`);

    for (let i = 0; i < vendors.length; i++) {
        const v = vendors[i];
        const email = `vendor${i+1}@teste.com`;
        const password = 'senha_teste_123';

        const { data: user, error: userE } = await supabase.auth.admin.createUser({
            email: email,
            password: password,
            user_metadata: { name: v.name, role: 'vendor' },
            email_confirm: true
        });

        if (userE) {
            console.error(`Falha no e-mail ${email} ou já existe.`);
            continue;
        }

        if (user && user.user) {
            // 2. Cria o perfil no profiles tabela publica
            await supabase.from('profiles').update({
                name: v.name,
                role: 'vendor'
            }).eq('id', user.user.id);

            // 3. Vincula o Profile ao vendor_id como dono
            await supabase.from('vendors').update({
                owner_id: user.user.id
            }).eq('id', v.id);

            console.log(`Login criado para ${v.name}: ${email}`);
        }
    }

    console.log("=== CRIAÇÃO DE LOGINS FINALIZADA ===");
  }

  createVendorUsers();
} catch (err) {
  console.error(err);
}
