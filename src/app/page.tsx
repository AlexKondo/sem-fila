import Link from 'next/link';
import { QrCode, ShoppingBag, Clock, ScanLine, Check, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Header — minimalista, foco no cliente */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-3 flex items-center justify-between">
        <span className="text-xl font-black text-orange-500 tracking-tight">QuickPick</span>
        <Link
          href="/para-vendedores"
          className="text-xs text-gray-400 hover:text-orange-500 transition font-medium"
        >
          Para vendedores →
        </Link>
      </header>

      {/* Hero — cliente escaneia e pede */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-white to-amber-50 px-6 pt-20 pb-24 text-center">
        <div className="pointer-events-none absolute -top-32 -right-32 w-96 h-96 rounded-full bg-orange-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-amber-200/40 blur-3xl" />

        <div className="relative max-w-lg mx-auto">
          <h1 className="text-5xl sm:text-6xl font-black text-gray-900 leading-[1.1] mb-5">
            Peça agora,<br />
            <span className="text-orange-500">retire sem fila</span>
          </h1>
          <p className="text-gray-500 text-lg mb-10 leading-relaxed">
            Escaneie o QR Code da barraca, escolha o que quiser e acompanhe seu pedido em tempo real.
          </p>

          <Link
            href="/scan"
            className="inline-flex items-center justify-center gap-3 bg-orange-500 text-white font-bold px-8 py-5 rounded-2xl shadow-xl shadow-orange-200 hover:bg-orange-600 transition-all text-lg w-full sm:w-auto"
          >
            <ScanLine className="w-6 h-6" />
            Escanear QR Code da barraca
          </Link>

          <div className="mt-8 flex items-center justify-center gap-5 text-sm text-gray-400 flex-wrap">
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-green-500" /> Sem download</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-green-500" /> Grátis para clientes</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-green-500" /> Tempo real</span>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-orange-500 font-bold text-sm uppercase tracking-widest mb-2">Simples assim</p>
            <h2 className="text-3xl font-black text-gray-900">Como funciona</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: QrCode, step: '01', title: 'Escaneia o QR', desc: 'Aponte a câmera para o código fixado na barraca. Sem download, sem cadastro prévio.' },
              { icon: ShoppingBag, step: '02', title: 'Faz o pedido', desc: 'Navega no cardápio com fotos e preços, adiciona ao carrinho e confirma.' },
              { icon: Clock, step: '03', title: 'Retira quando pronto', desc: 'Acompanhe o status em tempo real. Vá buscar só quando estiver pronto.' },
            ].map(({ icon: Icon, step, title, desc }) => (
              <div key={step} className="relative group p-6 bg-gray-50 rounded-3xl hover:bg-orange-50 transition-colors border border-transparent hover:border-orange-100">
                <span className="text-5xl font-black text-orange-100 group-hover:text-orange-200 transition-colors leading-none">{step}</span>
                <div className="mt-3 w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center mb-4 shadow-md shadow-orange-200">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final — vendedores */}
      <section className="px-6 py-16 bg-gray-950 text-white text-center">
        <div className="max-w-lg mx-auto">
          <p className="text-orange-400 font-bold text-sm uppercase tracking-widest mb-3">Dono de barraca?</p>
          <h2 className="text-2xl sm:text-3xl font-black mb-4">
            Receba pedidos pelo celular<br />e acabe com a fila
          </h2>
          <p className="text-gray-400 text-sm mb-8">
            QR Code gerado na hora, cardápio digital, painel de pedidos em tempo real e pagamento online.
          </p>
          <Link
            href="/para-vendedores"
            className="inline-flex items-center gap-2 bg-orange-500 text-white font-bold px-8 py-4 rounded-2xl hover:bg-orange-600 transition shadow-lg"
          >
            Conhecer o QuickPick para vendedores
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6 px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
        <span className="font-black text-gray-700 text-sm">QuickPick</span>
        <span>© {new Date().getFullYear()} QuickPick. Todos os direitos reservados.</span>
        <div className="flex gap-4">
          <Link href="/para-vendedores" className="hover:text-gray-600 transition">Para vendedores</Link>
          <Link href="/login" className="hover:text-gray-600 transition">Entrar</Link>
        </div>
      </footer>
    </main>
  );
}
