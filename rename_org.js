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

  async function rename() {
    console.log("Renomeando Organização para QuickPick...");
    const { error } = await supabase.from('organizations')
      .update({ name: 'QuickPick', slug: 'quickpick' })
      .eq('name', 'Eventize Brasil');
    
    if (error) console.error("Erro ao renomear:", error);
    else console.log("Organização atualizada com sucesso para QuickPick!");
  }

  rename();
} catch (err) {
  console.error(err);
}
