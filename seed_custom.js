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

  const PASSWORD = 'amksilver';

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
    console.log("=== INICIANDO CRIAÇÃO ===");

    // 1. Cria Organização e Evento
    const { data: org } = await supabase.from('organizations').insert({ name: 'QuickPick', slug: 'quickpick' }).select('id').single();
    if (!org) throw "Erro ao criar organização";
    
    const { data: ev } = await supabase.from('events').insert({
       organization_id: org.id,
       name: 'Evento Principal',
       location: 'Arena Central',
       active: true
    }).select('id, name').single();

    // 2. Cria 10 Clientes (Auth + Profile)
    console.log("Criando 10 Clientes...");
    for (let i = 1; i <= 10; i++) {
        const email = `cliente${i}@teste.com`;
        const { data } = await supabase.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
        if (data && data.user) {
             await supabase.from('profiles').update({ name: `Cliente ${i}`, role: 'customer' }).eq('id', data.user.id);
        }
    }

    // 3. Cria 10 Logins de Vendors
    console.log("Criando 10 Vendors...");
    const vendorUsers = [];
    for (let i = 1; i <= 10; i++) {
        const email = `vendor${i}@teste.com`;
        const name = `Dono da Marca #${i}`;
        const { data } = await supabase.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { name } });
        if (data && data.user) {
             await supabase.from('profiles').update({ name, role: 'vendor' }).eq('id', data.user.id);
             vendorUsers.push({ id: data.user.id, name });
        }
    }

    // 4. Cria Vendors (Tabelas)
    console.log("Criando pontos de venda (barracas)...");
    const vendorsToInsert = vendorUsers.map((donr, index) => ({
        event_id: ev.id,
        owner_id: donr.id,
        name: `Quiosque ${index + 1} - ${ev.name}`,
        description: `Delícias do Quiosque ${index + 1}`,
        avg_prep_time: 15,
        payment_mode: 'optional',
        accept_cash: true, accept_pix: true, accept_card: true,
        active: true
    }));

    const { data: createdVendors } = await supabase.from('vendors').insert(vendorsToInsert).select('id, name');

    // 5. Cria Cardápio para os Vendors
    console.log("Cadastrando Cardápios com IMAGENS...");
    const menuItemsToInsert = [];
    createdVendors.forEach(v => {
        PRODUCTS.forEach((p, idx) => {
            menuItemsToInsert.push({
                vendor_id: v.id,
                name: p.n,
                price: p.p,
                category: p.c,
                image_url: p.img,
                available: true,
                position: idx + 1
            });
        });
    });

    for (let i = 0; i < menuItemsToInsert.length; i += 200) {
        const batch = menuItemsToInsert.slice(i, i + 200);
        await supabase.from('menu_items').insert(batch);
    }

    console.log("\n=== FINALIZADO COM SUCESSO! ===");
  }

  seed();
} catch (err) {
  console.error("Erro no Seed:", err);
}
