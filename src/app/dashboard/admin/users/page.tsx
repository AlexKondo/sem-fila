import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import UsersManager from '@/components/admin/UsersManager';

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'platform_admin') redirect('/dashboard/vendor');

  const { data: users } = await supabase
    .from('profiles')
    .select('id, name, email, phone, cpf, birthday, role, created_at')
    .order('created_at', { ascending: false });

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard/admin" className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-bold text-gray-900 dark:text-white">Usuários & Cargos</h1>
        </div>
      </header>

      <UsersManager initialUsers={users ?? []} currentUserId={user.id} />
    </main>
  );
}
