'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { usePathname } from 'next/navigation';

export default function UserNotifications() {
  const [readyOrder, setReadyOrder] = useState<{ pickup_code: string; vendor_name: string } | null>(null);
  const pathname = usePathname();

  const playSound = useCallback(() => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
      audio.play().catch(() => {});
      if ('vibrate' in navigator) navigator.vibrate([300, 100, 300, 100, 300]);
    } catch {}
  }, []);

  useEffect(() => {
    // Não mostra alerta se estiver no dashboard do vendor para evitar confusão de sons/popups
    if (pathname.startsWith('/dashboard/vendor')) return;

    const supabase = createClient();
    let channel: any;

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        channel = supabase
          .channel(`user-notifications-${data.user.id}`)
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `user_id=eq.${data.user.id}`
          }, async (payload: any) => {
            const updated = payload.new;
            const old = payload.old as any;
            
            // Se o status mudou para 'ready', dispara o alarme
            if (updated.status === 'ready' && old?.status !== 'ready') {
              // Busca o nome do vendor para o popup
              const { data: vendor } = await supabase
                .from('vendors')
                .select('name')
                .eq('id', updated.vendor_id)
                .single();

              setReadyOrder({ 
                pickup_code: updated.pickup_code, 
                vendor_name: vendor?.name || 'Quiosque' 
              });
              playSound();
            }
          })
          .subscribe();
      }
    });

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [pathname, playSound]);

  if (!readyOrder) return null;

  return (
    <div 
      onClick={() => setReadyOrder(null)}
      className="fixed inset-0 z-[20000] bg-green-600 flex flex-col items-center justify-center p-8 animate-pulse text-white text-center cursor-pointer"
    >
       <svg className="w-48 h-48 mb-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
       </svg>
       <h2 className="text-4xl font-black uppercase tracking-widest opacity-80 mb-4">Seu Pedido Está Pronto:</h2>
       <h3 className="text-[12rem] font-black leading-none italic mb-8">
         {readyOrder.pickup_code}
       </h3>
       <p className="text-2xl font-bold uppercase tracking-widest bg-white text-green-600 px-8 py-2 rounded-full">
         Retire no balcão: {readyOrder.vendor_name}
       </p>
       <p className="mt-12 text-sm opacity-50 font-bold uppercase tracking-widest">Toque para fechar este alerta</p>
    </div>
  );
}
