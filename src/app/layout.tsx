import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'QuickPick — Sem fila, só sabor',
  description: 'Peça pelo celular e retire sem fila. Cardápio digital para barracas, quiosques e praças de alimentação.',
  manifest: '/manifest.json',
  icons: { icon: '/favicon.ico', apple: '/apple-touch-icon.png' },
  openGraph: {
    title: 'QuickPick',
    description: 'Sem fila, só sabor.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#ec5b13',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body style={{ backgroundColor: '#f8f6f6', color: '#0f172a' }}>
        {children}
      </body>
    </html>
  );
}
