import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { OrderStatus } from '@/types/database';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  received: 'Recebido',
  preparing: 'Em preparo',
  almost_ready: 'Quase pronto',
  ready: 'Pronto',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

export const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  received: 'bg-blue-100 text-blue-800',
  preparing: 'bg-yellow-100 text-yellow-800',
  almost_ready: 'bg-orange-100 text-orange-800',
  ready: 'bg-green-100 text-green-800',
  delivered: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

// Calcula tempo estimado de espera com base na fila
export function estimatedWaitTime(queueSize: number, avgPrepTime: number): string {
  const minutes = Math.ceil(queueSize * avgPrepTime);
  if (minutes < 60) return `~${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `~${h}h ${m > 0 ? `${m}min` : ''}`;
}

export function getRealNotes(notes: string | null) {
  if (!notes) return null;
  return notes
    .split(' | ')
    .filter(p => !p.startsWith('Cliente:') && !p.startsWith('Tel:') && !p.startsWith('Pagamento:'))
    .join(' | ') || null;
}

const FALLBACK_IMAGES: Record<string, string> = {
  bebida: 'photo-1544145945-f904253d0c7b',
  refrigerante: 'photo-1622483767028-3f66f34a50f4',
  cerveja: 'photo-1535958636474-b021ee887b13',
  suco: 'photo-1513558161293-cdaf765ed2fd',
  agua: 'photo-1548919973-5dea58a94b44',
  cafe: 'photo-1509042239860-f550ce710b93',
  vinho: 'photo-1510812431401-41d2bd2722f3',
  coxinha: 'photo-1626082927389-6cd097cdc6ec',
  esfiha: 'photo-1559811814-e2c7dec08091',
  salgado: 'photo-1563379926898-05f4575a45d8',
  lanche: 'photo-1568901346375-23c9450c58cd',
  burger: 'photo-1568901346375-23c9450c58cd',
  pizza: 'photo-1513104890138-7c749659a591',
  sobremesa: 'photo-1551024506-0bccd828d307',
  doce: 'photo-1551024506-0bccd828d307',
  bolo: 'photo-1578985545062-69928b1d9587',
  porcao: 'photo-1544148103-0773bf10d330',
  batata: 'photo-1573082833025-a74007960682',
  combo: 'photo-1504674900247-0877df9cc836',
  food: 'photo-1546069901-ba9599a7e63c'
};

export function getItemImage(name?: string, category?: string): string {
  const n = (name || '').toLowerCase();
  const c = (category || '').toLowerCase();

  for (const key in FALLBACK_IMAGES) {
    if (n.includes(key) || c.includes(key)) {
      return `https://images.unsplash.com/${FALLBACK_IMAGES[key]}?auto=format&fit=crop&w=500&q=80`;
    }
  }

  return `https://images.unsplash.com/${FALLBACK_IMAGES.food}?auto=format&fit=crop&w=500&q=80`;
}
