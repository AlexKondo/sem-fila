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
  // Usamos Service Role para ignorar RLS e criar dados admins
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  async function seed() {
    console.log("=== LIMPANDO DADOS ANTIGOS ===");
    
    // Deleta em ordem devido a chaves estrangeiras
    await supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('vendors').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('organizations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Limpar clientes mockados anteriores (se houver id gravado)
    console.log("Limpando perfis...");
    // deletar apenas perfis que comecam com nome Mock ou clientes de teste
    await supabase.from('profiles').delete().ilike('name', '%Mock%Client%');
    
    console.log("\n=== CRIANDO ESTRUTURA BASE ===");
    
    // 1. Cria 1 Organização
    const { data: org, error: orgE } = await supabase.from('organizations').insert({
      name: 'Eventize Brasil',
      slug: 'eventize-br'
    }).select('id').single();
    if (orgE) throw orgE;
    console.log("Organização criada!");

    // 2. Cria 10 Eventos
    const eventsToCreate = Array.from({ length: 10 }).map((_, i) => ({
      organization_id: org.id,
      name: `Festival de Verão 2026 - Evento #${i+1}`,
      location: `Arena Principal - Bloco ${String.fromCharCode(65 + i)}`,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 dias de duração
      active: true
    }));

    const { data: createdEvents, error: evE } = await supabase.from('events').insert(eventsToCreate).select('id, name');
    if (evE) throw evE;
    console.log(`10 Eventos criados!`);

    // 3. Cria 30 Vendors (3 por evento para teste de carga)
    console.log("Criando 30 Vendors...");
    const vendorsToCreate = [];
    for (let i = 0; i < 30; i++) {
       const eventIdx = i % createdEvents.length; // Cicla entre os 10 eventos
       vendorsToCreate.push({
          event_id: createdEvents[eventIdx].id,
          name: `Barraca Gastronômica #${i+1}`,
          description: `Servindo os melhores lanches do ${createdEvents[eventIdx].name}`,
          avg_prep_time: 5 + (i % 3) * 5, // 5, 10, 15 min
          payment_mode: 'optional',
          accept_cash: true, accept_pix: true, accept_card: true,
          active: true
       });
    }
    const { data: createdVendors, error: venE } = await supabase.from('vendors').insert(vendorsToCreate).select('id, name');
    if (venE) throw venE;
    console.log(`30 Vendors criados!`);

    // 4. Cria 20 Clientes via AUTH (para evitar erros de chave estrangeira em profiles)
    console.log("\n=== CRIANDO 20 CLIENTES VIA AUTH ===");
    for (let i = 0; i < 20; i++) {
      const { data: user, error: userE } = await supabase.auth.admin.createUser({
        email: `cliente${i+1}@teste.com`,
        password: 'senha_teste_123',
        user_metadata: { name: `Mock Client #${i+1}` },
        email_confirm: true
      });
      if (!userE && user.user) {
         // Atualiza profile se o trigger não disparou ou não configurou phone/role
         await supabase.from('profiles').update({
            name: `Mock Client #${i+1}`,
            phone: `1199999${(1000+i).toString().substring(1)}`,
            role: 'customer'
         }).eq('id', user.user.id);
      }
    }
    console.log("20 Clientes criados no Auth e sincronizados em profiles!");

    console.log("\n=== LISTAGEM FINAL ===");
    console.log("\n📌 EVENTOS E SEUS VENDORS:");
    for (const ev of createdEvents) {
       const fVendors = createdVendors.filter(v => v.event_id === ev.id).map(v => v.name);
       console.log(`- ${ev.name}:`);
       fVendors.forEach(v => console.log(`  └─ ${v}`));
    }
    console.log("\n📌 20 CLIENTES DE TESTE PRONTOS:");
    console.log("Emails de login: cliente1@teste.com até cliente20@teste.com");
    console.log("Senha para todos: senha_teste_123");

  }

  seed();
} catch (err) {
  console.error("Erro no Seeding:", err);
}
