// Cliente Supabase para uso no SERVIDOR (Server Components, Server Actions, API Routes)
// skill: 2-supabase-auth - lê/escreve cookies de sessão de forma segura

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Ignorado em Server Components (somente leitura)
          }
        },
      },
    }
  );
}

// Nota: createAdminClient (service_role) será adicionado quando necessário
// para webhooks de pagamento ou jobs administrativos.
