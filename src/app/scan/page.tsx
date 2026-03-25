'use client';

import dynamic from 'next/dynamic';

const QrScanner = dynamic(() => import('@/components/menu/QrScanner'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center min-h-screen text-slate-400">Carregando câmera...</div>
});

export default function ScanPage() {
  return <QrScanner />;
}
