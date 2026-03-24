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
          category: parsed.data.category ?? null,
          extras: parsed.data.extras ?? [],
        })
        .eq('id', editingItem.id)
        .select()
        .single();

      if (error) { setFormError(error.message); setSaving(false); return; }
      setItems((prev) => prev.map((i) => i.id === data!.id ? (data as any) : i));
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
          category: parsed.data.category ?? null,
          extras: parsed.data.extras ?? [],
        })
        .select()
        .single();

      if (error) { setFormError(error.message); setSaving(false); return; }
      setItems((prev) => [...prev, data as any]);
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

  const [uploadingFile, setUploadingFile] = useState(false);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editingItem) return;

    setUploadingFile(true);
    setFormError('');

    const supabase = createClient();
    // Nome do arquivo seguro: vendorId / timestamp-nome original
    const fileExt = file.name.split('.').pop();
    const fileName = `${editingItem.vendor_id || vendorId}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase
      .storage
      .from('menu-items')
      .upload(fileName, file, { upsert: true });

    if (error) {
      setFormError(`Erro no upload: ${error.message}`);
      setUploadingFile(false);
      return;
    }

    // Pega a URL pública
    const { data: { publicUrl } } = supabase
      .storage
      .from('menu-items')
      .getPublicUrl(fileName);

    setEditingItem((prev) => ({ ...prev!, image_url: publicUrl }));
    setUploadingFile(false);
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

            {/* Upload de Imagem */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Foto do Produto</label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center text-3xl border-2 border-dashed border-gray-200 cursor-pointer overflow-hidden relative group">
                  {editingItem.image_url ? (
                    <div className="relative w-full h-full group">
                      <img src={editingItem.image_url} alt="Produto" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setEditingItem((prev) => ({ ...prev!, image_url: null }));
                        }}
                        className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full shadow-md z-10"
                        title="Remover imagem"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-lg">{uploadingFile ? '...' : '+'}</span>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    disabled={uploadingFile}
                    className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed" 
                    onChange={handleImageUpload}
                  />
                  {uploadingFile && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
                    </div>
                  )}
                </div>
                
                {/* AI Feature Component */}
                <div className="flex-1 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 p-3 rounded-2xl">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black text-orange-600 flex items-center gap-1">
                      ✨ Melhorias com IA
                    </span>
                    <span className="text-[10px] bg-orange-200 text-orange-800 font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                      🔒 PREMIUM
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-snug">
                    Ajuste automático de brilho, foco e remoção de fundo para fotos mais atraentes.
                  </p>
                  <button type="button" onClick={() => setFormError('O serviço de IA está bloqueado. Assine o Plano Pro na aba de ajustes do Painel.')} className="mt-2 text-[11px] font-bold text-orange-500 hover:underline">
                    Habilitar Serviço Extra →
                  </button>
                </div>
              </div>
            </div>

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
                  value={(editingItem[key as keyof typeof editingItem] as string | number | undefined) ?? ''}
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

            {/* Categorias / Submenus em datalist editável */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria (Submenu)</label>
              <input
                type="text"
                list="category-suggestions"
                placeholder="Selecione ou digite uma categoria"
                value={editingItem.category ?? ''}
                onChange={(e) => setEditingItem((p) => ({ ...p!, category: e.target.value || null }))}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
              />
              <datalist id="category-suggestions">
                <option value="Lanches" />
                <option value="Bebidas" />
                <option value="Sobremesas" />
                <option value="Porções" />
                <option value="Combos" />
                <option value="Vinhos" />
              </datalist>
            </div>

            {/* Opcionais / Adicionais */}
            <div className="space-y-2 border-t border-gray-100 pt-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-gray-800">Adicionais / Opcionais</label>
                <button
                  type="button"
                  onClick={() => setEditingItem((p) => ({ ...p!, extras: [...(p!.extras || []), { name: '', price: 0 }] }))}
                  className="text-xs text-orange-600 font-bold flex items-center gap-1 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </button>
              </div>
              
              <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar">
                {(editingItem.extras || []).map((ext, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Ex: Bacon"
                      value={ext.name}
                      onChange={(e) => {
                        const next = [...(editingItem.extras || [])];
                        next[idx].name = e.target.value;
                        setEditingItem(p => ({ ...p!, extras: next }));
                      }}
                      className="flex-1 border border-gray-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none"
                    />
                    <div className="relative w-24">
                      <span className="absolute left-2.5 top-1.5 text-xs text-gray-400">R$</span>
                      <input
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        value={ext.price || ''}
                        onChange={(e) => {
                          const next = [...(editingItem.extras || [])];
                          next[idx].price = parseFloat(e.target.value) || 0;
                          setEditingItem(p => ({ ...p!, extras: next }));
                        }}
                        className="w-full border border-gray-300 rounded-xl pl-7 pr-3 py-1.5 text-xs focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const next = (editingItem.extras || []).filter((_, i) => i !== idx);
                        setEditingItem(p => ({ ...p!, extras: next }));
                      }}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

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
