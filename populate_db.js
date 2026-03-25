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

  async function populate() {
    console.log("=== INICIANDO CRIAÇÃO DE PRODUTOS E PEDIDOS ===");

    // 1. Busca os vendors criados
    const { data: vendors, error: vE } = await supabase.from('vendors').select('id, name');
    if (vE || !vendors) throw vE;
    console.log(`Buscando ${vendors.length} vendors...`);

    // 2. Busca perfis de clientes
    const { data: profiles, error: pE } = await supabase.from('profiles').select('id, name').eq('role', 'customer');
    if (pE || !profiles) throw pE;

    const categories = ['Lanches', 'Bebidas', 'Sobremesas'];
    const products = [
      { n: 'Hambúrguer Clássico', p: 18.5, c: 'Lanches' },
      { n: 'X-Salada Especial', p: 22.9, c: 'Lanches' },
      { n: 'Cachorro Quente Completo', p: 15.0, c: 'Lanches' },
      { n: 'Porção de Batata Frita', p: 12.0, c: 'Lanches' },
      { n: 'Dose de Pastéis (6 un)', p: 16.0, c: 'Lanches' },
      { n: 'Refrigerante Lata', p: 6.0, c: 'Bebidas' },
      { n: 'Suco Natural Copo', p: 8.5, c: 'Bebidas' },
      { n: 'Água Mineral', p: 4.0, c: 'Bebidas' },
      { n: 'Cerveja Artesanal', p: 14.0, c: 'Bebidas' },
      { n: 'Energético', p: 12.0, c: 'Bebidas' },
      { n: 'Minitorta de Morango', p: 10.0, c: 'Sobremesas' },
      { n: 'Sorvete de Casquinha', p: 7.0, c: 'Sobremesas' },
      { n: 'Churros de Doce de Leite', p: 8.0, c: 'Sobremesas' },
      { n: 'Brigadeiro Gourmet', p: 4.5, c: 'Sobremesas' },
      { n: 'Açaí na Tigela (300ml)', p: 14.0, c: 'Sobremesas' }
    ];

    console.log("Inserindo 15 produtos para cada vendor...");
    const menuItemsToInsert = [];
    vendors.forEach(v => {
      products.forEach((p, idx) => {
        menuItemsToInsert.push({
          vendor_id: v.id,
          name: `${v.name} - ${p.n}`,
          price: p.p,
          category: p.c,
          available: true,
          position: idx + 1
        });
      });
    });

    const { data: insertedItems, error: itemsE } = await supabase.from('menu_items').insert(menuItemsToInsert).select('id, vendor_id, price');
    if (itemsE) throw itemsE;
    console.log(`${menuItemsToInsert.length} Produtos cadastrados!`);

    console.log("\n=== CRIANDO PEDIDOS MOCKADOS ===");
    const statuses = ['received', 'preparing', 'almost_ready', 'ready', 'delivered'];
    const ordersToInsert = [];

    // Cria 50 pedidos aleatórios para dar volume aos Dashboards
    for (let i = 0; i < 50; i++) {
       const uIdx = i % profiles.length;
       const vIdx = i % vendors.length;
       const status = statuses[i % statuses.length]; // Distribui 
       const payStatus = status === 'received' ? 'pending' : 'paid';

       ordersToInsert.push({
          vendor_id: vendors[vIdx].id,
          user_id: profiles[uIdx].id,
          status: status,
          payment_status: payStatus,
          total_price: 0, // Calcula depois
          pickup_code: String.fromCharCode(65 + (i % 20)) + String.fromCharCode(65 + (i % 25)) + Math.floor(10 + Math.random() * 89), // AB12
          table_number: (1 + (i % 10)).toString()
       });
    }

    const { data: createdOrders, error: ordE } = await supabase.from('orders').insert(ordersToInsert).select('id, vendor_id');
    if (ordE) throw ordE;

    // Vincular 2 Itens de Menu para cada pedido inserido!
    console.log("Inserindo sub-itens dos pedidos para cálculo de preços...");
    const orderItemsToInsert = [];
    createdOrders.forEach(o => {
       const vendorItems = insertedItems.filter(i => i.vendor_id === o.vendor_id);
       if (vendorItems.length >= 2) {
          orderItemsToInsert.push({ order_id: o.id, menu_item_id: vendorItems[0].id, quantity: 2, unit_price: vendorItems[0].price });
          orderItemsToInsert.push({ order_id: o.id, menu_item_id: vendorItems[1].id, quantity: 1, unit_price: vendorItems[1].price });
       }
    });

    const { error: oItemsE } = await supabase.from('order_items').insert(orderItemsToInsert);
    if (oItemsE) throw oItemsE;

    console.log("Recalculando totais...");
    for (const o of createdOrders) {
       const items = orderItemsToInsert.filter(i => i.order_id === o.id);
       const total = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
       await supabase.from('orders').update({ total_price: total }).eq('id', o.id);
    }

    console.log("50 Pedidos distribuídos por status criados com sucesso!");
  }

  populate();
} catch (err) {
  console.error(err);
}
