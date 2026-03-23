import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ProfileForm from '@/components/profile/ProfileForm';
import LogoutButton from '@/components/ui/LogoutButton';
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

  // Busca pedidos recentes do usuário
  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id, pickup_code, status, payment_status, total_price, created_at,
      vendors (name)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  const backHref = profile?.role === 'platform_admin'
    ? '/dashboard/admin'
    : '/dashboard/vendor';

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={backHref} className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="font-bold text-gray-900">Meu Perfil</h1>
          </div>
          <LogoutButton />
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <ProfileForm profile={profile} email={user.email ?? ''} />

        {/* Histórico de pedidos */}
        {orders && orders.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Meus pedidos recentes
            </h2>
            <div className="space-y-2">
              {orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/order/${order.id}`}
                  className="bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between hover:shadow-md transition block"
                >
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      #{order.pickup_code}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(order.vendors as { name: string } | null)?.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-orange-500 text-sm">
                      R$ {Number(order.total_price).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-400 capitalize">{order.status}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
