'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Sparkles, Clock, ImageIcon, Type } from 'lucide-react';
import VendorPlansModal from './VendorPlansModal';

const P = '#ec5b13';

export default function VendorSettingsForm({ vendor }: { vendor: any }) {
  const [businessType, setBusinessType] = useState(vendor.business_type || 'kiosk');
  const [deliversToTable, setDeliversToTable] = useState(vendor.table_delivery || false);
  const [serviceFee, setServiceFee] = useState(vendor.service_fee_percentage || 0);
  const [couvert, setCouvert] = useState(vendor.couvert_fee || 0);
  const [numTables, setNumTables] = useState(vendor.num_tables || 0);
  
  const [couponCode, setCouponCode] = useState(vendor.active_coupon_code || '');
  const [couponDiscount, setCouponDiscount] = useState(vendor.discount_percentage || 0);
  const [allowWaiterCalls, setAllowWaiterCalls] = useState(vendor.allow_waiter_calls || false);
  const [aiPhotoEnabled, setAiPhotoEnabled] = useState(vendor.ai_photo_enabled || false);
  const [aiPhotoCredits] = useState(vendor.ai_photo_credits || 0);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);
  const [aiUsage, setAiUsage] = useState<{ id: string; type: string; credits_used: number; menu_item_name: string | null; prompt: string | null; created_at: string }[]>([]);
  const [usageLoading, setUsageLoading] = useState(false);
  const [showUsage, setShowUsage] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (!showUsage || aiUsage.length > 0) return;
    setUsageLoading(true);
    fetch(`/api/vendor/ai/usage?vendorId=${vendor.id}`)
      .then(r => r.json())
      .then(d => setAiUsage(d.usage || []))
      .catch(() => {})
      .finally(() => setUsageLoading(false));
  }, [showUsage, vendor.id, aiUsage.length]);

  // Carrega preferência local de som
  useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vendor_alerts_enabled');
      if (saved !== null) setAlertsEnabled(saved === 'true');
    }
  });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  // Auto-habilita entrega na mesa se for restaurante
  const handleBusinessTypeChange = (val: string) => {
    setBusinessType(val);
    if (val === 'restaurant') {
      setDeliversToTable(true);
    }
  };

  async function handleDeleteVendor() {
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch('/api/vendor/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId: vendor.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || 'Erro ao apagar marca.');
        setDeleting(false);
        return;
      }
      // Limpa cookie e redireciona
      document.cookie = 'selected_vendor_id=;path=/;max-age=0';
      router.push('/dashboard/vendor/settings');
      router.refresh();
    } catch {
      setDeleteError('Erro de conexão. Tente novamente.');
      setDeleting(false);
    }
  }

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
        allow_waiter_calls: allowWaiterCalls,
        num_tables: Number(numTables),
        ai_photo_enabled: aiPhotoEnabled,
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
      // Salva preferência de som localmente
      localStorage.setItem('vendor_alerts_enabled', String(alertsEnabled));
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      
      {/* Bloco 0: Plano e Assinatura */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-3xl shadow-xl border border-slate-700 relative overflow-hidden group">
        <Sparkles className="absolute -right-4 -top-4 w-24 h-24 text-white/5 rotate-12 group-hover:scale-110 transition-transform" />
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest mb-2">
              Plano Atual: Grátis
            </div>
            <h3 className="text-white font-black text-lg tracking-tight">Migrar para o Plano Pro</h3>
            <p className="text-slate-400 text-xs font-medium">Libere pedidos ilimitados, IA de imagens e suporte prioritário.</p>
          </div>
          <button 
            type="button" 
            onClick={() => setIsPlansModalOpen(true)}
            className="whitespace-nowrap bg-white text-slate-900 px-6 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all shadow-lg shadow-black/20"
          >
            Ver Planos
          </button>
        </div>
      </section>

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

      {/* Bloco 1.5: Preferências de Alerta */}
      <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-sm font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100 uppercase tracking-wide">Preferências de Notificação</h2>
        <label className="flex items-center gap-3 p-3 bg-orange-50/30 border border-orange-100 rounded-xl cursor-pointer hover:bg-orange-50 transition">
          <div className="relative flex items-center">
            <input 
              type="checkbox" 
              checked={alertsEnabled}
              onChange={(e) => setAlertsEnabled(e.target.checked)}
              className="peer shrink-0 appearance-none w-5 h-5 border border-orange-200 rounded-md bg-white checked:bg-orange-600 checked:border-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-colors"
            />
            <svg className="absolute w-5 h-5 text-white pointer-events-none hidden peer-checked:block p-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-800">Ativar Alertas Sonoros (Beep)</p>
            <p className="text-[11px] text-gray-500 font-medium">Toca um bipe quando novos pedidos chegarem ou quando o garçom for chamado.</p>
          </div>
        </label>
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

      {/* Bloco 2b: Configuração de Mesas */}
      {deliversToTable && (
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-orange-100">
          <h2 className="text-sm font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100 uppercase tracking-wide">2b. Configuração de Mesas</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número total de mesas do estabelecimento
            </label>
            <input
              type="number" min="0" max="500" step="1"
              value={numTables} onChange={(e) => setNumTables(Number(e.target.value))}
              placeholder="Ex: 20"
              className="w-full h-12 bg-gray-50 border border-slate-200 rounded-xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              O cliente verá botões de Mesa 1 a Mesa {numTables || 'N'}, mais a opção &quot;Para Viagem&quot;.
            </p>
          </div>
        </section>
      )}

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

      {/* Bloco 4: Inteligência Artificial de Fotos */}
      <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
           <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l2.4 7.2h7.6l-6.1 4.5 2.3 7.3-6.2-4.5-6.2 4.5 2.3-7.3-6.1-4.5h7.6z"/></svg>
        </div>
        
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
           <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">4. Inteligência Artificial de Fotos</h2>
           <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${aiPhotoEnabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
             {aiPhotoEnabled ? 'Ativo' : 'Pausado'}
           </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-orange-50/50 border border-orange-100/50">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black text-lg shadow-sm">
                {aiPhotoCredits}
              </div>
              <div>
                <p className="text-xs font-black text-slate-700 uppercase tracking-tight">Créditos Disponíveis</p>
                <p className="text-[11px] text-slate-400 font-medium">Melhore suas fotos de pratos automaticamente.</p>
              </div>
           </div>
           <button 
             type="button" 
             onClick={() => setIsPlansModalOpen(true)}
             className="px-4 py-2 bg-white border border-orange-200 text-orange-600 rounded-lg text-xs font-bold hover:bg-orange-50 transition shadow-sm"
           >
             Comprar + fotos
           </button>
        </div>

        <label className="flex items-center gap-3 p-3 mt-4 border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50 transition">
          <div className="relative flex items-center">
            <input
              type="checkbox"
              checked={aiPhotoEnabled}
              onChange={(e) => setAiPhotoEnabled(e.target.checked)}
              className="peer shrink-0 appearance-none w-5 h-5 border border-slate-300 rounded-md bg-white checked:bg-orange-600 checked:border-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-colors"
            />
            <svg className="absolute w-5 h-5 text-white pointer-events-none hidden peer-checked:block p-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-800">Habilitar Geração de Imagem com IA</p>
            <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
              O sistema pegará a foto original do prato e gerará **6 opções melhoradas** para você escolher a &quot;Foto Ideal&quot;.
              Cobra 1 crédito por item editado.
            </p>
          </div>
        </label>

        {/* Histórico de uso */}
        <button
          type="button"
          onClick={() => setShowUsage(!showUsage)}
          className="flex items-center gap-2 mt-4 text-xs font-bold text-slate-500 hover:text-orange-600 transition"
        >
          <Clock className="w-3.5 h-3.5" />
          {showUsage ? 'Ocultar histórico de uso' : 'Ver histórico de uso de créditos'}
        </button>

        {showUsage && (
          <div className="mt-3 border border-slate-100 rounded-xl overflow-hidden">
            {usageLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="w-5 h-5 border-2 border-orange-200 border-t-orange-500 animate-spin rounded-full" />
              </div>
            ) : aiUsage.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6 font-medium">Nenhum crédito utilizado ainda.</p>
            ) : (
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
                {aiUsage.map(u => (
                  <div key={u.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/50">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${u.type === 'image' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                      {u.type === 'image' ? <ImageIcon className="w-3.5 h-3.5" /> : <Type className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate">
                        {u.type === 'image' ? 'Melhoria de Foto' : 'Melhoria de Descrição'}
                        {u.menu_item_name && <span className="text-slate-400 font-medium"> — {u.menu_item_name}</span>}
                      </p>
                      {u.prompt && <p className="text-[10px] text-slate-400 truncate">{u.prompt}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-bold text-red-500">-{u.credits_used}</p>
                      <p className="text-[9px] text-slate-300">
                        {new Date(u.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Bloco 5: Zona de Perigo — Apagar Marca */}
      <section className="bg-white p-5 rounded-2xl shadow-sm border border-red-100">
        <h2 className="text-sm font-bold text-red-600 mb-3 pb-2 border-b border-red-50 uppercase tracking-wide">5. Zona de Perigo</h2>
        <p className="text-xs text-slate-500 mb-4">Ao apagar esta marca, todos os pedidos, itens do cardápio, configurações e dados associados serão permanentemente removidos.</p>

        <label className="flex items-center gap-3 p-3 border border-red-100 rounded-xl cursor-pointer hover:bg-red-50/30 transition mb-3">
          <div className="relative flex items-center">
            <input
              type="checkbox"
              checked={confirmDelete}
              onChange={(e) => setConfirmDelete(e.target.checked)}
              className="peer shrink-0 appearance-none w-5 h-5 border border-red-300 rounded-md bg-white checked:bg-red-600 checked:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-colors"
            />
            <svg className="absolute w-5 h-5 text-white pointer-events-none hidden peer-checked:block p-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-red-700">Sim, desejo apagar a marca &quot;{vendor.name}&quot;</p>
            <p className="text-[11px] text-slate-400 font-medium">Marque esta caixa para habilitar o botão de exclusão.</p>
          </div>
        </label>

        <button
          type="button"
          disabled={!confirmDelete || deleting}
          onClick={() => setShowDeleteModal(true)}
          className="w-full h-12 bg-red-600 text-white font-bold rounded-xl text-sm transition hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {deleting ? 'Apagando...' : 'Apagar Marca Permanentemente'}
        </button>
      </section>

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-red-100">
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-3">
                <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              </div>
              <h3 className="text-lg font-black text-slate-900">Tem certeza absoluta?</h3>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                Esta ação vai <span className="font-bold text-red-600">apagar permanentemente</span> a marca <span className="font-bold">&quot;{vendor.name}&quot;</span> e todos os seus dados:
              </p>
              <ul className="text-xs text-slate-500 mt-3 space-y-1 text-left w-full bg-red-50 p-3 rounded-xl">
                <li className="flex items-center gap-2"><span className="text-red-400">&#10005;</span> Todos os pedidos</li>
                <li className="flex items-center gap-2"><span className="text-red-400">&#10005;</span> Itens do cardápio e imagens</li>
                <li className="flex items-center gap-2"><span className="text-red-400">&#10005;</span> Configurações e créditos de IA</li>
                <li className="flex items-center gap-2"><span className="text-red-400">&#10005;</span> QR Codes gerados</li>
              </ul>
              <p className="text-xs text-red-600 font-bold mt-3">Os dados NÃO são recuperáveis.</p>
            </div>

            {deleteError && (
              <div className="bg-red-50 text-red-600 text-xs font-bold px-3 py-2 rounded-xl mb-4">{deleteError}</div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setShowDeleteModal(false); setDeleteError(''); }}
                className="flex-1 h-12 bg-slate-100 text-slate-600 font-bold rounded-xl text-sm transition hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteVendor}
                className="flex-1 h-12 bg-red-600 text-white font-bold rounded-xl text-sm transition hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Apagando...' : 'Apagar Tudo'}
              </button>
            </div>
          </div>
        </div>
      )}

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


      <VendorPlansModal isOpen={isPlansModalOpen} onClose={() => setIsPlansModalOpen(false)} vendorId={vendor.id} />
    </form>
  );
}
