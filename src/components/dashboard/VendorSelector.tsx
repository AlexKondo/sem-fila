'use client';

import { useRouter } from 'next/navigation';

interface VendorSelectorProps {
  vendors: {
    id: string;
    name: string;
    description: string | null;
  }[];
}

export default function VendorSelector({ vendors }: VendorSelectorProps) {
  const router = useRouter();

  function handleSelect(vendorId: string) {
    // Salva o ID da barraca nos cookies para o backend ler
    document.cookie = `selected_vendor_id=${vendorId}; path=/; max-age=86400`; // 24h
    window.location.reload();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: '#f8f6f6' }}>
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-3xl bg-[#ec5b13] flex items-center justify-center text-white mx-auto shadow-lg mb-3">
             <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
             </svg>
          </div>
          <h1 className="text-2xl font-black text-slate-900 leading-tight">Escolha sua Marca</h1>
          <p className="text-sm text-slate-400 mt-1">Você possui múltiplos pontos de venda ativos.</p>
        </div>

        <div className="space-y-3">
          {vendors.map(v => (
            <button 
              key={v.id} 
              onClick={() => handleSelect(v.id)}
              className="w-full text-left bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:border-orange-200 transition group flex items-center justify-between"
            >
              <div>
                <p className="font-bold text-slate-900 group-hover:text-[#ec5b13] transition-colors">{v.name}</p>
                {v.description && <p className="text-xs text-slate-400 mt-0.5">{v.description}</p>}
              </div>
              <svg className="w-5 h-5 text-slate-300 group-hover:text-[#ec5b13] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
