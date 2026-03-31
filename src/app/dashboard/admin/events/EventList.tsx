'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, User, Phone, Briefcase } from 'lucide-react';

interface EventItem {
  id: string;
  name: string;
  location?: string | null;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  active: boolean;
  organizations?: { name: string } | null;
  creator?: {
    name: string;
    phone: string | null;
    role: string | null;
  } | null;
}

function fmtDate(d: string) {
  const iso = d.includes('T') ? d : `${d}T12:00:00`;
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function maskPhone(phone: string) {
  const d = phone.replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone;
}

export default function EventList({ events }: { events: EventItem[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!events || events.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <p className="text-gray-400 text-sm">Nenhum evento cadastrado.</p>
      </div>
    );
  }

  return (
    <>
      {events.map((event) => {
        const isExpanded = expandedId === event.id;
        return (
          <div key={event.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all">
            <button
              onClick={() => setExpandedId(isExpanded ? null : event.id)}
              className="w-full p-4 text-left hover:bg-gray-50/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-gray-900">{event.name}</h3>
                  <p className="text-xs text-gray-400">
                    {event.organizations?.name || 'Sem organização'}
                    {event.location ? ` — ${event.location}` : ''}
                  </p>
                  {event.start_date && (
                    <p className="text-xs text-gray-400 mt-1">
                      {fmtDate(event.start_date)}
                      {event.end_date ? ` a ${fmtDate(event.end_date)}` : ''}
                      {event.start_time ? ` • ${event.start_time.slice(0, 5)}` : ''}
                      {event.end_time ? ` - ${event.end_time.slice(0, 5)}` : ''}
                    </p>
                  )}
                  {event.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{event.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${event.active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                    {event.active ? 'Ativo' : 'Inativo'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50 space-y-3">
                {/* Dados do organizador */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Organizador</p>
                  {event.creator ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span className="font-semibold">{event.creator.name}</span>
                      </div>
                      {event.creator.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          <a href={`tel:${event.creator.phone.replace(/\D/g, '')}`} className="hover:text-orange-600 transition-colors">
                            {maskPhone(event.creator.phone)}
                          </a>
                        </div>
                      )}
                      {event.creator.role && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-xs">{event.creator.role === 'org_admin' ? 'Organizador' : event.creator.role}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">Dados do organizador não disponíveis.</p>
                  )}
                </div>

                {/* Link para relatório */}
                <Link
                  href={`/dashboard/admin/events/${event.id}`}
                  className="block text-center text-sm font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-xl py-2.5 transition-colors"
                >
                  Ver relatório completo
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
