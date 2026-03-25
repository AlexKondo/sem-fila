'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogoutButton from '@/components/ui/LogoutButton';

const P = '#ec5b13';

interface VendorHeaderProps {
  vendorName: string;
  cnpjFormatted: string | null;
}

export default function VendorHeader({ vendorName, cnpjFormatted }: VendorHeaderProps) {
  const pathname = usePathname();

  return (
    <header className="bg-white border-b border-slate-100 sticky top-0 z-40">
      <div className="max-w-2xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo + vendor name */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: P }}>
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
              </svg>
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm leading-tight">{vendorName}</p>
              {cnpjFormatted && <p className="text-[11px] text-slate-400">CNPJ {cnpjFormatted}</p>}
            </div>
          </div>
          <LogoutButton />
        </div>

        {/* Nav tabs */}
        <nav className="flex gap-1 mt-3 overflow-x-auto no-scrollbar">
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
            href="/dashboard/waiter" 
            active={pathname.startsWith('/dashboard/waiter')} 
            label="Garçom" 
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} 
          />
        </nav>
      </div>
    </header>
  );
}

function NavTab({ href, label, icon, active }: { href: string; label: string; icon: React.ReactNode; active?: boolean }) {
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
    </Link>
  );
}
