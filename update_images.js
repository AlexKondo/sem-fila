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

  async function update() {
    console.log("Buscando itens de menu...");
    const { data: items, error } = await supabase.from('menu_items').select('id, name');
    if (error || !items) throw error;

    console.log(`Atualizando ${items.length} itens com imagens realistas...`);

    const updates = items.map(i => {
       let url = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format'; // default geral

       if (i.name.includes('Hambúrguer') || i.name.includes('X-Salada')) {
          url = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format';
       } else if (i.name.includes('Batata Frita')) {
          url = 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&auto=format';
       } else if (i.name.includes('Pastéis') || i.name.includes('Cachorro Quente')) {
          url = 'https://images.unsplash.com/photo-1612392061787-2d078b3e573c?w=400&auto=format';
       } else if (i.name.includes('Refrigerante')) {
          url = 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&auto=format'; // Coca Cola
       } else if (i.name.includes('Cerveja Artesanal')) {
          url = 'https://images.unsplash.com/photo-1618885472179-5e474019f2a9?w=400&auto=format';
       } else if (i.name.includes('Suco Natural')) {
          url = 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&auto=format';
       } else if (i.name.includes('Água Mineral')) {
          url = 'https://images.unsplash.com/photo-1548964081-37d45f44fe2a?w=400&auto=format';
       } else if (i.name.includes('Sorvete') || i.name.includes('Brigadeiro') || i.name.includes('Churros') || i.name.includes('Minitorta')) {
          url = 'https://images.unsplash.com/photo-1563805042-7684c849a158?w=400&auto=format';
       } else if (i.name.includes('Açaí')) {
          url = 'https://images.unsplash.com/photo-1590483736622-3028387bc97b?w=400&auto=format';
       }
       return { id: i.id, image_url: url };
    });

    try {
      console.log("Iniciando atualizações concorrentes por lotes...");
      for (let i = 0; i < updates.length; i += 20) {
         const batch = updates.slice(i, i + 20);
         const promises = batch.map(u => 
            supabase.from('menu_items').update({ image_url: u.image_url }).eq('id', u.id)
         );
         await Promise.all(promises);
         console.log(`Lote ${Math.floor(i / 20) + 1} de ${Math.ceil(updates.length / 20)} concluído!`);
      }
      console.log("Imagens sincronizadas com sucesso para todos os itens!");
    } catch (upsertError) {
       console.error("Erro na atualização:", upsertError);
    }
  }

  update();
} catch (err) {
  console.error(err);
}
