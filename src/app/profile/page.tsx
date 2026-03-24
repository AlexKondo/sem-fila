import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ProfileForm from '@/components/profile/ProfileForm';
import LogoutButton from '@/components/ui/LogoutButton';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, ShoppingBag, User, CreditCard, Heart, LogOut } from 'lucide-react';

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const params = await searchParams;
  const isEditing = params.edit === 'true';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const isCustomer = profile?.role === 'customer';

  const backHref = profile?.role === 'platform_admin'
    ? '/dashboard/admin'
    : isCustomer
    ? '/scan'
    : '/dashboard/vendor';

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={isEditing ? '/profile' : backHref} className="p-2 rounded-full hover:bg-slate-50 text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-bold text-slate-900">{isEditing ? 'Editar Perfil' : 'Ajustes'}</h1>
        </div>
        {!isEditing && <LogoutButton />}
      </header>

      <div className="max-w-lg mx-auto w-full px-4 py-6 flex-1 flex flex-col">
        {isCustomer && !isEditing ? (
          <div className="space-y-6 flex-1 flex flex-col">
            {/* Boas-vindas / Card Principal */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-50 flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-orange-500 flex items-center justify-center text-white text-2xl font-black select-none shadow-lg shadow-orange-100">
                {profile?.name ? profile.name[0].toUpperCase() : '?'}
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Cliente</p>
                <p className="font-black text-xl text-slate-900 leading-tight">{profile?.name || 'Seu Nome'}</p>
                <p className="text-sm text-slate-400 mt-0.5">{user.email}</p>
              </div>
            </div>

            {/* Menu de Opções / Dashboard Dashboard */}
            <div className="space-y-2 flex-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2 mt-4 mb-2">Geral</p>
              
              <Link href="/order" className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-slate-50 hover:bg-slate-50 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-orange-50 text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-slate-700">Meus Pedidos</span>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300" />
              </Link>

              <Link href="/profile?edit=true" className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-slate-50 hover:bg-slate-50 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <User className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-slate-700">Meus Dados</span>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300" />
              </Link>

              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2 mt-6 mb-2">Preferências</p>

              <button className="w-full flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-slate-50 opacity-60 cursor-not-allowed">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-pink-50 text-pink-500">
                    <Heart className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-slate-700">Favoritos</span>
                </div>
                <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">Em breve</span>
              </button>

              <button className="w-full flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-slate-50 opacity-60 cursor-not-allowed">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-500">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-slate-700">Pagamentos</span>
                </div>
                <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">Em breve</span>
              </button>
            </div>

            {/* Link para voltar ao scan ativo na barra */}
            <Link href="/scan" className="block text-center w-full py-4 bg-orange-500 text-white rounded-2xl font-bold font-lg shadow-xl shadow-orange-100 hover:bg-orange-600 transition">
              Pedir agora (Abrir Câmera)
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <ProfileForm profile={profile} email={user.email ?? ''} />
          </div>
        )}
      </div>
    </main>
  );
}
