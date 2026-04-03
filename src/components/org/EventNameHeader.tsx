'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Pencil, Check, X } from 'lucide-react';

interface Props {
  eventId: string;
  initialName: string;
  initialLocation: string;
}

export default function EventNameHeader({ eventId, initialName, initialLocation }: Props) {
  const supabase = createClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [location, setLocation] = useState(initialLocation);
  const [draftName, setDraftName] = useState(initialName);
  const [draftLocation, setDraftLocation] = useState(initialLocation);
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setDraftName(name);
    setDraftLocation(location);
    setEditing(true);
    setTimeout(() => nameRef.current?.focus(), 0);
  };

  const cancel = () => setEditing(false);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('events')
      .update({ name: draftName.trim() || name, location: draftLocation.trim() })
      .eq('id', eventId);
    if (!error) {
      setName(draftName.trim() || name);
      setLocation(draftLocation.trim());
    }
    setSaving(false);
    setEditing(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') save();
    if (e.key === 'Escape') cancel();
  };

  if (editing) {
    return (
      <div className="flex-1 flex flex-col gap-1">
        <input
          ref={nameRef}
          value={draftName}
          onChange={e => setDraftName(e.target.value)}
          onKeyDown={onKeyDown}
          className="font-bold text-gray-900 dark:text-white text-sm bg-transparent border-b border-purple-500 focus:outline-none w-full"
        />
        <input
          value={draftLocation}
          onChange={e => setDraftLocation(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Local do evento"
          className="text-xs text-gray-400 dark:text-slate-500 bg-transparent border-b border-slate-400 focus:outline-none w-full"
        />
        <div className="flex gap-2 mt-1">
          <button onClick={save} disabled={saving}
            className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 disabled:opacity-50">
            <Check className="w-3.5 h-3.5" /> Salvar
          </button>
          <button onClick={cancel}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" /> Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center gap-2 min-w-0">
      <div className="min-w-0">
        <h1 className="font-bold text-gray-900 dark:text-white text-sm truncate">{name}</h1>
        <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{location || 'Sem local definido'}</p>
      </div>
      <button onClick={startEdit} className="text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 shrink-0">
        <Pencil className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
