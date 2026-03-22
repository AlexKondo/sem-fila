'use client';

import { useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { MenuItemSchema } from '@/lib/validations/menu';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import type { MenuItem } from '@/types/database';

interface MenuManagerProps {
  initialItems: MenuItem[];
  vendorId: string;
}

export default function MenuManager({ initialItems, vendorId }: MenuManagerProps) {
  const [items, setItems] = useState<MenuItem[]>(initialItems);
  const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  function openNew() {
    setEditingItem({ vendor_id: vendorId, available: true, position: items.length });
    setIsFormOpen(true);
    setFormError('');
  }

  function openEdit(item: MenuItem) {
    setEditingItem({ ...item });
    setIsFormOpen(true);
    setFormError('');
  }

  async function handleSave() {
    if (!editingItem) return;
    setFormError('');

    const parsed = MenuItemSchema.safeParse(editingItem);
    if (!parsed.success) {
      setFormError(parsed.error.errors[0].message);
      return;
    }

    setSaving(true);
    const supabase = createClient();

    if (editingItem.id) {
      // Update
      const { data, error } = await supabase
        .from('menu_items')
        .update({
          name: parsed.data.name,
          description: parsed.data.description,
          price: parsed.data.price,
          available: parsed.data.available,
        })
        .eq('id', editingItem.id)
        .select()
        .single();

      if (error) { setFormError(error.message); setSaving(false); return; }
      setItems((prev) => prev.map((i) => i.id === data!.id ? data! : i));
    } else {
      // Insert
      const { data, error } = await supabase
        .from('menu_items')
        .insert({
          vendor_id: vendorId,
          name: parsed.data.name,
          description: parsed.data.description ?? null,
          price: parsed.data.price,
          available: parsed.data.available,
          position: parsed.data.position,
        })
        .select()
        .single();

      if (error) { setFormError(error.message); setSaving(false); return; }
      setItems((prev) => [...prev, data!]);
    }

    setSaving(false);
    setIsFormOpen(false);
    setEditingItem(null);
  }

  async function toggleAvailable(item: MenuItem) {
    const supabase = createClient();
    const { data } = await supabase
      .from('menu_items')
      .update({ available: !item.available })
      .eq('id', item.id)
      .select()
      .single();
    if (data) setItems((prev) => prev.map((i) => i.id === data.id ? data : i));
  }

  async function deleteItem(item: MenuItem) {
    if (!confirm(`Remover "${item.name}" do cardápio?`)) return;
    const supabase = createClient();
    const { error } = await supabase.from('menu_items').delete().eq('id', item.id);
    if (!error) setItems((prev) => prev.filter((i) => i.id !== item.id));
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      <button
        onClick={openNew}
        className="w-full bg-orange-500 text-white font-semibold py-3 rounded-2xl hover:bg-orange-600 transition flex items-center justify-center gap-2 mb-5"
      >
        <Plus className="w-4 h-4" />
        Adicionar item
      </button>

      {items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p>Seu cardápio está vazio.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className={`bg-white rounded-2xl shadow-sm p-4 flex gap-3 ${!item.available ? 'opacity-60' : ''}`}>
              {item.image_url ? (
                <Image
                  src={item.image_url}
                  alt={item.name}
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gray-100 flex-shrink-0 flex items-center justify-center text-2xl">
                  🍴
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                    {item.description && (
                      <p className="text-xs text-gray-500 line-clamp-1">{item.description}</p>
                    )}
                    <p className="font-bold text-orange-500 text-sm mt-1">{formatCurrency(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button onClick={() => toggleAvailable(item)} className="text-gray-400 hover:text-orange-500 p-1">
                      {item.available
                        ? <ToggleRight className="w-5 h-5 text-green-500" />
                        : <ToggleLeft className="w-5 h-5" />
                      }
                    </button>
                    <button onClick={() => openEdit(item)} className="text-gray-400 hover:text-blue-500 p-1">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteItem(item)} className="text-gray-400 hover:text-red-500 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de formulário */}
      {isFormOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900">
              {editingItem.id ? 'Editar item' : 'Novo item'}
            </h2>

            {formError && (
              <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{formError}</div>
            )}

            {[
              { label: 'Nome', key: 'name', type: 'text', required: true, placeholder: 'Ex: Coxinha de frango' },
              { label: 'Descrição', key: 'description', type: 'text', placeholder: 'Ingredientes ou observações' },
              { label: 'Preço (R$)', key: 'price', type: 'number', required: true, placeholder: '0.00' },
            ].map(({ label, key, type, required, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input
                  type={type}
                  required={required}
                  placeholder={placeholder}
                  step={key === 'price' ? '0.01' : undefined}
                  min={key === 'price' ? '0' : undefined}
                  value={(editingItem[key as keyof MenuItem] as string | number | undefined) ?? ''}
                  onChange={(e) =>
                    setEditingItem((prev) => ({
                      ...prev!,
                      [key]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value,
                    }))
                  }
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            ))}

            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Disponível</label>
              <button
                type="button"
                onClick={() => setEditingItem((p) => ({ ...p!, available: !p!.available }))}
              >
                {editingItem.available
                  ? <ToggleRight className="w-7 h-7 text-green-500" />
                  : <ToggleLeft className="w-7 h-7 text-gray-400" />
                }
              </button>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setIsFormOpen(false); setEditingItem(null); }}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-orange-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-600 disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
