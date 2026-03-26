'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Save, ShieldCheck, Zap, Percent, Calendar } from 'lucide-react';

const P = '#ec5b13';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(false);
  
  // Estados simulados de configuração do sistema
  const [platformFee, setPlatformFee] = useState(10); // % por pedido
  const [monthlySubscription, setMonthlySubscription] = useState(199.90); // Valor mensal
  const [affiliateComission, setAffiliateComission] = useState(15); // % para o afiliado
  
  async function handleSave() {
    setLoading(true);
    // Simulação de salvamento no Supabase (configurações globais)
    setTimeout(() => {
      setLoading(false);
      alert('Configurações salvas com sucesso!');
    }, 1000);
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/admin" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-900 transition">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <h1 className="font-bold text-gray-900 leading-none">Planos e Preços</h1>
          </div>
          <button 
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-800 transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Seção 1: Taxas do Sistema */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Percent className="w-4 h-4 text-orange-500" />
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">Taxas de Intermediação</h2>
          </div>
          <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="font-bold text-gray-900 mb-1">Taxa por Pedido (QuickPick Fee)</p>
                <p className="text-xs text-gray-400">Porcentagem retida de cada venda feita em quiosques parceiros.</p>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  value={platformFee} 
                  onChange={(e) => setPlatformFee(Number(e.target.value))}
                  className="w-24 h-12 bg-gray-50 border border-gray-100 rounded-xl px-4 text-center font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <span className="font-bold text-gray-400">%</span>
              </div>
            </div>
          </div>
        </section>

        {/* Seção 2: Mensalidades */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-orange-500" />
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">Assinaturas</h2>
          </div>
          <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="font-bold text-gray-900 mb-1">Valor do Plano Pro (Mensal)</p>
                <p className="text-xs text-gray-400">Valor fixo cobrado dos estabelecimentos mensalmente.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-400">R$</span>
                <input 
                  type="number" 
                  value={monthlySubscription} 
                  onChange={(e) => setMonthlySubscription(Number(e.target.value))}
                  className="w-32 h-12 bg-gray-50 border border-gray-100 rounded-xl px-4 text-center font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3 italic">
               <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0" />
               <p className="text-xs text-blue-600 leading-relaxed">
                 As cobranças são processadas automaticamente via Stripe Billing. Alterar este valor afetará novos assinantes imediatamente. Assinantes antigos poderão ser notificados sobre o reajuste.
               </p>
            </div>
          </div>
        </section>

        {/* Seção 3: Programa de Afiliados */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-orange-500" />
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">Programa de Afiliados</h2>
          </div>
          <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="font-bold text-gray-900 mb-1">Comissão de Indicação</p>
                <p className="text-xs text-gray-400">Parte da taxa do QuickPick que é repassada para quem indicou o quiosque.</p>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  value={affiliateComission} 
                  onChange={(e) => setAffiliateComission(Number(e.target.value))}
                  className="w-24 h-12 bg-gray-50 border border-gray-100 rounded-xl px-4 text-center font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <span className="font-bold text-gray-400">%</span>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
