import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  let body: {
    vendorId: string;
    menuItemId?: string;
    menuItemName?: string;
    type: 'image' | 'description';
    prompt?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
  }

  const { vendorId, menuItemId, menuItemName, type, prompt } = body;
  if (!vendorId || !type) {
    return NextResponse.json({ error: 'vendorId e type são obrigatórios.' }, { status: 400 });
  }

  // Verifica ownership do vendor
  const { data: vendor } = await supabase
    .from('vendors')
    .select('id, ai_photo_enabled, ai_photo_credits')
    .eq('id', vendorId)
    .eq('owner_id', user.id)
    .single();

  if (!vendor) {
    return NextResponse.json({ error: 'Estabelecimento não encontrado.' }, { status: 404 });
  }

  if (!vendor.ai_photo_enabled) {
    return NextResponse.json({ error: 'IA não está habilitada. Ative nas configurações.' }, { status: 403 });
  }

  if ((vendor.ai_photo_credits || 0) < 1) {
    return NextResponse.json({ error: 'Créditos insuficientes. Compre mais créditos.' }, { status: 403 });
  }

  // Deduz 1 crédito
  const newCredits = (vendor.ai_photo_credits || 0) - 1;
  const { error: updateError } = await supabase
    .from('vendors')
    .update({ ai_photo_credits: newCredits })
    .eq('id', vendorId);

  if (updateError) {
    return NextResponse.json({ error: 'Erro ao deduzir crédito.' }, { status: 500 });
  }

  // Registra o uso
  await supabase.from('ai_photo_usage').insert({
    vendor_id: vendorId,
    menu_item_id: menuItemId || null,
    menu_item_name: menuItemName || null,
    type,
    credits_used: 1,
    prompt: prompt || null,
  });

  return NextResponse.json({
    remaining_credits: newCredits,
  });
}
