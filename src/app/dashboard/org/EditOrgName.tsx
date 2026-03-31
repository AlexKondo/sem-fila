'use client';

import { useState, useRef, useEffect } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Props {
  orgId: string;
  currentName: string;
}

export default function EditOrgName({ orgId, currentName }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === currentName) {
      setName(currentName);
      setEditing(false);
      return;
    }

    setSaving(true);
    const supabase = createClient();
    await supabase
      .from('organizations')
      .update({ name: trimmed })
      .eq('id', orgId);

    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') { setName(currentName); setEditing(false); }
          }}
          className="font-bold text-gray-900 text-lg border-b-2 border-purple-500 bg-transparent outline-none py-0.5 px-1 -ml-1"
          disabled={saving}
        />
        <button onClick={handleSave} disabled={saving} className="p-1 rounded-full hover:bg-green-50 text-green-600 transition">
          <Check className="w-4 h-4" />
        </button>
        <button onClick={() => { setName(currentName); setEditing(false); }} className="p-1 rounded-full hover:bg-red-50 text-red-400 transition">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <h1 className="font-bold text-gray-900 text-lg">{currentName}</h1>
      <button onClick={() => setEditing(true)} className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
        <Pencil className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
