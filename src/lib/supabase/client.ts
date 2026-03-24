// Cliente Supabase para uso no BROWSER (Client Components)
// skill: 2-supabase-auth - tokens via httpOnly cookies (gerenciado pelo @supabase/ssr)

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createBrowserClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
