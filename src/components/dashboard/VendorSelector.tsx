'use client';

import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ui/ThemeToggle';

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
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-[#f8f6f6] dark:bg-slate-950 transition-colors">
        <div className="w-full max-w-md flex justify-end mb-4">
          <ThemeToggle />
        </div>
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-3xl bg-[#ec5b13] flex items-center justify-center text-white mx-auto shadow-lg mb-4">
             <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
             </svg>
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white leading-tight">Escolha sua Marca</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">Você possui múltiplos pontos de venda ativos.</p>
        </div>

        <div className="w-full max-w-md space-y-3">
          {vendors.map(v => (
            <button 
              key={v.id} 
              onClick={() => handleSelect(v.id)}
              className="w-full text-left bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:border-orange-200 dark:hover:border-orange-500/50 transition group flex items-center justify-between"
            >
              <div>
                <p className="font-bold text-slate-900 dark:text-white group-hover:text-[#ec5b13] transition-colors">{v.name}</p>
                {v.description && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{v.description}</p>}
              </div>
              <svg className="w-6 h-6 text-slate-300 dark:text-slate-700 group-hover:text-[#ec5b13] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
    </div>
  );
}
