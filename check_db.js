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

  async function checkSchema() {
    // Lista tabelas ou conta usuários
    const { data: pCount } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
    const { data: vCount } = await supabase.from('vendors').select('count', { count: 'exact', head: true });
    
    console.log(`Clientes/Perfis existentes: ${pCount?.count ?? 0}`);
    console.log(`Vendors existentes: ${vCount?.count ?? 0}`);

    // Tenta ler tabelas para ver se 'events' existe
    const { data: tables, error } = await supabase.rpc('get_tables'); // Pode não existir
    console.log("Erro ao buscar RPC:", error?.message);
    
    console.log("Verificando se tabela 'events' existe...");
    const { error: eventError } = await supabase.from('events').select('*').limit(1);
    console.log(eventError ? "Tabela 'events' NÃO existe ou erro." : "Tabela 'events' EXISTE!");
  }

  checkSchema();
} catch (err) {
  console.error(err);
}
