'use client';

import { useState, useRef, memo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const P = '#ec5b13';

/* Hero estático — nunca re-renderiza */
const LoginHero = memo(function LoginHero() {
  return (
    <>
      <Link
        href="/"
        className="absolute top-8 left-6 z-30 flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl text-white font-bold text-sm hover:bg-white/20 transition-all border border-white/10 active:scale-95 shadow-lg"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Voltar
      </Link>
      <div className="relative h-[40vh] w-full overflow-hidden bg-slate-800">
        <div className="absolute inset-0 bg-gradient-to-t from-[#f8f6f6] via-transparent to-transparent z-10" />
        <div className="h-full w-full" style={{ background: 'linear-gradient(135deg, #1e1008 0%, #3d1f0a 50%, #ec5b1320 100%)' }} />
        <div className="absolute top-12 left-0 right-0 z-20 flex flex-col items-center">
          <div className="p-3 rounded-xl shadow-lg mb-4" style={{ backgroundColor: P }}>
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-md">QuickPick</h1>
          <p className="text-white/80 text-sm font-medium drop-shadow-sm mt-1">Sem fila, só sabor</p>
        </div>
      </div>
    </>
  );
});

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/dashboard/vendor';

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const email = emailRef.current?.value ?? '';
    const password = passwordRef.current?.value ?? '';
    setError(''); setLoading(true);
    const supabase = createClient();

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError || !authData.user) {
      setError('Email ou senha inválidos.');
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    const role = (profile as any)?.role;

    const ADMIN_EMAIL = 'alexandre.kondo@gmail.com';
    let dest = '/login-user';
    if (role === 'platform_admin' || authData.user.email === ADMIN_EMAIL) {
      dest = '/dashboard/admin';
    } else if (role === 'org_admin') {
      dest = '/dashboard/org';
    } else if (role === 'vendor' || role === 'waitstaff') {
      dest = '/dashboard/vendor';
    } else if (role === 'deliverer') {
      dest = '/dashboard/deliverer';
    }

    // Garante que a sessão foi escrita nos cookies antes de redirecionar
    router.refresh();
    await new Promise((r) => setTimeout(r, 150));
    router.replace(dest);
  }

  const ringStyle = { '--tw-ring-color': P + '80' } as React.CSSProperties;

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden" style={{ backgroundColor: '#f8f6f6' }}>
      <LoginHero />

      <div className="flex-1 px-6 -mt-12 relative z-20 rounded-t-[32px] pt-8 shadow-2xl bg-white">
        <div className="max-w-md mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Bem-vindo de volta</h2>
            <p className="text-slate-500 mt-1">Acesse o painel do seu negócio.</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700 ml-1">Email</label>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <input
                  ref={emailRef}
                  type="email" required autoComplete="email"
                  placeholder="seu@email.com"
                  className="w-full pl-12 pr-4 h-14 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 transition-all"
                  style={ringStyle}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700 ml-1">Senha</label>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <input
                  ref={passwordRef}
                  type={showPw ? 'text' : 'password'} required autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 h-14 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 transition-all"
                  style={ringStyle}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {showPw
                      ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                    }
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <a href="#" className="text-sm font-semibold hover:underline" style={{ color: P }}>Esqueci a senha</a>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full h-14 font-bold rounded-xl text-white shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: P, boxShadow: `0 4px 15px ${P}40` }}
            >
              {loading ? 'Entrando…' : <>
                Entrar
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>}
            </button>
          </form>

          <div className="text-center mt-8 pb-12 space-y-3">
            <p className="text-slate-500 text-sm">
              Não tem conta?{' '}
              <Link href="/register" className="font-bold ml-1" style={{ color: P }}>Criar conta de fornecedor</Link>
            </p>
            <p className="text-slate-400 text-xs">
              Organiza eventos?{' '}
              <Link href="/register-org" className="font-semibold hover:underline text-purple-600">Criar conta de organizador</Link>
            </p>
            <p className="text-slate-400 text-xs">
              É cliente?{' '}
              <Link href="/login-user" className="font-semibold hover:underline text-slate-500">Acessar minha conta</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageContent />
    </Suspense>
  );
}
