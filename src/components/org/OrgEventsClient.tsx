'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Plus, MapPin, Calendar, Clock, ChevronRight, Pencil, Trash2, X, Save } from 'lucide-react';

type EventRow = {
  id: string;
  name: string;
  location: string | null;
  address: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  active: boolean;
  booth_selection_mode: string;
  default_booth_fee: number;
};

type EventForm = {
  name: string;
  location: string;
  address: string;
  description: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  booth_selection_mode: string;
  default_booth_fee: string;
};

const emptyForm: EventForm = {
  name: '', location: '', address: '', description: '',
  start_date: '', end_date: '', start_time: '', end_time: '',
  booth_selection_mode: 'choice', default_booth_fee: '0',
};

export default function OrgEventsClient({ initialEvents, orgId }: { initialEvents: EventRow[]; orgId: string }) {
  const [events, setEvents] = useState<EventRow[]>(initialEvents);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string>('');

  function updateField(key: keyof EventForm, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function createEvent() {
    if (!form.name.trim()) { setError('Nome do evento é obrigatório.'); return; }
    setError(''); setSaving(true);
    const supabase = createClient();

    const payload = {
      organization_id: orgId,
      name: form.name.trim(),
      location: form.location || null,
      address: form.address || null,
      description: form.description || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      booth_selection_mode: form.booth_selection_mode,
      default_booth_fee: parseFloat(form.default_booth_fee) || 0,
    };

    const { data, error: err } = await supabase.from('events').insert(payload).select().single();
    if (err) { setError(err.message); setSaving(false); return; }

    setEvents(prev => [data as EventRow, ...prev]);
    setForm(emptyForm);
    setShowForm(false);
    setSaving(false);
  }

  async function saveEdit() {
    if (!editingId || !form.name.trim()) { setError('Nome obrigatório.'); return; }
    setError(''); setSaving(true);
    const supabase = createClient();

    const { error: err } = await supabase.from('events').update({
      name: form.name.trim(),
      location: form.location || null,
      address: form.address || null,
      description: form.description || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      booth_selection_mode: form.booth_selection_mode,
      default_booth_fee: parseFloat(form.default_booth_fee) || 0,
    }).eq('id', editingId);

    if (err) { setError(err.message); setSaving(false); return; }

    setEvents(prev => prev.map(e => e.id === editingId ? {
      ...e,
      name: form.name.trim(),
      location: form.location || null,
      address: form.address || null,
      description: form.description || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      booth_selection_mode: form.booth_selection_mode,
      default_booth_fee: parseFloat(form.default_booth_fee) || 0,
    } : e));

    setEditingId(null);
    setSaving(false);
  }

  async function toggleActive(eventId: string, current: boolean) {
    const supabase = createClient();
    await supabase.from('events').update({ active: !current }).eq('id', eventId);
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, active: !current } : e));
  }

  async function deleteEvent(eventId: string) {
    const supabase = createClient();

    // Verifica se há convites aceitos/pagos antes de deletar
    const { count } = await supabase
      .from('event_vendor_invitations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .in('status', ['accepted', 'paid']);

    if (count && count > 0) {
      setDeleteError(`Não é possível excluir: há ${count} vendedor${count !== 1 ? 'es' : ''} confirmado${count !== 1 ? 's' : ''} neste evento.`);
      return;
    }

    const { error: err } = await supabase.from('events').delete().eq('id', eventId);
    if (err) { setDeleteError(err.message); return; }
    setEvents(prev => prev.filter(e => e.id !== eventId));
    setDeleteConfirm(null);
    setDeleteError('');
  }

  function startEdit(event: EventRow) {
    setEditingId(event.id);
    setForm({
      name: event.name,
      location: event.location || '',
      address: event.address || '',
      description: event.description || '',
      start_date: event.start_date ? event.start_date.slice(0, 10) : '',
      end_date: event.end_date ? event.end_date.slice(0, 10) : '',
      start_time: event.start_time || '',
      end_time: event.end_time || '',
      booth_selection_mode: event.booth_selection_mode,
      default_booth_fee: String(event.default_booth_fee),
    });
    setError('');
  }

  const formFields = (
    <div className="space-y-3">
      {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}

      <input placeholder="Nome do evento *" value={form.name}
        onChange={e => updateField('name', e.target.value)}
        className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white dark:bg-slate-950 text-slate-900 dark:text-white" />

      <input placeholder="Local (ex: Ginásio Municipal)" value={form.location}
        onChange={e => updateField('location', e.target.value)}
        className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white dark:bg-slate-950 text-slate-900 dark:text-white" />

      <input placeholder="Endereço completo" value={form.address}
        onChange={e => updateField('address', e.target.value)}
        className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white dark:bg-slate-950 text-slate-900 dark:text-white" />

      <textarea placeholder="Descrição (opcional)" value={form.description}
        onChange={e => updateField('description', e.target.value)} rows={2}
        className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none bg-white dark:bg-slate-950 text-slate-900 dark:text-white" />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 dark:text-slate-400 ml-1">Data início</label>
          <input type="date" value={form.start_date}
            onChange={e => updateField('start_date', e.target.value)}
            className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white dark:bg-slate-950 text-slate-900 dark:text-white" />
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-slate-400 ml-1">Data fim</label>
          <input type="date" value={form.end_date}
            onChange={e => updateField('end_date', e.target.value)}
            className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white dark:bg-slate-950 text-slate-900 dark:text-white" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 dark:text-slate-400 ml-1">Horário abertura</label>
          <input type="time" value={form.start_time}
            onChange={e => updateField('start_time', e.target.value)}
            className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white dark:bg-slate-950 text-slate-900 dark:text-white" />
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-slate-400 ml-1">Horário encerramento</label>
          <input type="time" value={form.end_time}
            onChange={e => updateField('end_time', e.target.value)}
            className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white dark:bg-slate-950 text-slate-900 dark:text-white" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 dark:text-slate-400 ml-1">Seleção de barraca</label>
          <select value={form.booth_selection_mode}
            onChange={e => updateField('booth_selection_mode', e.target.value)}
            className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
            <option value="choice" className="dark:bg-slate-900">Vendor escolhe</option>
            <option value="lottery" className="dark:bg-slate-900">Sorteio</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-slate-400 ml-1">Taxa padrão (R$)</label>
          <input type="number" min="0" step="0.01" value={form.default_booth_fee}
            onChange={e => updateField('default_booth_fee', e.target.value)}
            className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white dark:bg-slate-950 text-slate-900 dark:text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
      {/* Botão novo evento */}
      {!showForm && !editingId && (
        <button
          onClick={() => { setShowForm(true); setForm(emptyForm); setError(''); }}
          className="w-full bg-purple-600 text-white font-semibold py-3 rounded-2xl hover:bg-purple-700 transition flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Novo evento
        </button>
      )}

      {/* Form de criação */}
      {showForm && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-5 border border-slate-100 dark:border-slate-800">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Novo evento</h3>
          {formFields}
          <div className="flex gap-2 mt-4">
            <button onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 py-2.5 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition">Cancelar</button>
            <button onClick={createEvent} disabled={saving} className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 shadow-lg shadow-purple-500/20">
              {saving ? 'Criando...' : 'Criar evento'}
            </button>
          </div>
        </div>
      )}

      {events.length === 0 && !showForm ? (
        <div className="text-center py-16 text-gray-400 dark:text-slate-600">
          <Calendar className="w-10 h-10 mx-auto mb-3" />
          <p>Nenhum evento criado ainda.</p>
        </div>
      ) : (
        events.map(event => (
          <div key={event.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm overflow-hidden border border-slate-100 dark:border-slate-800">
            {editingId === event.id ? (
              <div className="p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Editando evento</h3>
                {formFields}
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setEditingId(null)} className="flex-1 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 py-2.5 rounded-xl text-sm flex items-center justify-center gap-1 hover:bg-gray-50 dark:hover:bg-slate-800 transition">
                    <X className="w-4 h-4" /> Cancelar
                  </button>
                  <button onClick={saveEdit} disabled={saving} className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1 shadow-lg shadow-purple-500/20">
                    <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <Link href={`/dashboard/org/events/${event.id}`} className="flex-1 min-w-0 group">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm group-hover:text-purple-600 dark:group-hover:text-purple-400 transition">{event.name}</p>
                      <button
                        onClick={(e) => { e.preventDefault(); toggleActive(event.id, event.active); }}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors ${
                          event.active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-200 dark:bg-slate-800 text-gray-500 dark:text-slate-400'
                        }`}
                      >
                        {event.active ? 'Ativo' : 'Inativo'}
                      </button>
                    </div>
                    {event.location && (
                      <p className="text-xs text-gray-400 dark:text-slate-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" /> {event.location}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      {event.start_date && (
                        <p className="text-xs text-gray-400 dark:text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(event.start_date).toLocaleDateString('pt-BR')}
                          {event.end_date && ` - ${new Date(event.end_date).toLocaleDateString('pt-BR')}`}
                        </p>
                      )}
                      {event.start_time && (
                        <p className="text-xs text-gray-400 dark:text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {event.start_time.slice(0, 5)}
                          {event.end_time && ` - ${event.end_time.slice(0, 5)}`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 font-medium">
                        {event.booth_selection_mode === 'lottery' ? 'Sorteio' : 'Escolha'}
                      </span>
                      {event.default_booth_fee > 0 && (
                        <span className="text-[10px] text-gray-400 dark:text-slate-500">
                          Taxa: R$ {Number(event.default_booth_fee).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </Link>

                  <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                    <button
                      onClick={() => startEdit(event)}
                      className="p-1.5 text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {deleteConfirm === event.id ? (
                      <div className="flex flex-col items-end gap-1">
                        {deleteError && (
                          <p className="text-[10px] text-red-500 dark:text-red-400 max-w-[180px] text-right leading-tight">{deleteError}</p>
                        )}
                        {!deleteError && (
                          <div className="flex items-center gap-1">
                            <button onClick={() => deleteEvent(event.id)} className="text-white bg-red-500 hover:bg-red-600 rounded-lg text-[10px] font-bold px-2 py-1">Sim</button>
                            <button onClick={() => { setDeleteConfirm(null); setDeleteError(''); }} className="text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg text-[10px] font-bold px-2 py-1">Não</button>
                          </div>
                        )}
                        {deleteError && (
                          <button onClick={() => { setDeleteConfirm(null); setDeleteError(''); }} className="text-gray-500 dark:text-slate-400 text-[10px] underline">Fechar</button>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => { setDeleteConfirm(event.id); setDeleteError(''); }}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <Link href={`/dashboard/org/events/${event.id}`} className="p-1.5 text-gray-400 hover:text-purple-500">
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
