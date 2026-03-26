'use client';

import Link from 'next/link';
import { useState } from 'react';

const P = '#ec5b13';

export default function AffiliatesLandingPage() {
  const [copied, setCopied] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText('https://quickpick.com.br/afiliados/GAB99');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen selection:bg-orange-500 selection:text-white" style={{ backgroundColor: '#0f172a' }}>
      {/* Dynamic Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-600/30 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-400/20 blur-[100px] rounded-full" />
      </div>

      {/* Navbar */}
      <nav className="relative z-50 px-6 py-6 border-b border-white/5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black" style={{ backgroundColor: P, color: 'white' }}>Q</div>
            <span className="text-white font-black text-xl tracking-tighter">QuickPick <span className="text-orange-500">Partners</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-white/60 font-medium">
            <a href="#como-funciona" className="hover:text-white transition-colors">Como funciona</a>
            <a href="#ganhos" className="hover:text-white transition-colors">Ganhos</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>
          <button className="bg-white/5 hover:bg-white/10 text-white px-5 py-2.5 rounded-xl font-bold transition-all border border-white/10">Área de Afiliado</button>
        </div>
      </nav>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="px-6 pt-20 pb-20">
          <div className="max-w-6xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-bold mb-8 animate-in fade-in slide-in-from-bottom-2">
              <span className="text-lg">💰</span> Programa de Referência Exclusivo
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6 max-w-4xl mx-auto">
              Ganhe dinheiro trazendo <span className="text-orange-500">novos Parceiros</span>
            </h1>
            <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              Ajude restaurantes e quiosques a acabarem com as filas e receba uma comissão recorrente por cada estabelecimento que você indicar.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={copyLink}
                className="w-full sm:w-auto px-8 py-5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-black text-lg transition-all shadow-[0_10px_30px_rgba(236,91,19,0.3)] hover:-translate-y-1"
              >
                {copied ? 'Link Copiado! ✅' : 'Começar a Indicar Agora'}
              </button>
              <button className="w-full sm:w-auto px-8 py-5 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-black text-lg transition-all border border-white/10">
                Ver Plano de Ganhos
              </button>
            </div>
          </div>
        </section>

        {/* Benefits Cards */}
        <section className="px-6 py-20 bg-white/5 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-[40px] bg-slate-900/50 border border-white/5 transition-hover hover:border-orange-500/50 group">
              <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">📈</div>
              <h3 className="text-xl font-bold text-white mb-3 tracking-tight">Comissão Recorrente</h3>
              <p className="text-slate-500 leading-relaxed text-sm">
                Não é apenas um valor fixo. Você ganha uma porcentagem mensal da assinatura do quiosque enquanto ele estiver usando o app.
              </p>
            </div>
            <div className="p-8 rounded-[40px] bg-slate-900/50 border border-white/5 transition-hover hover:border-orange-500/50 group">
              <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">⚡</div>
              <h3 className="text-xl font-bold text-white mb-3 tracking-tight">Venda um Problema</h3>
              <p className="text-slate-500 leading-relaxed text-sm">
                Fila é prejuízo. Você está oferecendo para o dono da barraca uma forma de vender mais e atender mais rápido. É fácil de vender!
              </p>
            </div>
            <div className="p-8 rounded-[40px] bg-slate-900/50 border border-white/5 transition-hover hover:border-orange-500/50 group">
              <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">📱</div>
              <h3 className="text-xl font-bold text-white mb-3 tracking-tight">Painel Exclusivo</h3>
              <p className="text-slate-500 leading-relaxed text-sm">
                Acompanhe quem já se cadastrou, quantos pedidos eles fizeram e qual o seu saldo disponível para saque imediato.
              </p>
            </div>
          </div>
        </section>

        {/* The Offer Section */}
        <section id="ganhos" className="px-6 py-32">
          <div className="max-w-4xl mx-auto bg-gradient-to-br from-orange-600 to-orange-400 rounded-[50px] p-12 text-center text-white relative overflow-hidden shadow-2xl">
             <div className="absolute top-0 right-0 p-8 opacity-20 text-9xl">💸</div>
             <h2 className="text-3xl md:text-5xl font-black mb-6 tracking-tighter">Até 20% de Ganho</h2>
             <p className="text-white/90 text-lg mb-10 font-medium">
               Imagine colocar o QuickPick em 10 barracas na praia. <br/>
               Você constrói um salário fixo apenas ajudando as pessoas a trabalharem melhor.
             </p>
             <button className="bg-white text-orange-600 px-10 py-5 rounded-2xl font-black text-xl hover:shadow-xl hover:scale-105 transition-all">
               Quero ser um Afiliado
             </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-6 py-12 border-t border-white/5 text-center text-slate-500 text-sm">
           <p>© 2026 QuickPick Brasil • Todos os direitos reservados</p>
        </footer>
      </main>
    </div>
  );
}
