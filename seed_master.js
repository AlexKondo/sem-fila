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

  const IMAGES = {
     burger: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format',
     fries: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&auto=format',
     hotdog: 'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?w=400&auto=format',
     pasteis: 'https://images.unsplash.com/photo-1612392061787-2d078b3e573c?w=400&auto=format',
     coca: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&auto=format',
     beer: 'https://images.unsplash.com/photo-1618885472179-5e474019f2a9?w=400&auto=format',
     water: 'https://images.unsplash.com/photo-1548964081-37d45f44fe2a?w=400&auto=format',
     juice: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&auto=format',
     dessert: 'https://images.unsplash.com/photo-1563805042-7684c849a158?w=400&auto=format',
     acai: 'https://images.unsplash.com/photo-1590483736622-3028387bc97b?w=400&auto=format'
  };

  const PRODUCTS = [
    { n: 'Hambúrguer Clássico', p: 18.5, c: 'Lanches', img: IMAGES.burger },
    { n: 'X-Salada Especial', p: 22.9, c: 'Lanches', img: IMAGES.burger },
    { n: 'Cachorro Quente Completo', p: 15.0, c: 'Lanches', img: IMAGES.hotdog },
    { n: 'Cachorro Quente Duplo', p: 18.0, c: 'Lanches', img: IMAGES.hotdog },
    { n: 'Porção de Batata Frita', p: 12.0, c: 'Lanches', img: IMAGES.fries },
    { n: 'Pastéis Mistos (6 un)', p: 16.0, c: 'Lanches', img: IMAGES.pasteis },
    { n: 'Refrigerante Lata', p: 6.0, c: 'Bebidas', img: IMAGES.coca },
    { n: 'Suco Natural Copo', p: 8.5, c: 'Bebidas', img: IMAGES.juice },
    { n: 'Água Mineral', p: 4.0, c: 'Bebidas', img: IMAGES.water },
    { n: 'Cerveja Artesanal', p: 14.0, c: 'Bebidas', img: IMAGES.beer },
    { n: 'Energético', p: 12.0, c: 'Bebidas', img: IMAGES.coca },
    { n: 'Minitorta de Morango', p: 10.0, c: 'Sobremesas', img: IMAGES.dessert },
    { n: 'Sorvete de Casquinha', p: 7.0, c: 'Sobremesas', img: IMAGES.dessert },
    { n: 'Churros de Doce de Leite', p: 8.0, c: 'Sobremesas', img: IMAGES.dessert },
    { n: 'Açaí na Tigela (300ml)', p: 14.0, c: 'Sobremesas', img: IMAGES.acai }
  ];

  async function seed() {
    console.log("=== INICIANDO CRIAÇÃO DO ZERO ===");

    // 1. Cria Organização
    let { data: org, error: orgE } = await supabase.from('organizations').insert({ name: 'QuickPick', slug: 'quickpick' }).select('id').single();
    
    // Se der erro porque já existe, tenta buscar
    if (orgE) {
      console.warn("Aviso ao criar organização:", orgE.message);
      const { data: existingOrg } = await supabase.from('organizations').select('id').eq('slug', 'quickpick').single();
      org = existingOrg;
    }

    if (!org) {
      console.error("ERRO CRÍTICO: Não foi possível obter o ID da Organização.", orgE);
      throw "Erro ao criar organização";
    }
    console.log("Organização QuickPick pronta (ID: " + org.id + ")");

    // 2. Cria 5 Eventos
    const eventsNames = ['Festival de Verão 2026', 'Rodeio de Americana', 'Feira da Estação', 'Oktoberfest Local', 'Encontro de Motos'];
    const eventsToInsert = eventsNames.map(name => ({
       organization_id: org.id,
       name,
       location: 'Arena Principal',
       active: true
    }));
    const { data: events } = await supabase.from('events').insert(eventsToInsert).select('id, name');
    console.log("5 Eventos criados!");

    // 3. Cria 10 Clientes (Auth + Profile)
    console.log("Criando 10 Clientes...");
    for (let i = 1; i <= 10; i++) {
        const email = `cliente${i+100}@teste.com`; // Usa emails novos pra não bater no Auth
        const { data, error: userE } = await supabase.auth.admin.createUser({ email, password: 'senha_teste_123', email_confirm: true });
        
        if (userE && !userE.message.includes("already registered")) {
           console.error(`Erro ao criar cliente ${email}:`, userE.message);
           continue; 
        }

        const user = data?.user || (await supabase.auth.admin.listUsers()).data.users.find(u => u.email === email);
        if (user) {
             await supabase.from('profiles').upsert({ id: user.id, name: `Cliente Teste #${i}`, role: 'customer' });
        }
    }

    // 4. Cria 20 Logins de Vendors
    console.log("Criando 20 Logins de Vendors...");
    const vendorUsers = [];
    for (let i = 1; i <= 20; i++) {
        const email = `vendor${i+100}@teste.com`;
        const name = `Dono da Marca #${i}`;
        const { data, error: userE } = await supabase.auth.admin.createUser({ email, password: 'senha_teste_123', email_confirm: true, user_metadata: { name } });
        
        if (userE && !userE.message.includes("already registered")) {
           console.error(`Erro ao criar vendor user ${email}:`, userE.message);
           continue;
        }

        const user = data?.user || (await supabase.auth.admin.listUsers()).data.users.find(u => u.email === email);
        if (user) {
             await supabase.from('profiles').upsert({ id: user.id, name, role: 'vendor' });
             vendorUsers.push({ id: user.id, name });
        }
    }

    // 5. Cria Vendors (Atribuições: 15 por evento, repetindo os 20 donos)
    console.log("Distribuindo 15 vendors por evento (75 no total)...");
    const vendorsToInsert = [];
    events.forEach(ev => {
        for (let i = 0; i < 15; i++) {
            const donorIdx = Math.floor(Math.random() * vendorUsers.length);
            const donr = vendorUsers[donorIdx];
            vendorsToInsert.push({
                event_id: ev.id,
                owner_id: donr.id,
                name: `Quiosque ${donr.name.split('#')[1]} - ${ev.name}`,
                description: `Servindo lanches e bebidas no ${ev.name}`,
                active: true
            });
        }
    });

    const { data: createdVendors, error: venE } = await supabase.from('vendors').insert(vendorsToInsert).select('id, name');
    if (venE || !createdVendors) {
       console.error("ERRO ao criar barracas (vendors):", venE?.message);
       throw "Erro ao criar vendors";
    }
    console.log(`${createdVendors.length} Barracas vinculadas aos Eventos!`);

    // 6. Cria Cardápio para os Vendors (15 produtos para cada)
    console.log("Cadastrando Cardápios...");
    const menuItemsToInsert = [];
    createdVendors.forEach(v => {
        PRODUCTS.forEach((p, idx) => {
            menuItemsToInsert.push({
                vendor_id: v.id,
                name: p.n,
                price: p.p,
                available: true,
                position: idx + 1
            });
        });
    });

    for (let i = 0; i < menuItemsToInsert.length; i += 200) {
        const batch = menuItemsToInsert.slice(i, i + 200);
        await supabase.from('menu_items').insert(batch);
    }

    console.log(`\n=== MASSIVO DE DADOS CRIADO COM SUCESSO! ===`);
  }

  seed();
} catch (err) {
  console.error("Erro no Seed Master:", err);
}
