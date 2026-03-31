'use client';

import { useState } from 'react';
import Link from 'next/link';
import ThemeToggle from '@/components/ui/ThemeToggle';

const P = '#7c3aed'; // Roxo para diferenciar do vendor (laranja)

function maskCPF_CNPJ(v: string) {
  const digits = v.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else {
    return digits
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
}

function maskPhone(v: string) {
  v = v.replace(/\D/g, '').slice(0, 11);
  if (v.length <= 2) return v.length ? `(${v}` : '';
  if (v.length <= 7) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
  return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
}

export default function RegisterOrgPage() {
  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) { setError('A senha deve ter ao menos 8 caracteres.'); return; }
    if (!orgName.trim()) { setError('O nome da organização é obrigatório.'); return; }

    const rawDoc = cnpj.replace(/\D/g, '');
    if (rawDoc.length !== 11 && rawDoc.length !== 14) { setError('CPF ou CNPJ inválido.'); return; }

    setLoading(true);
    const res = await fetch('/api/register-org', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        name,
        phone: phone.replace(/\D/g, ''),
        cnpj: rawDoc,
        orgName: orgName.trim(),
      }),
    });
    const data = await res.json();

    if (!res.ok) { setError(data.error ?? 'Erro ao criar conta.'); }
    else { setSuccess(true); }
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
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Conta criada!</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
            Sua organização <strong className="text-slate-700 dark:text-slate-300">{orgName}</strong> está pronta. Agora você pode criar eventos e convidar fornecedores.
          </p>
          <Link href="/login" className="block mt-8 font-black text-sm uppercase tracking-widest hover:underline transition-all" style={{ color: P }}>Ir para o login →</Link>
        </div>
      </div>
    );
  }

  const ringStyle = { '--tw-ring-color': P + '80' } as React.CSSProperties;

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[#f8f6f6] dark:bg-slate-950 transition-colors duration-300">
      {/* Hero */}
      <div className="relative h-[30vh] w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-[#f8f6f6] dark:from-slate-950 via-transparent to-transparent z-10" />
        <div className="h-full w-full" style={{ background: 'linear-gradient(135deg, #1a0533 0%, #3b1d6e 50%, #7c3aed20 100%)' }} />
        <Link href="/" className="absolute top-4 left-4 z-30 w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-colors border border-white/10">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="absolute top-4 right-4 z-30">
          <ThemeToggle />
        </div>
        <div className="absolute top-10 left-0 right-0 z-20 flex flex-col items-center">
          <div className="p-3 rounded-xl shadow-lg mb-3" style={{ backgroundColor: P }}>
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-md">QuickPick</h1>
          <p className="text-white/70 text-xs mt-1">Organizador de Eventos</p>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 -mt-8 relative z-20 rounded-t-[32px] pt-8 shadow-2xl bg-white dark:bg-slate-900 transition-colors duration-300">
        <div className="max-w-md mx-auto pb-12">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Criar conta grátis</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium">Organize eventos, convide barracas e gerencie tudo em um só lugar</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Nome */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Nome completo <span className="text-red-400">*</span></label>
              <input
                type="text" required value={name} onChange={e => setName(e.target.value)}
                placeholder="Seu nome" autoComplete="name"
                className="w-full px-4 h-14 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 text-sm text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-700 font-medium transition-all"
                style={ringStyle}
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Email <span className="text-red-400">*</span></label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com" autoComplete="email"
                className="w-full px-4 h-14 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 text-sm text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-700 font-medium transition-all"
                style={ringStyle}
              />
            </div>

            {/* Celular */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Celular <span className="text-red-400">*</span></label>
              <input
                type="tel" required value={phone}
                onChange={e => setPhone(maskPhone(e.target.value))}
                placeholder="(11) 99999-9999" autoComplete="tel" inputMode="numeric"
                className="w-full px-4 h-14 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 text-sm text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-700 font-medium transition-all"
                style={ringStyle}
              />
            </div>

            {/* Nome da Organização */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
                Nome da organização <span className="text-red-400">*</span>
                <span className="text-slate-400 font-normal ml-1">Ex: Festa Beneficente do Morango</span>
              </label>
              <input
                type="text" required value={orgName} onChange={e => setOrgName(e.target.value)}
                placeholder="Digite o nome da sua empresa e não o nome do evento."
                className="w-full px-4 h-14 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 text-sm text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-700 font-medium transition-all"
                style={ringStyle}
              />
            </div>

            {/* CPF/CNPJ */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">CPF ou CNPJ <span className="text-red-400">*</span></label>
              <input
                type="text" required value={cnpj}
                onChange={e => setCnpj(maskCPF_CNPJ(e.target.value))}
                inputMode="numeric"
                className="w-full px-4 h-14 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 text-sm text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-700 font-medium transition-all"
                style={ringStyle}
              />
            </div>

            {/* Senha */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Senha <span className="text-red-400">*</span></label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} required minLength={8} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres" autoComplete="new-password"
                  className="w-full px-4 pr-12 h-14 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 text-sm text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-700 font-medium transition-all"
                  style={ringStyle}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
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
              style={{ backgroundColor: P, boxShadow: `0 4px 15px ${P}40` }}
            >
              {loading ? 'Criando conta…' : <>
                Criar conta de organizador
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>}
            </button>
          </form>

          <div className="text-center mt-6">
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Já tem conta?{' '}
              <Link href="/login" className="font-bold ml-1 hover:underline transition-all" style={{ color: P }}>Entrar</Link>
            </p>
            <p className="text-slate-400 dark:text-slate-600 text-[11px] font-bold uppercase tracking-widest mt-4">
              É fornecedor?{' '}
              <Link href="/register" className="font-black hover:underline text-slate-500 dark:text-slate-500 ml-1">Criar conta de fornecedor</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
