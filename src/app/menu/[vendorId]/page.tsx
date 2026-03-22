// Página pública do cardápio — acessada via QR Code
// Não exige login. Pública para anon.

import { notFound } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency, estimatedWaitTime } from '@/lib/utils';
import CartSheet from '@/components/menu/CartSheet';
import { Clock, MapPin } from 'lucide-react';
import type { MenuItem, Vendor } from '@/types/database';

interface Props {
  params: Promise<{ vendorId: string }>;
  searchParams: Promise<{ mesa?: string }>;
}

export default async function MenuPage({ params, searchParams }: Props) {
  const { vendorId } = await params;
  const { mesa } = await searchParams;

  const supabase = await createClient();

  // Busca vendor e itens do cardápio
  const { data: vendor, error: vendorError } = await supabase
    .from('vendors')
    .select('*')
    .eq('id', vendorId)
    .eq('active', true)
    .single();

  if (vendorError || !vendor) notFound();

  const { data: items } = await supabase
    .from('menu_items')
    .select('*')
    .eq('vendor_id', vendorId)
    .eq('available', true)
    .order('position', { ascending: true });

  // Conta pedidos ativos para estimar espera
  const { count: activeOrders } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('vendor_id', vendorId)
    .in('status', ['received', 'preparing']);

  const waitTime = estimatedWaitTime(activeOrders ?? 0, vendor.avg_prep_time);

  return (
    <main className="min-h-screen bg-gray-50 pb-32">
      {/* Header do Vendor */}
      <div className="bg-white shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-5">
          <div className="flex items-center gap-4">
            {vendor.logo_url ? (
              <Image
                src={vendor.logo_url}
                alt={vendor.name}
                width={64}
                height={64}
                className="w-16 h-16 rounded-2xl object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center text-2xl">
                🍽️
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">{vendor.name}</h1>
              {vendor.description && (
                <p className="text-sm text-gray-500 mt-0.5">{vendor.description}</p>
              )}
              <div className="flex items-center gap-3 mt-1.5">
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3.5 h-3.5" />
                  {waitTime}
                </span>
                {mesa && (
                  <span className="flex items-center gap-1 text-xs text-orange-600 font-medium">
                    <MapPin className="w-3.5 h-3.5" />
                    Mesa {mesa}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Métodos de pagamento aceitos */}
          <div className="flex gap-2 mt-3">
            {vendor.accept_pix && (
              <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">PIX</span>
            )}
            {vendor.accept_card && (
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">Cartão</span>
            )}
            {vendor.accept_cash && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Dinheiro</span>
            )}
            {vendor.payment_mode === 'pay_on_pickup' && (
              <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full">Pagar na retirada</span>
            )}
          </div>
        </div>
      </div>

      {/* Lista de itens */}
      <div className="max-w-lg mx-auto px-4 pt-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Cardápio</h2>

        {!items || items.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🍽️</p>
            <p>Nenhum item disponível no momento.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item: MenuItem) => (
              <MenuItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* Carrinho flutuante */}
      <CartSheet vendor={vendor as Vendor} tableNumber={mesa} />
    </main>
  );
}

function MenuItemCard({ item }: { item: MenuItem }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 flex gap-4 items-start">
      {item.image_url ? (
        <Image
          src={item.image_url}
          alt={item.name}
          width={80}
          height={80}
          className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-20 h-20 rounded-xl bg-gray-100 flex-shrink-0 flex items-center justify-center text-2xl">
          🍴
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 text-sm">{item.name}</h3>
        {item.description && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="font-bold text-orange-500 text-base">
            {formatCurrency(item.price)}
          </span>
          <AddToCartButton item={item} />
        </div>
      </div>
    </div>
  );
}

function AddToCartButton({ item }: { item: MenuItem }) {
  // Este botão precisa ser um Client Component para interagir com o carrinho
  // O estado do carrinho é gerenciado pelo CartSheet
  return (
    <button
      data-add-to-cart={JSON.stringify({ id: item.id, name: item.name, price: item.price })}
      className="add-to-cart-btn bg-orange-500 text-white text-sm font-medium px-3 py-1.5 rounded-xl hover:bg-orange-600 transition"
    >
      + Adicionar
    </button>
  );
}
