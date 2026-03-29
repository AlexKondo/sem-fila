import { SupabaseClient } from '@supabase/supabase-js';

const STAFF_ROLES = ['waitstaff', 'deliverer', 'org_admin'];

/**
 * Resolve o vendor para o usuário atual (owner ou staff).
 * Retorna o vendor selecionado via cookie, ou o primeiro disponível.
 * Para staff, busca o vendor via staff_schedules.
 */
export async function resolveVendor(
  supabase: SupabaseClient,
  userId: string,
  options?: { select?: string }
) {
  const select = options?.select || '*';

  // Busca perfil + vendors em paralelo
  const [profileRes, vendorsRes] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', userId).single(),
    supabase.from('vendors').select(select).eq('owner_id', userId)
  ]);

  const userRole = profileRes.data?.role || 'vendor';
  const isStaff = STAFF_ROLES.includes(userRole);
  let vendors: any[] = (vendorsRes.data || []) as any[];

  // Staff: busca vendor via staff_schedules
  if (isStaff && vendors.length === 0) {
    const { data: staffSchedule } = await supabase
      .from('staff_schedules')
      .select('vendor_id, vendors(*)')
      .eq('user_id', userId)
      .eq('active', true)
      .limit(1)
      .single() as { data: any };

    if (staffSchedule?.vendors) {
      vendors = [staffSchedule.vendors];
    }
  }

  // Resolve cookie
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const selectedId = cookieStore.get('selected_vendor_id')?.value;

  const vendor = selectedId
    ? vendors.find((v: any) => v.id === selectedId) || vendors[0]
    : vendors[0] || null;

  return { vendor: vendor as any, vendors, userRole, isStaff };
}
