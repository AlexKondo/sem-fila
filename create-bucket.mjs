import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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

if (!supabaseUrl || !supabaseKey) {
  console.error("Faltando NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Criando bucket 'menu-items'...");

  const { data, error } = await supabase
    .storage
    .createBucket('menu-items', {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
      fileSizeLimit: 1024 * 1024 * 5 // 5MB
    });

  if (error) {
    console.log("Aviso/Erro:", error.message);
  } else {
    console.log("Bucket criado com sucesso!", data);
  }

  console.log("Garantindo políticas de acesso (Se necessário rodar no SQL)...");
  process.exit(0);
}

run();
