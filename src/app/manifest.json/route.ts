// PWA Manifest — habilita instalação na home screen (sem download obrigatório)

import { NextResponse } from 'next/server';

export async function GET() {
  const manifest = {
    name: 'QuickPick',
    short_name: 'QuickPick',
    description: 'Peça sem fila. Cardápio digital para barracas e quiosques.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#f97316',
    orientation: 'portrait',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };

  return NextResponse.json(manifest, {
    headers: { 'Content-Type': 'application/manifest+json' },
  });
}
