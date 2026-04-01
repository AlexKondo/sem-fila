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
    <main className="h-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 shrink-0 px-4 py-3 flex items-center gap-3 z-40">
        <Link href={backHref} className="p-2 rounded-full hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-bold text-slate-900 dark:text-white">Meu Perfil</h1>
      </header>

      <div className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-lg mx-auto w-full px-4 py-6">
          <ProfileForm profile={profile} email={user.email ?? ''} />
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
