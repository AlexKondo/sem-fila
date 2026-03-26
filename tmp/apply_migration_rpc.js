// Aplica migration criando uma função temporária via REST e depois chamando
const SUPABASE_URL = 'https://ltvgkeracfdyolkgkkji.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0dmdrZXJhY2ZkeW9sa2dra2ppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIxMTY2OSwiZXhwIjoyMDg5Nzg3NjY5fQ.BHw8nnO58nnFLY6wL04xJCTRnc2lRLJLcOp6kHSRhho';
const h = { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };

// Passo 1: criar função de migração via RPC placeholder
// Vamos usar pg_catalog para checar colunas e fazer ALTER TABLE
async function createMigrationFn() {
  const body = `
CREATE OR REPLACE FUNCTION public._run_events_migration()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Adicionar colunas na tabela events
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='address') THEN
    ALTER TABLE public.events ADD COLUMN address text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='description') THEN
    ALTER TABLE public.events ADD COLUMN description text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='start_date') THEN
    ALTER TABLE public.events ADD COLUMN start_date timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='end_date') THEN
    ALTER TABLE public.events ADD COLUMN end_date timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='start_time') THEN
    ALTER TABLE public.events ADD COLUMN start_time time;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='end_time') THEN
    ALTER TABLE public.events ADD COLUMN end_time time;
  END IF;
  RETURN 'OK';
END;
$$;
`;

  // Usar endpoint de query via REST admin (pg meta)
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({ query: body })
  });
  return r;
}

// Alternativa: usar o endpoint de funções do PostgREST diretamente
async function callRpc(fn, args = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify(args)
  });
  const text = await r.text();
  return { ok: r.ok, status: r.status, body: text };
}

async function run() {
  // Tentar criar a função via rpc/query (se existir)
  const test = await callRpc('_run_events_migration');
  if (test.status === 404) {
    console.log('Função não existe ainda. Tentando criar via SQL endpoint...');
    // Não conseguimos rodar DDL direto sem PAT. Vamos instruir o usuário.
    console.log('\n⚠️  Não é possível aplicar migrations sem o Personal Access Token do Supabase.');
    console.log('Por favor, cole o SQL abaixo no Supabase SQL Editor:\n');
    console.log(`https://supabase.com/dashboard/project/ltvgkeracfdyolkgkkji/sql/new`);
    console.log('\n--- SQL PARA APLICAR ---\n');
    console.log(`ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS address     text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS start_date  timestamptz,
  ADD COLUMN IF NOT EXISTS end_date    timestamptz,
  ADD COLUMN IF NOT EXISTS start_time  time,
  ADD COLUMN IF NOT EXISTS end_time    time;

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'affiliate';`);
    console.log('\n--- FIM DO SQL ---');
  } else {
    console.log('Resultado:', test.body);
  }
}

run().catch(console.error);
