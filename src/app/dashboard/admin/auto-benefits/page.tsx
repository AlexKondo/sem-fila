import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AutoBenefitsClient from './AutoBenefitsClient';

export default async function AutoBenefitsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'platform_admin') redirect('/dashboard/vendor');

  return <AutoBenefitsClient />;
}
