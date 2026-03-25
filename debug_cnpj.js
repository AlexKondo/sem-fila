const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

try {
  const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf-8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) env[key.trim()] = value.join('=').trim().replace(/^"|"$/g, '');
  });

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  async function checkCnpj() {
    console.log("Verificando se a coluna 'cnpj' existe na tabela 'profiles'...");
    const { data, error } = await supabase.from('profiles').select('cnpj').limit(1);
    
    if (error) {
      console.error("ERRO ao buscar coluna 'cnpj':", error.message);
      if (error.message.includes('column "cnpj" does not exist')) {
        console.log("❌ A coluna 'cnpj' NÃO existe. É necessário rodar a migração!");
      }
    } else {
      console.log("✅ A coluna 'cnpj' existe na tabela 'profiles'!");
      console.log("Amostra de dado:", data);
    }
    process.exit(0);
  }

  checkCnpj();
} catch (err) {
  console.error(err);
  process.exit(1);
}
