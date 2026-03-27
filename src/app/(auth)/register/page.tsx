'use client';

import { useState } from 'react';
import Link from 'next/link';

const P = '#ec5b13';

// Máscara CPF/CNPJ: 000.000.000-00 ou 00.000.000/0000-00
function maskCPF_CNPJ(v: string) {
  const digits = v.replace(/\D/g, '').slice(0, 14);
  
  if (digits.length <= 11) {
    // Máscara CPF: 000.000.000-00
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else {
    // Máscara CNPJ: 00.000.000/0000-00
    return digits
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
}

// Máscara celular: (00) 00000-0000
function maskPhone(v: string) {
  v = v.replace(/\D/g, '').slice(0, 11);
  if (v.length <= 2) return v.length ? `(${v}` : '';
  if (v.length <= 7) return `(${v.slice(0,2)}) ${v.slice(2)}`;
  return `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
}

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) { setError('A senha deve ter ao menos 8 caracteres.'); return; }

    const rawDoc = cnpj.replace(/\D/g, '');
    if (rawDoc.length !== 11 && rawDoc.length !== 14) { setError('CPF ou CNPJ inválido.'); return; }

    if (!brandName.trim()) { setError('O nome da marca é obrigatório.'); return; }

    setLoading(true);
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, brandName, phone: phone.replace(/\D/g, ''), cnpj: rawDoc, address }),
    });
    const data = await res.json();

    if (!res.ok) { setError(data.error ?? 'Erro ao criar conta.'); }
    else { setSuccess(true); }
    setLoading(false);
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#f8f6f6' }}>
        <div className="bg-white rounded-3xl p-10 text-center max-w-sm w-full shadow-sm border border-slate-100">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: P + '20' }}>
            <svg className="w-8 h-8" style={{ color: P }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Confirme seu email</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            Enviamos um link de confirmação para <strong className="text-slate-700">{email}</strong>. Verifique sua caixa de entrada.
          </p>
          <Link href="/login" className="block mt-6 font-semibold text-sm" style={{ color: P }}>Ir para o login →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden" style={{ backgroundColor: '#f8f6f6' }}>
      {/* Hero */}
      <div className="relative h-[30vh] w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-[#f8f6f6] via-transparent to-transparent z-10" />
        <div className="h-full w-full" style={{ background: 'linear-gradient(135deg, #1e1008 0%, #3d1f0a 50%, #ec5b1320 100%)' }} />
        <div className="absolute top-10 left-0 right-0 z-20 flex flex-col items-center">
          <div className="p-3 rounded-xl shadow-lg mb-3" style={{ backgroundColor: P }}>
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-md">QuickPick</h1>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 -mt-8 relative z-20 rounded-t-[32px] pt-8 shadow-2xl bg-white">
        <div className="max-w-md mx-auto pb-12">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Criar conta grátis</h2>
            <p className="text-slate-500 mt-1 text-sm">Cadastre sua barraca e comece a receber pedidos</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Nome */}
            <Field label="Nome completo" required>
              <InputIcon icon={<UserIcon />}>
                <input
                  type="text" required value={name} onChange={e => setName(e.target.value)}
                  placeholder="Seu nome" autoComplete="name"
                  className="w-full pl-12 pr-4 h-14 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 text-sm"
                  style={{ '--tw-ring-color': P + '80' } as React.CSSProperties}
                />
              </InputIcon>
            </Field>

            {/* Email */}
            <Field label="Email" required>
              <InputIcon icon={<EmailIcon />}>
                <input
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com" autoComplete="email"
                  className="w-full pl-12 pr-4 h-14 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 text-sm"
                  style={{ '--tw-ring-color': P + '80' } as React.CSSProperties}
                />
              </InputIcon>
            </Field>

            {/* Celular com máscara */}
            <Field label="Celular" required>
              <InputIcon icon={<PhoneIcon />}>
                <input
                  type="tel" required value={phone}
                  onChange={e => setPhone(maskPhone(e.target.value))}
                  placeholder="(11) 99999-9999" autoComplete="tel" inputMode="numeric"
                  className="w-full pl-12 pr-4 h-14 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 text-sm"
                  style={{ '--tw-ring-color': P + '80' } as React.CSSProperties}
                />
              </InputIcon>
            </Field>

            {/* Nome da Marca */}
            <Field label="Nome da sua marca" required hint="Ex. Bar do Juazeiro">
              <InputIcon icon={<svg className="w-5 h-5 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}>
                <input
                  type="text" required value={brandName} onChange={e => setBrandName(e.target.value)}
                  placeholder="Nome do seu negócio"
                  className="w-full pl-12 pr-4 h-14 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 text-sm font-bold"
                  style={{ '--tw-ring-color': P + '80' } as React.CSSProperties}
                />
              </InputIcon>
            </Field>

            {/* CNPJ/CPF com máscara */}
            <Field label="CPF ou CNPJ" required>
              <InputIcon icon={<DocIcon />}>
                <input
                  type="text" required value={cnpj}
                  onChange={e => setCnpj(maskCPF_CNPJ(e.target.value))}
                  placeholder="000.000.000-00 ou 00.000.000/0000-00" inputMode="numeric"
                  className="w-full pl-12 pr-4 h-14 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 text-sm"
                  style={{ '--tw-ring-color': P + '80' } as React.CSSProperties}
                />
              </InputIcon>
            </Field>

            {/* Endereço */}
            <Field label="Endereço" hint="(opcional)">
              <InputIcon icon={<MapIcon />}>
                <input
                  type="text" value={address} onChange={e => setAddress(e.target.value)}
                  placeholder="Rua, número, cidade" autoComplete="street-address"
                  className="w-full pl-12 pr-4 h-14 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 text-sm"
                  style={{ '--tw-ring-color': P + '80' } as React.CSSProperties}
                />
              </InputIcon>
            </Field>

            {/* Senha */}
            <Field label="Senha" required>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <LockIcon />
                </span>
                <input
                  type={showPw ? 'text' : 'password'} required minLength={8} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres" autoComplete="new-password"
                  className="w-full pl-12 pr-12 h-14 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 text-sm"
                  style={{ '--tw-ring-color': P + '80' } as React.CSSProperties}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <EyeIcon open={showPw} />
                </button>
              </div>
            </Field>

            <button
              type="submit" disabled={loading}
              className="w-full h-14 font-bold rounded-xl text-white shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              style={{ backgroundColor: P, boxShadow: `0 4px 15px ${P}40` }}
            >
              {loading ? 'Criando conta…' : <>
                Criar conta grátis
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>}
            </button>
          </form>

          <div className="text-center mt-6">
            <p className="text-slate-500 text-sm">
              Já tem conta?{' '}
              <Link href="/login" className="font-bold ml-1" style={{ color: P }}>Entrar</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helpers de layout ──────────────────────────────────────────────────────────
function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-slate-700 ml-1">
        {label} {required && <span className="text-red-400">*</span>}
        {hint && <span className="text-slate-400 font-normal ml-1">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

function InputIcon({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
      {children}
    </div>
  );
}

// ── SVG Icons ──────────────────────────────────────────────────────────────────
function UserIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
}
function EmailIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
}
function PhoneIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>;
}
function DocIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
}
function MapIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
}
function LockIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>;
}
function EyeIcon({ open }: { open: boolean }) {
  return open
    ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
    : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
}
