import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const vendor_id = req.nextUrl.searchParams.get('vendor_id');
  if (!vendor_id) return NextResponse.json({ error: 'vendor_id obrigatório.' }, { status: 400 });

  const { data: vendor } = await supabase
    .from('vendors').select('id, owner_id').eq('id', vendor_id).single();
  if (!vendor) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  const isPlatformAdmin = profile?.role === 'platform_admin';

  if (!isPlatformAdmin && vendor.owner_id !== user.id) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
  }

  // Busca staff com profiles (inclui phone)
  const { data, error } = await supabase.rpc('get_staff_with_profiles', {
    p_vendor_id: vendor_id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Busca emails dos usuários via admin (auth.users não é acessível via RLS)
  const staffList = (data || []) as any[];
  const userIds = staffList.map((s: any) => s.user_id).filter(Boolean);

  if (userIds.length > 0) {
    const admin = await createAdminClient();
    const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 200 });
    const emailMap = new Map<string, string>();
    authUsers?.users?.forEach(u => emailMap.set(u.id, u.email || ''));

    for (const s of staffList) {
      s.email = emailMap.get(s.user_id) || null;
    }
  }

  return NextResponse.json({ data: staffList });
}
