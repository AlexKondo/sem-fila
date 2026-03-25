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

  async function fixVendors() {
    console.log("=== LIMPANDO BARRACAS FANTASMAS ===");

    // Traz todos os vendors que começam o nome com "Dono da Marca" (as criadas pelo trigger)
    const { data: ghosts } = await supabase.from('vendors').select('id, name').ilike('name', 'Dono da Marca %');

    if (ghosts && ghosts.length > 0) {
       console.log(`Encontrados ${ghosts.length} barracas inúteis. Deletando...`);
       
       for (const g of ghosts) {
           await supabase.from('vendors').delete().eq('id', g.id);
           console.log(`- Apagado: ${g.name}`);
       }
    } else {
       console.log("Nenhuma barraca fantasma encontrada!");
    }

    console.log("=== LIMPEZA CONCLUÍDA ===");
  }

  fixVendors();
} catch (err) {
  console.error(err);
}
