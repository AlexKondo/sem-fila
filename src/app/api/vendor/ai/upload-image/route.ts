import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  let body: { imageUrl: string; vendorId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
  }

  const { imageUrl, vendorId } = body;
  if (!imageUrl || !vendorId) {
    return NextResponse.json({ error: 'imageUrl e vendorId são obrigatórios.' }, { status: 400 });
  }

  // Verifica ownership
  const { data: vendor } = await supabase
    .from('vendors')
    .select('id')
    .eq('id', vendorId)
    .eq('owner_id', user.id)
    .single();

  if (!vendor) {
    return NextResponse.json({ error: 'Estabelecimento não encontrado.' }, { status: 404 });
  }

  try {
    // Download da imagem externa
    const res = await fetch(imageUrl);
    if (!res.ok) {
      return NextResponse.json({ error: 'Não foi possível baixar a imagem.' }, { status: 502 });
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const buffer = await res.arrayBuffer();

    // Determina extensão
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    const ext = extMap[contentType] || 'jpg';
    const fileName = `${vendorId}/${Date.now()}-ai.${ext}`;

    // Upload pro Supabase Storage
    const { error: uploadError } = await supabase
      .storage
      .from('menu-items')
      .upload(fileName, Buffer.from(buffer), {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: `Erro no upload: ${uploadError.message}` }, { status: 500 });
    }

    // Gera URL pública
    const { data: { publicUrl } } = supabase
      .storage
      .from('menu-items')
      .getPublicUrl(fileName);

    return NextResponse.json({ publicUrl });
  } catch (err: any) {
    console.error('[Upload Image Error]', err?.message);
    return NextResponse.json({ error: 'Erro ao processar imagem.' }, { status: 500 });
  }
}
