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

  async function test() {
    console.log("Simulando insert do formulário...");
    const { data: firstEvent } = await supabase.from('events').select('id').limit(1).single();
    
    // Pega o id de um vendor de teste (ex: vendor1@teste.com se existir)
    const { data: profiles } = await supabase.from('profiles').select('id').eq('role', 'vendor').limit(1);
    const userId = profiles?.[0]?.id || '00000000-0000-0000-0000-000000000000';

    const { error: insertError } = await supabase.from('vendors').insert({
      owner_id: userId,
      event_id: firstEvent?.id, // Pode vir indefinido se a tabela estiver zerada!
      name: 'Barraca de Teste Simulado',
      description: 'Nova marca QuickPick',
      avg_prep_time: 15,
      payment_mode: 'optional',
      accept_cash: true, accept_pix: true, accept_card: true,
      active: true
    });

    if (insertError) {
      console.error("❌ ERRO NO INSERT:", insertError);
    } else {
      console.log("✅ Insert executado com sucesso!");
    }
  }

  test();
} catch (err) {
  console.error(err);
}
