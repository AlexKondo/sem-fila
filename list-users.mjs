import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

let supabaseUrl = '';
let supabaseKey = '';

try {
  const envContent = fs.readFileSync('.env', 'utf-8');
  envContent.split('\n').forEach(line => {
    const [k, v] = line.split('=');
    if (k?.trim() === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = v?.trim().replace(/"/g, '');
    if (k?.trim() === 'SUPABASE_SERVICE_ROLE_KEY') supabaseKey = v?.trim().replace(/"/g, '');
  });
} catch (e) {
  console.error("Não foi possível ler arquivo .env:", e);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 100
  });

  if (error) {
    console.error("Erro ao listar auth.users:", error.message);
    process.exit(1);
  }

  const { data: profiles } = await supabase.from('profiles').select('id, name, role');

  const profileMap = {};
  (profiles || []).forEach(p => {
    profileMap[p.id] = p;
  });

  console.log(JSON.stringify(users.map(u => ({
    id: u.id,
    email: u.email,
    role: profileMap[u.id]?.role || 'unknown',
    name: profileMap[u.id]?.name || 'N/A'
  })), null, 2));

  process.exit(0);
}

run();
