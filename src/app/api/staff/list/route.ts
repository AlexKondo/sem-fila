import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const vendor_id = req.nextUrl.searchParams.get('vendor_id');
  if (!vendor_id) return NextResponse.json({ error: 'vendor_id obrigatório.' }, { status: 400 });

  // Confirma acesso: vendor owner ou platform_admin
  // A RLS de vendors já filtra: owner_id = auth.uid() OU platform_admin OU active=true
  // A RLS de staff_schedules garante que só retorna dados do próprio vendor do usuário
  const { data: vendor } = await supabase
    .from('vendors').select('id, owner_id').eq('id', vendor_id).single();
  if (!vendor) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  const isPlatformAdmin = profile?.role === 'platform_admin';

  if (!isPlatformAdmin && vendor.owner_id !== user.id) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
  }

  const { data: schedules, error } = await supabase
    .from('staff_schedules')
    .select('*')
    .eq('vendor_id', vendor_id)
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userIds = (schedules || []).map((s: any) => s.user_id).filter(Boolean);
  const { data: profiles } = userIds.length
    ? await supabase.from('profiles').select('id, full_name, name, role').in('id', userIds)
    : { data: [] };

  const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]));
  const data = (schedules || []).map((s: any) => ({ ...s, profiles: profileMap[s.user_id] || null }));

  return NextResponse.json({ data });
}
