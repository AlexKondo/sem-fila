import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminSettingsClient from './AdminSettingsClient';

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'platform_admin') redirect('/dashboard/vendor');

  return <AdminSettingsClient />;
}
