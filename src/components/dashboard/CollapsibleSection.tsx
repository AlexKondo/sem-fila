'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface Props {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  glow?: boolean;
  badge?: string;
  children: React.ReactNode;
}

export default function CollapsibleSection({ title, subtitle, icon, defaultOpen = false, glow, badge, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-3xl shadow-sm overflow-hidden relative transition-all duration-300 ${glow ? 'border-2 border-orange-400/60 dark:border-orange-500/50 shadow-[0_0_24px_4px_rgba(236,91,19,0.18)] dark:shadow-[0_0_32px_6px_rgba(236,91,19,0.22)]' : 'border border-slate-100 dark:border-slate-800'}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-6 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition border-none outline-none"
      >
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-orange-100 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400">
              {icon}
            </div>
          )}
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
              {badge && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white animate-pulse" style={{ backgroundColor: '#ec5b13' }}>
                  {badge}
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 font-medium tracking-tight">{subtitle}</p>}
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-6 pb-6">
          {children}
        </div>
      )}
    </div>
  );
}
