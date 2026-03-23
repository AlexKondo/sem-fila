import Link from 'next/link';
import { Zap, BarChart3, Smartphone, Shield, Star, Check, ArrowRight, QrCode, ChefHat } from 'lucide-react';

export default function VendorsLandingPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-black text-orange-500 tracking-tight">QuickPick</Link>
        <div className="flex gap-2">
          <Link href="/login" className="text-sm text-gray-600 px-4 py-2 rounded-xl hover:bg-gray-100 transition font-medium">
            Entrar
          </Link>
          <Link href="/register" className="text-sm bg-orange-500 text-white px-4 py-2 rounded-xl hover:bg-orange-600 transition font-semibold shadow-sm">
            Começar grátis
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 px-6 pt-20 pb-24 text-white text-center">
        <div className="pointer-events-none absolute -top-32 -right-32 w-96 h-96 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-orange-400/10 blur-3xl" />

        <div className="relative max-w-2xl mx-auto">
          <span className="inline-block mb-5 px-4 py-1.5 rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold uppercase tracking-widest border border-orange-500/20">
            Para donos de barraca, quiosque e food truck
          </span>
          <h1 className="text-5xl sm:text-6xl font-black leading-[1.1] mb-6">
            Venda mais com<br />
            <span className="text-orange-400">menos esforço</span>
          </h1>
          <p className="text-gray-400 text-lg mb-10 max-w-lg mx-auto leading-relaxed">
            Configure em 5 minutos. QR Code gerado automaticamente. Receba pedidos no celular em tempo real, sem fila e sem gritaria.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-orange-500 text-white font-bold px-8 py-4 rounded-2xl shadow-lg shadow-orange-500/20 hover:bg-orange-400 transition-all text-base"
            >
              Criar conta grátis
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 border-2 border-white/10 text-gray-300 font-semibold px-8 py-4 rounded-2xl hover:border-white/30 hover:text-white transition-all text-base"
            >
              Já tenho conta
            </Link>
          </div>
          <p className="text-gray-500 text-xs mt-5">Sem cartão de crédito. Sem contrato.</p>
        </div>
      </section>

      {/* Benefícios */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-orange-500 font-bold text-sm uppercase tracking-widest mb-2">Por que o QuickPick?</p>
            <h2 className="text-3xl font-black text-gray-900">Tudo que você precisa para vender mais</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              { icon: Zap, title: 'Pedidos em tempo real', desc: 'Painel atualiza instantaneamente. Cada novo pedido aparece na tela sem precisar recarregar.' },
              { icon: QrCode, title: 'QR Code pronto em segundos', desc: 'Cole na barraca e seus clientes já conseguem pedir. Sem configuração técnica.' },
              { icon: BarChart3, title: 'Analytics de vendas', desc: 'Veja quais produtos vendem mais, horários de pico e receita diária.' },
              { icon: ChefHat, title: 'Gestão de cardápio', desc: 'Adicione fotos, preços e pause itens esgotados em tempo real, pelo celular.' },
              { icon: Smartphone, title: 'Funciona em qualquer celular', desc: 'Acesse o painel pelo navegador, sem instalar nada. iOS e Android.' },
              { icon: Shield, title: 'Pagamento online seguro', desc: 'Integrado ao Stripe. Receba antes de preparar ou na retirada — você decide.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4 p-5 rounded-2xl bg-gray-50 hover:bg-orange-50 transition-colors border border-transparent hover:border-orange-100">
                <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-orange-200">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section className="px-6 py-20 bg-orange-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-orange-500 font-bold text-sm uppercase tracking-widest mb-2">Quem já usa</p>
            <h2 className="text-3xl font-black text-gray-900">O que dizem nossos vendedores</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              {
                name: 'Mariana Costa',
                role: 'Barraca de lanches — Festa Junina SP',
                text: 'Antes eu ficava gritando pedidos e perdendo controle. Agora tudo aparece no celular organizado. As filas sumiram!',
              },
              {
                name: 'Rafael Mendes',
                role: 'Quiosque de açaí — Shopping RJ',
                text: 'Em 10 minutos já estava com o QR Code na parede e os primeiros pedidos chegando. Incrível como é simples.',
              },
              {
                name: 'Juliana Alves',
                role: 'Food truck — Festival de Música BH',
                text: 'Meu faturamento aumentou 40% porque consegui atender o dobro de clientes sem aumentar a equipe.',
              },
            ].map(({ name, role, text }) => (
              <div key={name} className="bg-white rounded-3xl p-6 shadow-sm border border-orange-100">
                <div className="flex gap-0.5 mb-4">
                  {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-5">&ldquo;{text}&rdquo;</p>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{name}</p>
                  <p className="text-xs text-gray-400">{role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="px-6 py-24 bg-white scroll-mt-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-orange-500 font-bold text-sm uppercase tracking-widest mb-2">Planos e preços</p>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-3">Comece de graça,<br />cresça quando quiser</h2>
            <p className="text-gray-500 text-base max-w-sm mx-auto">Sem contrato. Cancele quando quiser. Sem taxa de adesão.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-start">
            {/* Grátis */}
            <div className="rounded-3xl border-2 border-gray-100 p-7 flex flex-col">
              <p className="font-bold text-gray-900 mb-1">Grátis</p>
              <div className="flex items-end gap-1 mb-3">
                <span className="text-4xl font-black text-gray-900">R$0</span>
                <span className="text-gray-400 text-sm mb-1">/mês</span>
              </div>
              <p className="text-sm text-gray-400 mb-6">Para testar e conhecer a plataforma.</p>
              <ul className="space-y-3 mb-8 flex-1">
                {['1 barraca', 'Até 50 pedidos/mês', 'QR Code gerado', 'Cardápio digital', 'Suporte por email'].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="block text-center border-2 border-gray-200 text-gray-700 font-semibold py-3 rounded-2xl hover:border-orange-300 hover:text-orange-600 transition text-sm">
                Começar grátis
              </Link>
            </div>

            {/* Pro */}
            <div className="rounded-3xl border-2 border-orange-500 p-7 flex flex-col relative shadow-xl shadow-orange-100">
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
                Mais popular
              </span>
              <p className="font-bold text-gray-900 mb-1">Pro</p>
              <div className="flex items-end gap-1 mb-3">
                <span className="text-4xl font-black text-gray-900">R$79</span>
                <span className="text-gray-400 text-sm mb-1">/mês</span>
              </div>
              <p className="text-sm text-gray-400 mb-6">Para quem quer escalar as vendas.</p>
              <ul className="space-y-3 mb-8 flex-1">
                {['Até 3 barracas', 'Pedidos ilimitados', 'Pagamento online (Stripe)', 'Analytics avançado', 'Notificações por email', 'Suporte prioritário'].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                    <Check className="w-4 h-4 text-orange-500 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="block text-center bg-orange-500 text-white font-bold py-3 rounded-2xl hover:bg-orange-600 transition text-sm shadow-md shadow-orange-200">
                Assinar agora
              </Link>
            </div>

            {/* Enterprise */}
            <div className="rounded-3xl border-2 border-gray-800 p-7 flex flex-col bg-gray-950 text-white">
              <p className="font-bold mb-1">Enterprise</p>
              <div className="flex items-end gap-1 mb-3">
                <span className="text-4xl font-black">Custom</span>
              </div>
              <p className="text-sm text-gray-400 mb-6">Para eventos e redes com múltiplas barracas.</p>
              <ul className="space-y-3 mb-8 flex-1">
                {['Barracas ilimitadas', 'Multi-evento', 'API dedicada', 'SLA garantido', 'Gerente de conta', 'Onboarding personalizado'].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-orange-400 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <a href="mailto:contato@quickpick.com.br" className="block text-center border-2 border-white/20 text-white font-semibold py-3 rounded-2xl hover:bg-white/10 transition text-sm">
                Falar com vendas
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="px-6 py-20 bg-gradient-to-br from-orange-500 to-amber-500 text-white text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black mb-4">Pronto para começar?</h2>
          <p className="text-white/80 mb-8 text-base">Configure sua barraca em 5 minutos e comece a receber pedidos hoje.</p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-orange-600 font-bold px-8 py-4 rounded-2xl hover:bg-orange-50 transition shadow-lg text-base"
          >
            Criar conta grátis
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
        <Link href="/" className="font-black text-gray-700 text-sm">QuickPick</Link>
        <span>© {new Date().getFullYear()} QuickPick. Todos os direitos reservados.</span>
        <div className="flex gap-4">
          <a href="#" className="hover:text-gray-600 transition">Privacidade</a>
          <a href="#" className="hover:text-gray-600 transition">Termos</a>
          <a href="mailto:contato@quickpick.com.br" className="hover:text-gray-600 transition">Contato</a>
        </div>
      </footer>
    </main>
  );
}
