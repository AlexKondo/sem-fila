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

  const STATUSES = ['received', 'preparing', 'almost_ready', 'ready', 'delivered'];

  async function seedOrders() {
    console.log("=== INICIANDO CRIAÇÃO DE PEDIDOS DE TESTES ===");

    // 1. Busca todos os Clientes
    const { data: customers } = await supabase.from('profiles').select('id').eq('role', 'customer');
    if (!customers || customers.length === 0) throw "Nenhum cliente encontrado!";

    // 2. Busca todos os Vendors
    const { data: vendors } = await supabase.from('vendors').select('id, name');
    if (!vendors || vendors.length === 0) throw "Nenhum vendor encontrado!";

    console.log(`Clientes: ${customers.length} | Vendors: ${vendors.length}`);

    let totalOrders = 0;

    for (const v of vendors) {
        // Busca 3 itens do cardápio do vendor para montar o carrinho
        const { data: items } = await supabase.from('menu_items').select('id, price').eq('vendor_id', v.id).limit(3);
        if (!items || items.length === 0) continue;

        // Cria 4 pedidos por Vendor (1 em cada Status)
        for (let i = 0; i < 4; i++) {
             const cust = customers[i % customers.length];
             const status = STATUSES[i];
             const pickupCode = `${String.fromCharCode(65 + (i % 26))}${String.fromCharCode(66 + (i % 26))}${10 + i}`;

             // Calcula total
             let tot = 0;
             items.forEach(it => tot += Number(it.price));

             // Insere Pedido
             const { data: order, error: oE } = await supabase.from('orders').insert({
                 vendor_id: v.id,
                 user_id: cust.id,
                 table_number: String(i + 4),
                 status: status,
                 payment_status: status === 'delivered' || status === 'ready' ? 'paid' : 'pending',
                 total_price: tot,
                 pickup_code: pickupCode
             }).select('id').single();

             if (oE || !order) {
                 console.error(`Erro ao criar pedido para ${v.name}:`, oE);
                 continue;
             }

             // Insere Itens do Pedido
             const itemsInsert = items.map(it => ({
                 order_id: order.id,
                 menu_item_id: it.id,
                 quantity: 1,
                 unit_price: it.price
             }));

             await supabase.from('order_items').insert(itemsInsert);
             totalOrders++;
        }
        console.log(`- 4 pedidos criados para: ${v.name}`);
    }

    console.log(`\n=== PROCESSAMENTO CONCLUÍDO! ===`);
    console.log(`⚡ ${totalOrders} novos pedidos espalhados por todos os status no seu Dashboard!`);
  }

  seedOrders();
} catch (err) {
  console.error(err);
}
