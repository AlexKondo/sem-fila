'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import ThemeToggle from '@/components/ui/ThemeToggle';

const P = '#ec5b13';

export default function RegisterUserPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthday, setBirthday] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function formatPhone(val: string) {
    const d = val.replace(/\D/g, '').substring(0, 11);
    if (d.length > 10) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
    if (d.length > 6)  return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
    if (d.length > 2)  return `(${d.slice(0,2)}) ${d.slice(2)}`;
    return d;
  }

  function formatCpf(val: string) {
    const d = val.replace(/\D/g, '').substring(0, 11);
    if (d.length > 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
    if (d.length > 6) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
    if (d.length > 3) return `${d.slice(0,3)}.${d.slice(3)}`;
    return d;
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('A senha deve ter ao menos 8 caracteres.'); return; }

    setLoading(true);
    const supabase = createClient();

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role: 'customer' } },
    });

    if (signUpError) { setError(signUpError.message); setLoading(false); return; }

    // Salva dados complementares no perfil
    if (authData.user) {
      await supabase.from('profiles').update({
        name: name.trim(),
        email: email.trim(),
        phone: phone.replace(/\D/g, '') || null,
        cpf: cpf.replace(/\D/g, '') || null,
        birthday: birthday || null,
      }).eq('id', authData.user.id);
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[#f8f6f6] dark:bg-slate-950 transition-colors duration-300">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 text-center max-w-sm w-full shadow-2xl border border-slate-100 dark:border-slate-800 transition-colors">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 animate-bounce" style={{ backgroundColor: P + '20' }}>
            <svg className="w-8 h-8" style={{ color: P }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Quase lá!</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
            Enviamos um link para confirmar seu email em <strong className="text-slate-700 dark:text-slate-300">{email}</strong>.
          </p>
          <Link href="/login-user" className="block mt-8 font-black text-sm uppercase tracking-widest hover:underline transition-all" style={{ color: P }}>Ir para o login →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[#f8f6f6] dark:bg-slate-950 transition-colors duration-300">
      {/* Mini Hero */}
      <div className="relative h-[25vh] w-full overflow-hidden bg-slate-800">
        <div className="absolute inset-0 bg-gradient-to-t from-[#f8f6f6] dark:from-slate-950 via-transparent to-transparent z-10" />
        <div className="h-full w-full" style={{ background: 'linear-gradient(135deg, #1e1008 0%, #3d1f0a 50%, #ec5b1320 100%)' }} />
        <div className="absolute top-8 left-0 right-0 z-20 flex flex-col items-center">
          <div className="absolute top-0 right-6">
            <ThemeToggle />
          </div>
          <div className="p-3 rounded-xl shadow-lg mb-2" style={{ backgroundColor: P }}>
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">QuickPick</h1>
        </div>
      </div>

      <div className="flex-1 px-6 -mt-10 relative z-20 rounded-t-[32px] pt-10 shadow-2xl bg-white dark:bg-slate-900 transition-colors duration-300">
        <div className="max-w-md mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Criar sua conta</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium">Receba atualizações dos seus pedidos em tempo real</p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 text-xs px-4 py-3 rounded-xl mb-4 animate-in fade-in slide-in-from-top-1 font-medium">{error}</div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Nome */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Seu nome</label>
              <input
                type="text" required value={name} onChange={e => setName(e.target.value)}
                placeholder="Como quer ser chamado?"
                className="w-full px-4 h-14 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 text-sm text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-700 font-medium transition-all"
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Email</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full px-4 h-14 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 text-sm text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-700 font-medium transition-all"
              />
            </div>

            {/* Celular */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Celular / WhatsApp</label>
              <input
                type="tel" value={phone} onChange={e => setPhone(formatPhone(e.target.value))}
                placeholder="(11) 99999-9999"
                inputMode="numeric"
                className="w-full px-4 h-14 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 text-sm text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-700 font-medium transition-all"
              />
            </div>

            {/* CPF */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">CPF <span className="text-slate-400 dark:text-slate-600 font-medium">(para pagamentos)</span></label>
              <input
                type="text" value={cpf} onChange={e => setCpf(formatCpf(e.target.value))}
                placeholder="000.000.000-00"
                inputMode="numeric"
                className="w-full px-4 h-14 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 text-sm text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-700 font-medium transition-all"
              />
            </div>

            {/* Data de Nascimento */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Data de nascimento</label>
              <input
                type="date" value={birthday} onChange={e => setBirthday(e.target.value)}
                className="w-full px-4 h-14 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 text-sm text-slate-900 dark:text-white transition-colors"
                style={{ colorScheme: 'dark' }}
              />
            </div>

            {/* Senha */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Senha</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} required minLength={8} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full px-4 pr-12 h-14 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 text-sm text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-700 font-medium transition-all"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600 hover:text-slate-600 transition-colors">
                  {showPw
                    ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  }
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full h-14 font-bold rounded-xl text-white shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              style={{ backgroundColor: P }}
            >
              {loading ? 'Cadastrando…' : 'Criar minha conta'}
            </button>
          </form>

          <div className="text-center mt-6 pb-12">
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Já tem conta? <Link href="/login-user" className="font-bold ml-1 hover:underline transition-all" style={{ color: P }}>Fazer login</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
