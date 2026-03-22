// Cliente Supabase para uso no BROWSER (Client Components)
// skill: 2-supabase-auth - tokens via httpOnly cookies (gerenciado pelo @supabase/ssr)

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
