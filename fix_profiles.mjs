import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value.length > 0) env[key.trim()] = value.join('=').trim().replace(/^"(.*)"$/, '$1');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function fixProfiles() {
    process.stdout.write('--- CORRIGINDO PERFIS ---\n');

    // 1. Busca todos os usuários do Auth para reconstruir metadados se necessário
    const { data: { users } } = await supabase.auth.admin.listUsers();
    
    // 2. Busca perfis
    const { data: profiles } = await supabase.from('profiles').select('*');
    
    if (!profiles) return;

    for (const p of profiles) {
        const authUser = users.find(u => u.id === p.id);
        const metaName = authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || '';
        
        let targetName = p.name || p.full_name || metaName; // tenta colunas erradas ou meta
        let targetRole = p.role || p.app_role || 'customer';

        if (!p.name || !p.role || p.full_name || p.app_role) {
            process.stdout.write(`Viculando ${authUser?.email || p.id}... `);
            const { error } = await supabase.from('profiles').update({
                name: targetName,
                role: targetRole
            }).eq('id', p.id);
            console.log(error ? 'ERRO: ' + error.message : 'OK');
        }
    }

    console.log('--- FIM DA CORREÇÃO ---');
}

fixProfiles().catch(console.error);
