'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export default function PushSetup() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    async function setup() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Só pergunta se ainda não foi decidido
      if (Notification.permission === 'denied') return;

      const reg = await navigator.serviceWorker.ready;

      // Verifica se já tem subscription ativa
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        if (Notification.permission === 'default') {
          const perm = await Notification.requestPermission();
          if (perm !== 'granted') return;
        }
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
        });
      }

      // Envia para o servidor
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      });
    }

    setup().catch(() => {});
  }, []);

  return null;
}
