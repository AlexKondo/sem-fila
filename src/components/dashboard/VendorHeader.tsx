'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogoutButton from '@/components/ui/LogoutButton';
import { createClient } from '@/lib/supabase/client';

const P = '#ec5b13';

interface VendorHeaderProps {
  vendorName: string;
  userName?: string;
  cnpjFormatted: string | null;
  vendorId?: string | null;
  multiVendor?: boolean;
  isOverview?: boolean;
}

function getShortCode(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const num = Math.abs(hash) % 1000000;
  return num.toString().padStart(6, '0').replace(/(\d{3})(\d{3})/, '$1.$2');
}

function clearVendorCookie() {
  document.cookie = 'selected_vendor_id=; path=/; max-age=0';
  window.location.reload();
}

function setOverviewCookie() {
  document.cookie = 'selected_vendor_id=all; path=/; max-age=86400';
  window.location.reload();
}

export default function VendorHeader({ vendorName, userName, cnpjFormatted, vendorId, multiVendor, isOverview }: VendorHeaderProps) {
  const pathname = usePathname();
  const [pendingCalls, setPendingCalls] = React.useState(0);
  const [alertingMesa, setAlertingMesa] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!vendorId) return;

    const supabase = createClient();

    // Busca inicial de chamadas pendentes
    supabase
      .from('waiter_calls')
      .select('id', { count: 'exact', head: true })
      .eq('vendor_id', vendorId)
      .eq('status', 'pending')
      .then(({ count }) => {
        setPendingCalls(count || 0);
      });

    // Inscrição Realtime para atualizar o badge e disparar alertas globais
    const channel = supabase
      .channel(`header-waiter-${vendorId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'waiter_calls',
        filter: `vendor_id=eq.${vendorId}`
      }, (payload) => {
        // Atualiza contagem
        supabase
          .from('waiter_calls')
          .select('id', { count: 'exact', head: true })
          .eq('vendor_id', vendorId)
          .eq('status', 'pending')
          .then(({ count }) => {
            setPendingCalls(count || 0);
          });

        // Alerta sonoro e visual global em novas chamadas
        if (payload.eventType === 'INSERT') {
          const newCall = payload.new as any;
          setAlertingMesa(newCall.table_number);
          playWaiterSound();
        }
      })
      .subscribe();

    function playWaiterSound() {
      try {
        if (typeof window !== 'undefined') {
          const enabled = localStorage.getItem('vendor_alerts_enabled') !== 'false';
          if (!enabled) return;
        }
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
        audio.play().catch(() => {});
      } catch {}
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [vendorId]);

  const firstName = userName ? userName.split(' ')[0] : '';
  const fullDisplayName = firstName ? `${vendorName} ${firstName}` : vendorName;

  let displayName: React.ReactNode = fullDisplayName;
  if (vendorId && !isOverview) {
    const code = getShortCode(vendorId);
    const parts = fullDisplayName.split(' - ');
    if (parts.length > 1) {
      displayName = (
        <>
          {parts[0]} <span className="text-orange-500 font-black px-1">{code}</span> - {parts.slice(1).join(' - ')}
        </>
      );
    } else {
      displayName = (
        <>
          <span className="text-orange-500 font-black pr-1">{code}</span> {fullDisplayName}
        </>
      );
    }
  }

  return (
    <header className="bg-white border-b border-slate-100 sticky top-0 z-40">
      <div className="max-w-2xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: P }}>
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm leading-tight">{displayName}</p>
              {cnpjFormatted && <p className="text-[11px] text-slate-400">CNPJ {cnpjFormatted}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {multiVendor && !isOverview && (
              <button
                onClick={setOverviewCookie}
                className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:border-orange-300 hover:text-orange-600 transition"
              >
                Ver Geral
              </button>
            )}
            {multiVendor && (
              <button
                onClick={clearVendorCookie}
                className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:border-orange-300 hover:text-orange-600 transition"
              >
                Trocar Marca
              </button>
            )}
            <LogoutButton />
          </div>
        </div>

        <nav className="flex gap-1 mt-3 overflow-x-auto overflow-y-visible no-scrollbar">
          <NavTab
            href="/dashboard/vendor/dashboard"
            active={pathname === '/dashboard/vendor/dashboard'}
            label="Dashboard"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
          />
          <NavTab
            href="/dashboard/vendor"
            active={pathname === '/dashboard/vendor'}
            label="Pedidos"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
          />
          <NavTab
            href="/dashboard/vendor/menu"
            active={pathname.startsWith('/dashboard/vendor/menu')}
            label="Cardápio"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
          />
          <NavTab
            href="/dashboard/vendor/qrcode"
            active={pathname.startsWith('/dashboard/vendor/qrcode')}
            label="QR Code"
            icon={<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M3 3h7v7H3V3zm2 2v3h3V5H5zm7-2h7v7h-7V3zm2 2v3h3V5h-3zM3 13h7v7H3v-7zm2 2v3h3v-3H5zm10 0h2v2h-2v-2zm-2 2h2v2h-2v-2zm4 0h2v2h-2v-2zm0-4h2v2h-2v-2zm-4 0h2v2h-2v-2zm2 2h2v2h-2v-2z"/></svg>}
          />
          <NavTab
            href="/dashboard/vendor/waiter"
            active={pathname.startsWith('/dashboard/vendor/waiter')}
            label="Garçom"
            badgeCount={pendingCalls}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          />
          <NavTab
            href="/dashboard/vendor/staff"
            active={pathname.startsWith('/dashboard/vendor/staff')}
            label="Equipe"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
          />
          <NavTab
            href="/dashboard/vendor/settings"
            active={pathname.startsWith('/dashboard/vendor/settings')}
            label="Configurar"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          />
        </nav>
      </div>

      {/* Alerta Global de Garçom */}
      {alertingMesa && (
        <div 
          onClick={() => setAlertingMesa(null)}
          className="fixed inset-0 z-[10000] bg-red-600 flex flex-col items-center justify-center p-8 animate-pulse text-white text-center cursor-pointer"
        >
           <svg className="w-48 h-48 mb-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
           </svg>
           <h2 className="text-4xl font-black uppercase tracking-widest opacity-80 mb-4">Mesa Chamando:</h2>
           <h3 className="text-[12rem] font-black leading-none italic mb-8">
             {alertingMesa}
           </h3>
           <p className="text-2xl font-bold uppercase tracking-widest bg-white text-red-600 px-8 py-2 rounded-full">
             Aguardando Atendimento
           </p>
           <p className="mt-12 text-sm opacity-50 font-bold uppercase tracking-widest">Toque para fechar este alerta</p>
        </div>
      )}
    </header>
  );
}

function NavTab({ href, label, icon, active, badgeCount }: { href: string; label: string; icon: React.ReactNode; active?: boolean; badgeCount?: number }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shrink-0 transition-colors"
      style={active
        ? { backgroundColor: P + '15', color: P }
        : { color: '#64748b' }
      }
    >
      {icon}
      {label}
      {badgeCount && badgeCount > 0 ? (
        <span className="relative -top-2 inline-flex items-center justify-center h-4 min-w-[1rem] px-1 rounded-full text-[10px] font-black text-white bg-red-500 animate-pulse">
          {badgeCount}
        </span>
      ) : null}
    </Link>
  );
}
