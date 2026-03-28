import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const vendorId = searchParams.get('vendorId');
  if (!vendorId) return NextResponse.json({ error: 'vendorId obrigatório.' }, { status: 400 });

  // Verifica ownership
  const { data: vendor } = await supabase
    .from('vendors')
    .select('id')
    .eq('id', vendorId)
    .eq('owner_id', user.id)
    .single();

  if (!vendor) return NextResponse.json({ error: 'Estabelecimento não encontrado.' }, { status: 404 });

  // Busca últimos 50 registros de uso
  const { data: usage } = await supabase
    .from('ai_photo_usage')
    .select('id, type, credits_used, menu_item_name, prompt, created_at')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })
    .range(0, 49);

  return NextResponse.json({ usage: usage || [] });
}
