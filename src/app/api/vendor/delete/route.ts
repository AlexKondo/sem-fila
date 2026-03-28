import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const { vendorId } = await req.json();
  if (!vendorId) {
    return NextResponse.json({ error: 'vendorId é obrigatório.' }, { status: 400 });
  }

  // Verifica que o vendor pertence ao usuário
  const { data: vendor, error: vendorErr } = await supabase
    .from('vendors')
    .select('id, owner_id')
    .eq('id', vendorId)
    .single();

  if (vendorErr || !vendor) {
    return NextResponse.json({ error: 'Marca não encontrada.' }, { status: 404 });
  }

  if (vendor.owner_id !== user.id) {
    return NextResponse.json({ error: 'Você não tem permissão para apagar esta marca.' }, { status: 403 });
  }

  // Apaga registros relacionados na ordem correta (filhos antes do pai)
  // Cada delete pode falhar silenciosamente se a tabela não existir ou não tiver dados
  const tables = [
    'order_items',
    'orders',
    'menu_items',
    'ai_credits_usage',
    'waiter_calls',
  ];

  for (const table of tables) {
    // order_items precisa de join via orders
    if (table === 'order_items') {
      const { data: orderIds } = await supabase
        .from('orders')
        .select('id')
        .eq('vendor_id', vendorId);
      if (orderIds && orderIds.length > 0) {
        await supabase
          .from('order_items')
          .delete()
          .in('order_id', orderIds.map(o => o.id));
      }
    } else {
      await supabase.from(table).delete().eq('vendor_id', vendorId);
    }
  }

  // Finalmente apaga o vendor
  const { error: deleteErr } = await supabase
    .from('vendors')
    .delete()
    .eq('id', vendorId);

  if (deleteErr) {
    return NextResponse.json(
      { error: `Erro ao apagar: ${deleteErr.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
