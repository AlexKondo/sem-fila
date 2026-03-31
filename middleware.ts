// Middleware Next.js - Protege rotas autenticadas e atualiza sessão
// skill: 2-supabase-auth - intercepta rotas, renova tokens via cookies httpOnly

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Rotas que exigem autenticação
const PROTECTED_ROUTES = ['/dashboard', '/profile'];
// Rotas só para não-autenticados
const AUTH_ROUTES = ['/login', '/register'];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: any[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Atualiza sessão — NUNCA remova esta linha
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Redireciona rota protegida → login se não autenticado
  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Redireciona /login e /register → dashboard correto conforme role
  // Não redireciona /login-user (é rota de cliente, não de vendor)
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r)) && !pathname.startsWith('/login-user');
  if (isAuthRoute && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const url = request.nextUrl.clone();
    url.pathname = profile?.role === 'platform_admin' ? '/dashboard/admin' : '/dashboard/vendor';
    return NextResponse.redirect(url);
  }

  // Protege /dashboard/admin — verifica role no banco
  if (pathname.startsWith('/dashboard/admin') && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'platform_admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard/vendor';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
