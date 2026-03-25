'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const P = '#ec5b13';

export default function VendorSettingsForm({ vendor }: { vendor: any }) {
  const [businessType, setBusinessType] = useState(vendor.business_type || 'kiosk');
  const [deliversToTable, setDeliversToTable] = useState(vendor.table_delivery || false);
  const [serviceFee, setServiceFee] = useState(vendor.service_fee_percentage || 0);
  const [couvert, setCouvert] = useState(vendor.couvert_fee || 0);
  
  const [couponCode, setCouponCode] = useState(vendor.active_coupon_code || '');
  const [couponDiscount, setCouponDiscount] = useState(vendor.discount_percentage || 0);
  const [allowWaiterCalls, setAllowWaiterCalls] = useState(vendor.allow_waiter_calls || false);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  // Auto-habilita entrega na mesa se for restaurante
  const handleBusinessTypeChange = (val: string) => {
    setBusinessType(val);
    if (val === 'restaurant') {
      setDeliversToTable(true);
    }
  };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg({ text: '', type: '' });

    const supabase = createClient();
    
    // Tenta atualizar. Se as colunas não existirem, dará erro 400.
    const { error } = await supabase
      .from('vendors')
      .update({
        business_type: businessType,
        table_delivery: deliversToTable,
        service_fee_percentage: Number(serviceFee),
        couvert_fee: Number(couvert),
        active_coupon_code: couponCode.trim() || null,
        discount_percentage: Number(couponDiscount),
        allow_waiter_calls: allowWaiterCalls
      })
      .eq('id', vendor.id);

    setLoading(false);

    if (error) {
      if (error.message.includes("Could not find the 'business_type' column")) {
        setMsg({ text: 'Por favor, rode as Atualizações no SQL Editor do Supabase primeiro!', type: 'error' });
      } else {
        setMsg({ text: `Erro ao salvar: ${error.message}`, type: 'error' });
      }
    } else {
      setMsg({ text: 'Configurações salvas com sucesso!', type: 'success' });
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      
      {/* Bloco 1: Operação e Logística */}
      <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-sm font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100 uppercase tracking-wide">1. Operação e Logística</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Qual é o seu tipo de negócio?</label>
            <select
              value={businessType}
              onChange={(e) => handleBusinessTypeChange(e.target.value)}
              className="w-full h-12 bg-gray-50 border border-slate-200 rounded-xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            >
              <option value="kiosk">Quiosque / Barraca em Evento</option>
              <option value="restaurant">Restaurante Tradicional</option>
              <option value="bar">Bar / Pub</option>
              <option value="foodtruck">Food Truck</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">Ao escolher "Restaurante", a entrega na mesa é ativada automaticamente.</p>
          </div>

          <label className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50 transition">
            <div className="relative flex items-center">
              <input 
                type="checkbox" 
                checked={deliversToTable}
                onChange={(e) => setDeliversToTable(e.target.checked)}
                className="peer shrink-0 appearance-none w-5 h-5 border border-slate-300 rounded-md bg-white checked:bg-orange-500 checked:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-colors"
                disabled={businessType === 'restaurant'}
              />
              <svg className="absolute w-5 h-5 text-white pointer-events-none hidden peer-checked:block p-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-700">Fazemos entrega até a mesa</p>
              <p className="text-xs text-gray-400">Ative se você possui garçons que cruzam o evento ou salão.</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50 transition border-l-4 border-l-orange-500">
            <div className="relative flex items-center">
              <input 
                type="checkbox" 
                checked={allowWaiterCalls}
                onChange={(e) => setAllowWaiterCalls(e.target.checked)}
                className="peer shrink-0 appearance-none w-5 h-5 border border-slate-300 rounded-md bg-white checked:bg-orange-500 checked:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-colors"
              />
              <svg className="absolute w-5 h-5 text-white pointer-events-none hidden peer-checked:block p-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-700">Ativar a função CHAMAR GARÇOM</p>
              <p className="text-[11px] text-orange-600 font-medium">Faz o celular do garçom vibrar e piscar um alarme na tela por 5 segundos</p>
            </div>
          </label>
        </div>
      </section>

      {/* Bloco 2: Cobranças */}
      <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-sm font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100 uppercase tracking-wide">2. Cobranças e Taxas</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tarifa de Serviço / Gorjeta (%)</label>
            <div className="relative">
              <input
                type="number" min="0" max="100" step="1"
                value={serviceFee} onChange={(e) => setServiceFee(e.target.value)}
                placeholder="Ex: 10"
                className="w-full h-12 bg-gray-50 border border-slate-200 rounded-xl pl-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Comum em restaurantes (0% = sem taxa).</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Couvert Artístico (R$ fixo)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">R$</span>
              <input
                type="number" min="0" step="0.5"
                value={couvert} onChange={(e) => setCouvert(e.target.value)}
                placeholder="0.00"
                className="w-full h-12 bg-gray-50 border border-slate-200 rounded-xl pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Soma-se um valor fixo a cada conta/pessoa.</p>
          </div>
        </div>
      </section>

      {/* Bloco 3: Cupons e Ofertas */}
      <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-sm font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100 uppercase tracking-wide">3. Vendas e Descontos</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          <div className="sm:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Código de Cupom Global</label>
            <input
              type="text" maxLength={20}
              value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="Ex: QUINTA10"
              className="w-full h-12 bg-gray-50 border border-slate-200 rounded-xl px-4 text-sm font-bold uppercase focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-gray-300"
            />
            <p className="text-[10px] text-gray-400 mt-1">Se os clientes digitarem isto, ganham desconto.</p>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Desconto (%)</label>
            <div className="relative">
              <input
                type="number" min="0" max="100" step="5"
                value={couponDiscount} onChange={(e) => setCouponDiscount(e.target.value)}
                placeholder="Ex: 10"
                className="w-full h-12 bg-gray-50 border border-slate-200 rounded-xl pl-4 pr-10 text-sm font-bold text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-orange-600 font-bold text-sm">%</span>
            </div>
          </div>
        </div>
      </section>

      {/* Alertas */}
      {msg.text && (
        <div className={`p-4 rounded-xl text-sm font-medium ${msg.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
          {msg.text}
        </div>
      )}

      {/* Botão de Salvar */}
      <button
        type="submit"
        disabled={loading}
        className="w-full h-14 font-black rounded-xl text-white shadow-lg transition-all disabled:opacity-50 mt-4 uppercase tracking-widest text-sm"
        style={{ backgroundColor: P, boxShadow: `0 4px 15px ${P}40` }}
      >
        {loading ? 'Salvando...' : 'Salvar Alterações'}
      </button>

    </form>
  );
}
