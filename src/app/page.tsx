import Link from 'next/link';
import { QrCode, ShoppingBag, Clock, ScanLine, Check, LogIn } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: '#f8f6f6' }}>
      {/* Header — só logo, zero distração */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#ec5b13' }}>
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
            </svg>
          </div>
          <span className="text-lg font-black tracking-tight text-slate-900">QuickPick</span>
        </div>
        <Link href="/login" className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
          <LogIn className="w-4 h-4" />
          Entrar
        </Link>
      </header>

      {/* Hero — cliente escaneia e pede */}
      <section className="px-6 pt-16 pb-20 text-center">
        <div className="max-w-sm mx-auto">
          {/* Ícone animado */}
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 rounded-3xl animate-pulse" style={{ backgroundColor: '#ec5b1320' }} />
            <div className="relative w-24 h-24 rounded-3xl flex items-center justify-center" style={{ backgroundColor: '#ec5b13' }}>
              <ScanLine className="w-12 h-12 text-white" />
            </div>
          </div>

          <h1 className="text-4xl font-black text-slate-900 leading-[1.1] mb-4">
            Peça agora,<br />
            <span style={{ color: '#ec5b13' }}>retire sem fila</span>
          </h1>
          <p className="text-slate-500 text-base mb-10 leading-relaxed">
            Escaneie o QR Code do Kiosk, Restaurante ou Food Truck, escolha o que quiser e acompanhe seu pedido em tempo real.
          </p>

          <Link
            href="/scan"
            className="flex items-center justify-center gap-3 font-bold px-8 py-5 rounded-2xl text-white text-lg w-full transition-all active:scale-95"
            style={{ backgroundColor: '#ec5b13', boxShadow: '0 8px 30px #ec5b1340' }}
          >
            <QrCode className="w-6 h-6" />
            Escanear QR Code
          </Link>

          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-slate-400 flex-wrap">
            <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-green-500" /> Sem download</span>
            <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-green-500" /> Grátis</span>
            <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-green-500" /> Tempo real</span>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="px-6 pb-16 bg-white">
        <div className="max-w-lg mx-auto pt-14">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#ec5b13' }}>Simples assim</p>
            <h2 className="text-2xl font-black text-slate-900">Como funciona</h2>
          </div>
          <div className="space-y-4">
            {[
              { icon: QrCode, step: '01', title: 'Escaneia o QR', desc: 'Aponte a câmera para o QR code do Kiosk, barraca ou restaurante. Sem download, sem cadastro.' },
              { icon: ShoppingBag, step: '02', title: 'Faz o pedido', desc: 'Navegue no cardápio, adicione ao carrinho e confirme em segundos.' },
              { icon: Clock, step: '03', title: 'Retira quando pronto', desc: 'Acompanhe o status em tempo real e vá buscar só quando estiver pronto.' },
            ].map(({ icon: Icon, step, title, desc }) => (
              <div key={step} className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#ec5b13' }}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] font-bold tracking-widest" style={{ color: '#ec5b13' }}>{step}</p>
                  <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Seção do fornecedor — discreta, no rodapé */}
      <section className="px-6 py-12 border-t border-slate-200">
        <div className="max-w-sm mx-auto text-center">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-widest mb-2">Você é fornecedor?</p>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            Tenha seu cardápio digital, gerencie pedidos em tempo real e receba pagamentos pelo QuickPick.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/register"
              className="w-full h-12 font-bold rounded-xl text-white flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{ backgroundColor: '#ec5b13', boxShadow: '0 4px 15px #ec5b1330' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Quero cadastrar meu quiosque
            </Link>
            <Link
              href="/login"
              className="w-full h-12 font-semibold rounded-xl flex items-center justify-center gap-2 transition-all border border-slate-200 bg-white text-slate-700 hover:border-slate-300 active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Já tenho conta de vendor
            </Link>
            <Link
              href="/register-org"
              className="w-full py-3 px-4 font-semibold rounded-xl flex items-center justify-center gap-2 transition-all border border-purple-200 bg-white text-purple-700 hover:bg-purple-50 active:scale-95 text-center leading-snug"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Organize eventos e tenha controle de taxas dos Quiosques do evento.
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-5 px-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} QuickPick. Todos os direitos reservados.
      </footer>
    </main>
  );
}
