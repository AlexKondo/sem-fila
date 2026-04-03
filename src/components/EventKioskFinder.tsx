'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MapPin, ChevronDown, ChevronUp, Store, X } from 'lucide-react';
import Link from 'next/link';

interface Vendor {
  id: string;
  name: string;
}

interface EventItem {
  id: string;
  name: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  vendors: Vendor[];
}

export default function EventKioskFinder() {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  useEffect(() => {
    if (!open || events.length > 0) return;
    setLoading(true);

    const today = new Date().toISOString().split('T')[0];

    (async () => {
      // Busca eventos que ainda estão ativos (sem data de fim ou data de fim >= hoje)
      const { data: eventsData } = await supabase
        .from('events')
        .select('id, name, location, start_date, end_date')
        .or(`end_date.is.null,end_date.gte.${today}`)
        .order('start_date', { ascending: true });

      if (!eventsData || eventsData.length === 0) {
        setEvents([]);
        setLoading(false);
        return;
      }

      const eventIds = eventsData.map(e => e.id);

      // Busca convites confirmados e seus vendors
      const { data: invites } = await supabase
        .from('event_vendor_invitations')
        .select('event_id, vendor_id, vendors(id, name)')
        .in('event_id', eventIds)
        .in('status', ['confirmed', 'accepted', 'paid'])
        .not('vendor_id', 'is', null);

      const vendorsByEvent: Record<string, Vendor[]> = {};
      if (invites) {
        for (const inv of invites) {
          if (!inv.vendor_id || !inv.vendors) continue;
          const v = inv.vendors as any;
          if (!vendorsByEvent[inv.event_id]) vendorsByEvent[inv.event_id] = [];
          if (!vendorsByEvent[inv.event_id].find(x => x.id === v.id)) {
            vendorsByEvent[inv.event_id].push({ id: v.id, name: v.name });
          }
        }
      }

      const result: EventItem[] = eventsData
        .map(e => ({ ...e, vendors: vendorsByEvent[e.id] ?? [] }))
        .filter(e => e.vendors.length > 0);

      setEvents(result);
      setLoading(false);
    })();
  }, [open]);

  return (
    <>
      {/* Botão de entrada */}
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl border-2 font-semibold text-sm transition-all active:scale-95"
        style={{ borderColor: '#ec5b13', color: '#ec5b13' }}
      >
        <MapPin className="w-4 h-4 flex-shrink-0" />
        Está em um evento? Ache os Kiosks aqui
      </button>

      {/* Modal/Sheet */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div className="relative w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
              <div>
                <h2 className="font-black text-slate-900 dark:text-white text-base">Eventos</h2>
                <p className="text-xs text-slate-400 mt-0.5">Toque no evento para ver os vendedores</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {loading && (
                <div className="flex items-center justify-center py-10 text-slate-400">
                  <div className="w-5 h-5 border-2 border-slate-300 border-t-orange-500 rounded-full animate-spin" />
                </div>
              )}

              {!loading && events.length === 0 && (
                <div className="text-center py-10 text-slate-400">
                  <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Nenhum evento ativo no momento.</p>
                </div>
              )}

              {!loading && events.map(event => (
                <div key={event.id} className="rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                  <button
                    onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                    className="w-full flex items-center justify-between px-4 py-3.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{event.name}</p>
                      {event.location && (
                        <p className="text-xs text-slate-400 truncate">{event.location}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                        {event.vendors.length} {event.vendors.length === 1 ? 'kiosk' : 'kiosks'}
                      </span>
                      {expandedEvent === event.id
                        ? <ChevronUp className="w-4 h-4 text-slate-400" />
                        : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </button>

                  {expandedEvent === event.id && (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {event.vendors.map(vendor => (
                        <Link
                          key={vendor.id}
                          href={`/menu/${vendor.id}`}
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#ec5b1315' }}>
                            <Store className="w-4 h-4" style={{ color: '#ec5b13' }} />
                          </div>
                          <span className="font-medium text-slate-900 dark:text-white text-sm">{vendor.name}</span>
                          <span className="ml-auto text-xs" style={{ color: '#ec5b13' }}>Ver cardápio →</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
