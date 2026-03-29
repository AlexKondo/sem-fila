import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PremiumFeaturesClient from './PremiumFeaturesClient';

export default async function PremiumFeaturesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'platform_admin') redirect('/dashboard/vendor');

  return <PremiumFeaturesClient />;
}
