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

    const FALLBACK_IMAGES = {
      bebida: 'photo-1544145945-f904253d0c7b',
      refrigerante: 'photo-1622483767028-3f66f34a50f4',
      cerveja: 'photo-1535958636474-b021ee887b13',
      suco: 'photo-1513558161293-cdaf765ed2fd',
      agua: 'photo-1548919973-5dea58a94b44',
      cafe: 'photo-1509042239860-f550ce710b93',
      vinho: 'photo-1510812431401-41d2bd2722f3',
      coxinha: 'photo-1626082927389-6cd097cdc6ec',
      esfiha: 'photo-1559811814-e2c7dec08091',
      salgado: 'photo-1563379926898-05f4575a45d8',
      lanche: 'photo-1568901346375-23c9450c58cd',
      burger: 'photo-1568901346375-23c9450c58cd',
      pizza: 'photo-1513104890138-7c749659a591',
      sobremesa: 'photo-1551024506-0bccd828d307',
      doce: 'photo-1551024506-0bccd828d307',
      bolo: 'photo-1578985545062-69928b1d9587',
      porcao: 'photo-1544148103-0773bf10d330',
      batata: 'photo-1573082833025-a74007960682',
      combo: 'photo-1504674900247-0877df9cc836',
      food: 'photo-1546069901-ba9599a7e63c'
    };

    const getImage = (name) => {
      const n = name.toLowerCase();
      for (const key in FALLBACK_IMAGES) {
        if (n.includes(key)) return `https://images.unsplash.com/${FALLBACK_IMAGES[key]}?auto=format&fit=crop&w=500&q=80`;
      }
      return `https://images.unsplash.com/${FALLBACK_IMAGES.food}?auto=format&fit=crop&w=500&q=80`;
    };

    const updates = items.map(i => ({ id: i.id, image_url: getImage(i.name) }));

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
