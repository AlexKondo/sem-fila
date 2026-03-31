import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ProfileForm from '@/components/profile/ProfileForm';
import BottomNav from '@/components/ui/BottomNav';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const backHref = profile?.role === 'platform_admin'
    ? '/dashboard/admin'
    : profile?.role === 'customer'
    ? '/scan'
    : '/dashboard/vendor';

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 px-4 py-3 flex items-center gap-3">
        <Link href={backHref} className="p-2 rounded-full hover:bg-slate-50 text-slate-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-bold text-slate-900">Meu Perfil</h1>
      </header>

      <div className="max-w-lg mx-auto w-full px-4 py-6 flex-1">
        <ProfileForm profile={profile} email={user.email ?? ''} />
      </div>
      <BottomNav />
    </main>
  );
}
