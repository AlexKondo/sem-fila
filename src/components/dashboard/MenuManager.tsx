'use client';

import { useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, getItemImage } from '@/lib/utils';
import { MenuItemSchema } from '@/lib/validations/menu';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import type { MenuItem } from '@/types/database';
import VendorPlansModal from './VendorPlansModal';

interface MenuManagerProps {
  initialItems: MenuItem[];
  vendorId: string;
  aiEnabled?: boolean;
  aiCredits?: number;
}

export default function MenuManager({ initialItems, vendorId, aiEnabled, aiCredits = 0 }: MenuManagerProps) {
  const [items, setItems] = useState<MenuItem[]>(initialItems);
  const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Estados de IA
  const [localCredits, setLocalCredits] = useState(aiCredits);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiDescriptions, setAiDescriptions] = useState<string[]>([]);

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
          image_url: editingItem.image_url ?? null,
        } as any)
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
          image_url: editingItem.image_url ?? null,
        } as any)
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
      .update({ available: !item.available } as any)
      .eq('id', item.id)
      .select()
      .single();
    if (data) setItems((prev) => prev.map((i: any) => i.id === (data as any).id ? (data as any) : i));
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
        <div className="text-center py-16 text-gray-400 dark:text-slate-500">
          <p className="text-4xl mb-3">📋</p>
          <p>Seu cardápio está vazio.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {(() => {
            const categories = Array.from(new Set(items.map(i => i.category).filter((c): c is string => !!c)));
            const uncategorized = items.filter(i => !i.category);

            return (
              <>
                {categories.map(cat => (
                  <div key={cat} className="space-y-2">
                    <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">📂 {cat}</h3>
                    <div className="space-y-2">
                      {items.filter(i => i.category === cat).map((item) => (
                        <MenuItemCard 
                          key={item.id} 
                          item={item} 
                          toggleAvailable={toggleAvailable} 
                          openEdit={openEdit} 
                          deleteItem={deleteItem} 
                        />
                      ))}
                    </div>
                  </div>
                ))}

                {uncategorized.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">📂 Geral / Sem Categoria</h3>
                    <div className="space-y-2">
                      {uncategorized.map((item) => (
                        <MenuItemCard 
                          key={item.id} 
                          item={item} 
                          toggleAvailable={toggleAvailable} 
                          openEdit={openEdit} 
                          deleteItem={deleteItem} 
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Modal de formulário */}
      {isFormOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-800 rounded-t-3xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto border-t dark:border-slate-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {editingItem.id ? 'Editar item' : 'Novo item'}
            </h2>

            {formError && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm px-3 py-2 rounded-lg">{formError}</div>
            )}

            {/* Nome do item (obrigatório antes da IA) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nome</label>
              <input
                type="text"
                required
                placeholder="Ex: Coxinha de frango"
                value={(editingItem as any).name || ''}
                onChange={e => setEditingItem(p => ({ ...p!, name: e.target.value }))}
                className="w-full border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
              />
            </div>

            {/* Upload de Imagem */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Foto do Produto</label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-slate-900 flex items-center justify-center text-3xl border-2 border-dashed border-gray-200 dark:border-slate-700 cursor-pointer overflow-hidden relative group">
                  <div className="relative w-full h-full group">
                    <img 
                      src={editingItem.image_url || getItemImage(editingItem.name, editingItem.category ?? undefined)} 
                      alt="Produto" 
                      className="w-full h-full object-cover" 
                    />
                    {editingItem.image_url && (
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
                    )}
                  </div>
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
                
                {/* 🌟 Magic AI Section */}
                <div className="flex-1 bg-gradient-to-br from-orange-50/50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border border-orange-100 dark:border-orange-900/50 rounded-3xl p-4 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black text-orange-600 flex items-center gap-1">
                      ✨ Criatividade com IA
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded shadow-sm border border-slate-100 dark:border-slate-700 uppercase tracking-widest">
                        {localCredits} Créditos
                      </span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest border ${aiEnabled ? 'bg-orange-500 text-white border-orange-400 shadow-sm' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                        {aiEnabled ? 'PRO' : 'LOCK'}
                      </span>
                    </div>
                  </div>

                  {!aiEnabled ? (
                    <div className="text-center py-2">
                       <p className="text-[10px] text-slate-400 font-medium mb-2 leading-relaxed italic">
                         Ative o plano PRO para gerar fotos e descrições irresistíveis com IA.
                       </p>
                       <button type="button" onClick={() => setIsPlansModalOpen(true)} className="text-[11px] font-bold text-orange-500 hover:underline">
                         Habilitar Agora →
                       </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Prompt unificado */}
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1.5 ml-1">Instruções para a IA (opcional)</p>
                        <textarea
                          placeholder="Ex: Foto com luz de fim de tarde, mesa rústica. Descrição poética, foque no queijo derretido..."
                          value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
                          className="w-full text-[11px] h-14 bg-white dark:bg-slate-900 border border-orange-100 dark:border-orange-900 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-300 placeholder-slate-300 dark:placeholder-slate-600 shadow-sm resize-none text-slate-900 dark:text-white"
                        />
                        <button
                          type="button"
                          disabled={isGenerating}
                          onClick={async () => {
                            if (!editingItem?.name?.trim()) { setFormError('Preencha o nome do item antes de gerar com IA.'); return; }
                            if (localCredits <= 0) { setIsPlansModalOpen(true); return; }
                            setIsGenerating(true);
                            setFormError('');
                            setAiSuggestions([]);
                            setAiDescriptions([]);
                            try {
                              const res = await fetch('/api/vendor/ai/generate', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  vendorId,
                                  menuItemId: editingItem?.id || undefined,
                                  menuItemName: editingItem?.name || undefined,
                                  prompt: aiPrompt || undefined,
                                  currentDescription: editingItem?.description || undefined,
                                  category: editingItem?.category || undefined,
                                }),
                              });
                              const data = await res.json();
                              if (!res.ok) { setFormError(data.error || 'Erro ao gerar conteúdo.'); setIsGenerating(false); return; }
                              setLocalCredits(data.remaining_credits);
                              if (data.images?.length) setAiSuggestions(data.images);
                              if (data.descriptions?.length) setAiDescriptions(data.descriptions);
                            } catch {
                              setFormError('Erro de conexão ao gerar conteúdo.');
                            }
                            setIsGenerating(false);
                          }}
                          className="w-full mt-2 h-9 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:from-orange-600 hover:to-amber-600 transition shadow-lg shadow-orange-500/30 disabled:opacity-50"
                        >
                          {isGenerating ? 'Gerando com IA...' : `Usar 1 Crédito — Gerar Imagens + Descrição`}
                        </button>
                      </div>

                      {/* Descrições geradas pela IA */}
                      {aiDescriptions.length > 0 && (
                        <div className="pt-2 border-t border-orange-100">
                           <p className="text-[10px] text-slate-600 dark:text-slate-400 font-black mb-2 flex items-center gap-1">
                             Descrição gerada pela IA:
                           </p>
                           <div className="space-y-2">
                              {aiDescriptions.map((desc, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => { setEditingItem(p => ({ ...p!, description: desc })); setAiDescriptions([]); }}
                                  className="w-full text-left p-2.5 bg-white dark:bg-slate-900 border border-orange-100 dark:border-orange-900 rounded-xl text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed hover:border-orange-400 hover:bg-orange-50/50 dark:hover:bg-orange-950/30 transition shadow-sm"
                                >
                                  {desc}
                                  <span className="block text-[9px] text-orange-500 font-bold mt-1 uppercase">Clique para usar</span>
                                </button>
                              ))}
                           </div>
                        </div>
                      )}

                      {/* Seletor de imagens (Grid) */}
                      {aiSuggestions.length > 0 && (
                        <div className="pt-2 border-t border-orange-100">
                           <p className="text-[10px] text-orange-600 font-black mb-2 flex items-center gap-1 italic">
                             Escolha a Foto Ideal:
                           </p>
                           <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                              {aiSuggestions.map((url, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={async () => {
                                    setAiSuggestions([]);
                                    setUploadingFile(true);
                                    setFormError('');
                                    try {
                                      const res = await fetch('/api/vendor/ai/upload-image', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ imageUrl: url, vendorId }),
                                      });
                                      const data = await res.json();
                                      if (!res.ok) { setFormError(data.error || 'Erro ao salvar imagem.'); setUploadingFile(false); return; }
                                      setEditingItem(p => ({ ...p!, image_url: data.publicUrl }));
                                    } catch {
                                      setFormError('Erro de conexão ao salvar imagem.');
                                    }
                                    setUploadingFile(false);
                                  }}
                                  className="relative aspect-square rounded-lg overflow-hidden border-2 border-white hover:border-orange-500 transition-all shadow-sm group"
                                >
                                  <img
                                    src={url}
                                    alt={`IA ${i+1}`}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    onError={(e) => {
                                      (e.target as HTMLElement).closest('button')!.style.display = 'none';
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                     <span className="text-[10px] bg-white text-orange-600 px-1.5 py-0.5 rounded font-black">USAR</span>
                                  </div>
                                </button>
                              ))}
                           </div>
                           <button
                             type="button" onClick={() => { setAiSuggestions([]); setAiDescriptions([]); }}
                             className="w-full mt-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                           >
                              Descartar Sugestões
                           </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Renderização dinâmica dos outros campos */}
            {[
              { label: 'Descrição', key: 'description', type: 'text', placeholder: 'Ingredientes ou observações' },
              { label: 'Preço (R$)', key: 'price', type: 'number', required: true, placeholder: '0.00' },
            ].map(({ label, key, type, required, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{label}</label>
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
                  className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 text-slate-900 dark:text-white"
                />
              </div>
            ))}

            {/* Categorias / Submenus em datalist editável */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Categoria (Submenu)</label>
              <input
                type="text"
                list="category-suggestions"
                placeholder="Selecione ou digite uma categoria"
                value={editingItem.category ?? ''}
                onChange={(e) => setEditingItem((p) => ({ ...p!, category: e.target.value || null }))}
                className="w-full border border-gray-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
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
            <div className="space-y-2 border-t border-gray-100 dark:border-slate-700 pt-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-gray-800 dark:text-slate-200">Adicionais / Opcionais</label>
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
                      className="flex-1 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl px-3 py-1.5 text-xs focus:outline-none text-slate-900 dark:text-white"
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
                        className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl pl-7 pr-3 py-1.5 text-xs focus:outline-none text-slate-900 dark:text-white"
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
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Disponível</label>
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
                className="flex-1 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 py-2.5 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-slate-700"
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
      <VendorPlansModal
        isOpen={isPlansModalOpen}
        onClose={() => setIsPlansModalOpen(false)}
        onlyShowAi={true}
        vendorId={vendorId}
      />
    </div>
  );
}

function MenuItemCard({ item, toggleAvailable, openEdit, deleteItem }: { item: MenuItem; toggleAvailable: (i: MenuItem) => void; openEdit: (i: MenuItem) => void; deleteItem: (i: MenuItem) => void }) {
  const P = '#ec5b13';
  return (
    <div key={item.id} className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4 flex gap-3 border border-transparent dark:border-slate-700 ${!item.available ? 'opacity-60' : ''}`}>
      <Image 
        src={item.image_url || getItemImage(item.name, item.category ?? undefined)} 
        alt={item.name} 
        width={64} 
        height={64} 
        className="w-16 h-16 rounded-xl object-cover flex-shrink-0" 
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">{item.name}</p>
            {item.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{item.description}</p>
            )}
            <p className="font-bold text-orange-500 text-sm mt-1">{formatCurrency(item.price)}</p>
          </div>
          <div className="flex items-center gap-1 ml-2">
            <button onClick={() => toggleAvailable(item)} className="text-gray-400 hover:text-orange-500 p-1">
              {item.available ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}
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
  );
}
