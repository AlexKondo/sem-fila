import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import VendorSettingsForm from '@/components/dashboard/VendorSettingsForm';
import VendorAccountForm from '@/components/dashboard/VendorAccountForm';
import Link from 'next/link';

const P = '#ec5b13';

export default async function VendorSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [profileRes, vendorsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('vendors').select('*').eq('owner_id', user.id).eq('active', true)
  ]);

  const profile = profileRes.data;
  const vendors = vendorsRes.data || [];

  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const selectedId = cookieStore.get('selected_vendor_id')?.value;

  const vendor = selectedId 
    ? vendors.find(v => v.id === selectedId) || vendors[0]
    : vendors[0] || null;

  if (!vendor) redirect('/dashboard/vendor');

  return (
    <main className="min-h-screen pb-20 overflow-x-hidden" style={{ backgroundColor: '#f8f6f6' }}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        
        {/* Bloco 1: Meus Negócios */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Meus Negócios ({vendors.length})</h2>
            <Link href="/dashboard/vendor" className="text-xs font-bold text-orange-600 hover:underline transition">Nova Marca +</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {vendors.map(v => (
              <div 
                key={v.id} 
                className={`p-4 rounded-2xl border transition shadow-sm ${v.id === vendor.id ? 'bg-orange-600 border-orange-500 shadow-orange-300/50' : 'bg-white border-slate-100 hover:border-orange-200'}`}
              >
                 <div className="flex justify-between items-start">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center mb-3">
                       <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    </div>
                    {v.id === vendor.id && <span className="text-[10px] font-black uppercase text-orange-200 bg-orange-700/50 px-2 py-0.5 rounded-full">Atual</span>}
                 </div>
                 <h3 className={`font-bold text-sm ${v.id === vendor.id ? 'text-white' : 'text-slate-800'}`}>{v.name}</h3>
                 <p className={`text-[11px] mb-3 ${v.id === vendor.id ? 'text-orange-100/70' : 'text-slate-400 font-medium'}`}>{v.description || 'Nenhuma descrição'}</p>
                 
                 {v.id !== vendor.id && (
                   <form action={async () => {
                     'use server';
                     const { cookies } = await import('next/headers');
                     const { redirect } = await import('next/navigation');
                     const cookieStore = await cookies();
                     cookieStore.set('selected_vendor_id', v.id, { path: '/', maxAge: 86400 });
                     redirect('/dashboard/vendor/settings');
                   }}>
                     <button 
                       type="submit"
                       className="w-full h-8 rounded-lg bg-orange-50 text-orange-600 text-[11px] font-bold transition hover:bg-orange-100"
                     >
                       Gerenciar
                     </button>
                   </form>
                 )}
              </div>
            ))}
          </div>
        </section>

        {/* Bloco 2: Minha Conta */}
        <div className="mb-10">
          <VendorAccountForm profile={profile} />
        </div>

        {/* Bloco 3: Configurações da Marca Selecionada */}
        <section>
          <div className="mb-6 px-2">
            <h2 className="text-xl font-bold text-slate-900">Configurações para "{vendor.name}"</h2>
            <p className="text-sm text-slate-500 font-medium">Ajuste as taxas e regras específicas do seu ponto de venda atual.</p>
          </div>
          <VendorSettingsForm vendor={vendor} />
        </section>
      </div>
    </main>
  );
}
