'use client';

import { useState, useEffect, useCallback } from 'react';
import { ShoppingBag, Plus, Minus, X, ChevronUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { Vendor } from '@/types/database';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartSheetProps {
  vendor: Vendor;
  tableNumber?: string;
}

export default function CartSheet({ vendor, tableNumber }: CartSheetProps) {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Escuta cliques nos botões "Adicionar" do Server Component pai
  useEffect(() => {
    function handleAddToCart(e: MouseEvent) {
      const btn = (e.target as Element).closest('[data-add-to-cart]');
      if (!btn) return;
      const item = JSON.parse((btn as HTMLElement).dataset.addToCart!);
      addItem(item);
    }
    document.addEventListener('click', handleAddToCart);
    return () => document.removeEventListener('click', handleAddToCart);
  }, []);

  const addItem = useCallback((item: { id: string; name: string; price: number }) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  }, []);

  function updateQuantity(id: string, delta: number) {
    setItems((prev) =>
      prev
        .map((i) => i.id === id ? { ...i, quantity: i.quantity + delta } : i)
        .filter((i) => i.quantity > 0)
    );
  }

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  async function handleCheckout() {
    if (items.length === 0) return;
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Cria o pedido via API Route (validação server-side)
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vendor_id: vendor.id,
        table_number: tableNumber,
        notes,
        items: items.map((i) => ({ menu_item_id: i.id, quantity: i.quantity })),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? 'Erro ao fazer pedido. Tente novamente.');
      setLoading(false);
      return;
    }

    router.push(`/order/${data.order_id}`);
  }

  if (count === 0) return null;

  return (
    <>
      {/* Botão flutuante do carrinho */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-orange-500 text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 z-50 hover:bg-orange-600 transition"
        >
          <ShoppingBag className="w-5 h-5" />
          <span className="font-semibold">{count} {count === 1 ? 'item' : 'itens'}</span>
          <span className="bg-white/20 px-2 py-0.5 rounded-lg text-sm font-bold">
            {formatCurrency(total)}
          </span>
        </button>
      )}

      {/* Sheet do carrinho */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsOpen(false)} />
          <div className="relative bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-lg">Seu pedido</h2>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <ChevronUp className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-4 py-3 space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">{formatCurrency(item.price)} cada</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-semibold w-5 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center hover:bg-orange-600"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
                      className="w-7 h-7 rounded-full text-gray-400 flex items-center justify-center hover:text-red-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-sm font-bold text-gray-900 w-16 text-right">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>
              ))}

              <div className="pt-2">
                <label className="block text-xs text-gray-500 mb-1">Observações (opcional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={500}
                  rows={2}
                  placeholder="Ex: sem cebola, bem passado..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>

            <div className="px-4 py-4 border-t border-gray-100 space-y-3">
              {error && (
                <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Total</span>
                <span className="font-bold text-lg text-gray-900">{formatCurrency(total)}</span>
              </div>
              <button
                onClick={handleCheckout}
                disabled={loading}
                className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-2xl hover:bg-orange-600 transition disabled:opacity-50 text-base"
              >
                {loading ? 'Enviando pedido...' : 'Confirmar pedido'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
