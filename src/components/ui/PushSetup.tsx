'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0))).buffer;
}

// Toca alarme via Web Audio API (~10 segundos de bipes)
function playAlarm() {
  try {
    const ctx = new AudioContext();
    const totalBeeps = 8;
    const beepDuration = 0.6;
    const beepGap = 0.6;

    for (let i = 0; i < totalBeeps; i++) {
      const start = ctx.currentTime + i * (beepDuration + beepGap);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, start); // Lá 5 — som agudo de alerta
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(1, start + 0.05);
      gain.gain.setValueAtTime(1, start + beepDuration - 0.1);
      gain.gain.linearRampToValueAtTime(0, start + beepDuration);

      osc.start(start);
      osc.stop(start + beepDuration);
    }
  } catch {
    // AudioContext não disponível (ex: fora do contexto de usuário)
  }
}

export default function PushSetup() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    // Listener: toca alarme quando SW envia PLAY_ALARM (app em primeiro plano)
    function onSwMessage(event: MessageEvent) {
      if (event.data?.type === 'PLAY_ALARM') {
        playAlarm();
      }
    }
    navigator.serviceWorker.addEventListener('message', onSwMessage);

    async function setup() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (Notification.permission === 'denied') return;

      const reg = await navigator.serviceWorker.ready;

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

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      });
    }

    setup().catch(() => {});

    return () => {
      navigator.serviceWorker.removeEventListener('message', onSwMessage);
    };
  }, []);

  return null;
}
