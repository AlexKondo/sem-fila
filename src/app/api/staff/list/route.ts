import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const vendor_id = req.nextUrl.searchParams.get('vendor_id');
  if (!vendor_id) return NextResponse.json({ error: 'vendor_id obrigatório.' }, { status: 400 });

  // Confirma que o vendor pertence ao usuário
  const { data: vendor } = await supabase
    .from('vendors').select('id').eq('id', vendor_id).eq('owner_id', user.id).single();
  if (!vendor) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });

  // Usa admin client para bypassar RLS
  const admin = await createAdminClient();
  const { data, error } = await admin
    .from('staff_schedules')
    .select('*, profiles(id, full_name, name, role)')
    .eq('vendor_id', vendor_id)
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
