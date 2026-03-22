import Link from 'next/link';
import { ShoppingBag, Clock, QrCode, Star, ScanLine } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <span className="text-xl font-bold text-orange-500">QuickPick</span>
        <div className="flex gap-2">
          <Link
            href="/login"
            className="text-sm text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
          >
            Entrar
          </Link>
          <Link
            href="/register"
            className="text-sm bg-orange-500 text-white px-4 py-1.5 rounded-lg hover:bg-orange-600 transition"
          >
            Começar
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 pt-16 pb-12 text-center max-w-lg mx-auto">
        <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-600 text-xs font-medium px-3 py-1 rounded-full mb-6">
          <Star className="w-3 h-3" />
          Sem app, sem fila, sem estresse
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 leading-tight mb-4">
          Peça agora,
          <br />
          <span className="text-orange-500">retire sem fila</span>
        </h1>
        <p className="text-gray-500 text-base mb-8">
          Escaneie o QR Code da barraca, escolha o que quiser e acompanhe seu pedido em tempo real.
        </p>
        {/* CTA principal — Scanner */}
        <Link
          href="/scan"
          className="flex items-center justify-center gap-3 w-full bg-orange-500 text-white font-bold px-6 py-4 rounded-2xl shadow-lg hover:bg-orange-600 transition text-lg mb-3"
        >
          <ScanLine className="w-6 h-6" />
          Escanear QR Code da barraca
        </Link>
        <p className="text-xs text-gray-400 mb-6">Abre a câmera direto — sem baixar app</p>

        <Link
          href="/register"
          className="inline-block border-2 border-orange-500 text-orange-500 font-semibold px-6 py-2.5 rounded-xl hover:bg-orange-50 transition text-sm"
        >
          Sou dono de barraca — cadastrar grátis
        </Link>
      </section>

      {/* Features */}
      <section className="px-4 py-12 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-center text-2xl font-bold text-gray-800 mb-8">
            Como funciona
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              {
                icon: QrCode,
                title: '1. Escaneia o QR',
                desc: 'Cliente escaneia o código fixado na barraca. Sem download.',
              },
              {
                icon: ShoppingBag,
                title: '2. Faz o pedido',
                desc: 'Navega no cardápio digital com fotos, preços e tempo de preparo.',
              },
              {
                icon: Clock,
                title: '3. Retira quando pronto',
                desc: 'Recebe notificação em tempo real. Vai buscar só quando estiver pronto.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-orange-500" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                <p className="text-sm text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Vendedor */}
      <section className="px-4 py-12 text-center max-w-lg mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          Para donos de barraca
        </h2>
        <p className="text-gray-500 mb-6 text-sm">
          Painel de pedidos em tempo real, gestão de cardápio, QR Code gerado automaticamente e analytics de vendas.
        </p>
        <Link
          href="/register"
          className="inline-block border-2 border-orange-500 text-orange-500 font-semibold px-8 py-3 rounded-xl hover:bg-orange-50 transition"
        >
          Ver planos e preços
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} QuickPick. Todos os direitos reservados.
      </footer>
    </main>
  );
}
