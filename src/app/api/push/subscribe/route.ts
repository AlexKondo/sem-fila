// API Route — Salva push subscription do usuário
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  const body = await request.json();
  const { endpoint, keys } = body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Subscription inválida.' }, { status: 400 });
  }

  // Upsert por endpoint (mesmo dispositivo não duplica)
  await supabase.from('push_subscriptions').upsert({
    user_id: user.id,
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
  }, { onConflict: 'endpoint' });

  return NextResponse.json({ success: true });
}
