'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { z } from 'zod';
import { Plus, ChevronDown, ChevronRight, MapPin, Calendar } from 'lucide-react';

const OrgSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífens'),
});

const EventSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  location: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

type Vendor = { id: string; name: string; active: boolean };
type Event = { id: string; name: string; location: string | null; start_date: string | null; end_date: string | null; active: boolean; vendors: Vendor[] };
type Org = { id: string; name: string; slug: string; created_at: string; events: Event[] };

export default function OrgManager({ initialOrgs }: { initialOrgs: Org[] }) {
  const [orgs, setOrgs] = useState<Org[]>(initialOrgs);
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null);
  const [showOrgForm, setShowOrgForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState<string | null>(null);
  const [orgForm, setOrgForm] = useState({ name: '', slug: '' });
  const [eventForm, setEventForm] = useState({ name: '', location: '', start_date: '', end_date: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function createOrg() {
    setError('');
    const parsed = OrgSchema.safeParse(orgForm);
    if (!parsed.success) { setError(parsed.error.errors[0].message); return; }
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase.from('organizations').insert(parsed.data).select('*, events(*)').single();
    if (error) { setError(error.message); setSaving(false); return; }
    setOrgs((prev) => [{ ...data, events: [] }, ...prev]);
    setOrgForm({ name: '', slug: '' });
    setShowOrgForm(false);
    setSaving(false);
  }

  async function createEvent(orgId: string) {
    setError('');
    const parsed = EventSchema.safeParse(eventForm);
    if (!parsed.success) { setError(parsed.error.errors[0].message); return; }
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase.from('events').insert({
      organization_id: orgId,
      name: parsed.data.name,
      location: parsed.data.location || null,
      start_date: parsed.data.start_date || null,
      end_date: parsed.data.end_date || null,
    }).select().single();
    if (error) { setError(error.message); setSaving(false); return; }
    setOrgs((prev) => prev.map((o) =>
      o.id === orgId ? { ...o, events: [...o.events, { ...data, vendors: [] }] } : o
    ));
    setEventForm({ name: '', location: '', start_date: '', end_date: '' });
    setShowEventForm(null);
    setSaving(false);
  }

  async function toggleEventActive(eventId: string, orgId: string, current: boolean) {
    const supabase = createClient();
    await supabase.from('events').update({ active: !current }).eq('id', eventId);
    setOrgs((prev) => prev.map((o) =>
      o.id === orgId
        ? { ...o, events: o.events.map((e) => e.id === eventId ? { ...e, active: !current } : e) }
        : o
    ));
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
      {/* Botão nova organização */}
      <button
        onClick={() => setShowOrgForm(true)}
        className="w-full bg-orange-500 text-white font-semibold py-3 rounded-2xl hover:bg-orange-600 transition flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" /> Nova organização
      </button>

      {/* Formulário nova org */}
      {showOrgForm && (
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
          <h3 className="font-semibold text-gray-900">Nova organização</h3>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <input
            placeholder="Nome (ex: Shopping Iguatemi)"
            value={orgForm.name}
            onChange={(e) => {
              const name = e.target.value;
              const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
              setOrgForm({ name, slug });
            }}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <input
            placeholder="Slug (ex: shopping-iguatemi)"
            value={orgForm.slug}
            onChange={(e) => setOrgForm((p) => ({ ...p, slug: e.target.value }))}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <div className="flex gap-2">
            <button onClick={() => setShowOrgForm(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-xl text-sm">Cancelar</button>
            <button onClick={createOrg} disabled={saving} className="flex-1 bg-orange-500 text-white py-2 rounded-xl text-sm font-semibold disabled:opacity-50">
              {saving ? 'Salvando...' : 'Criar'}
            </button>
          </div>
        </div>
      )}

      {/* Lista de orgs */}
      {orgs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🏢</p>
          <p>Nenhuma organização criada ainda.</p>
        </div>
      ) : (
        orgs.map((org) => (
          <div key={org.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* Header da org */}
            <button
              onClick={() => setExpandedOrg(expandedOrg === org.id ? null : org.id)}
              className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition"
            >
              <div className="text-left">
                <p className="font-semibold text-gray-900">{org.name}</p>
                <p className="text-xs text-gray-500">/{org.slug} · {org.events.length} evento{org.events.length !== 1 ? 's' : ''}</p>
              </div>
              {expandedOrg === org.id
                ? <ChevronDown className="w-4 h-4 text-gray-400" />
                : <ChevronRight className="w-4 h-4 text-gray-400" />
              }
            </button>

            {/* Eventos da org */}
            {expandedOrg === org.id && (
              <div className="border-t border-gray-100 px-4 pb-4 space-y-3 pt-3">
                {org.events.map((event) => (
                  <div key={event.id} className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{event.name}</p>
                        {event.location && (
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" /> {event.location}
                          </p>
                        )}
                        {event.start_date && (
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            {new Date(event.start_date).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {event.vendors.length} barraca{event.vendors.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleEventActive(event.id, org.id, event.active)}
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          event.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {event.active ? 'Ativo' : 'Inativo'}
                      </button>
                    </div>
                  </div>
                ))}

                {/* Formulário novo evento */}
                {showEventForm === org.id ? (
                  <div className="border border-gray-200 rounded-xl p-3 space-y-2">
                    <p className="text-sm font-medium text-gray-700">Novo evento</p>
                    {error && <p className="text-red-600 text-xs">{error}</p>}
                    {[
                      { key: 'name', placeholder: 'Nome do evento', type: 'text' },
                      { key: 'location', placeholder: 'Local (opcional)', type: 'text' },
                      { key: 'start_date', placeholder: 'Início', type: 'datetime-local' },
                      { key: 'end_date', placeholder: 'Fim', type: 'datetime-local' },
                    ].map(({ key, placeholder, type }) => (
                      <input
                        key={key}
                        type={type}
                        placeholder={placeholder}
                        value={eventForm[key as keyof typeof eventForm]}
                        onChange={(e) => setEventForm((p) => ({ ...p, [key]: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                      />
                    ))}
                    <div className="flex gap-2">
                      <button onClick={() => setShowEventForm(null)} className="flex-1 border border-gray-200 text-gray-600 py-1.5 rounded-lg text-xs">Cancelar</button>
                      <button onClick={() => createEvent(org.id)} disabled={saving} className="flex-1 bg-orange-500 text-white py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50">
                        {saving ? '...' : 'Criar evento'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setShowEventForm(org.id); setError(''); }}
                    className="w-full border border-dashed border-gray-300 text-gray-500 text-sm py-2 rounded-xl hover:border-orange-400 hover:text-orange-500 transition flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar evento
                  </button>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
