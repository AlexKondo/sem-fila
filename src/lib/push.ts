// Helper para enviar push notifications via web-push
import webpush from 'web-push';

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY!;

webpush.setVapidDetails('mailto:contato@sem-fila.vercel.app', VAPID_PUBLIC, VAPID_PRIVATE);

export async function sendPushToUser(
  supabase: ReturnType<typeof import('@/lib/supabase/server').createAdminClient> extends Promise<infer T> ? T : never,
  userId: string,
  payload: { title: string; body: string; url?: string; tag?: string }
) {
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (!subs || subs.length === 0) return;

  const message = JSON.stringify(payload);

  await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        message
      ).catch((err) => {
        // Remove subscription expirada/inválida
        if (err.statusCode === 410 || err.statusCode === 404) {
          supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
      })
    )
  );
}
