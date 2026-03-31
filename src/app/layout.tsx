import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import './globals.css';
import UserNotifications from '@/components/notifications/UserNotifications';
import ThemeProvider from '@/components/ui/ThemeProvider';

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const theme = cookieStore.get('theme')?.value ?? 'light';
  const isDark = theme === 'dark';

  return (
    <html lang="pt-BR" className={isDark ? 'dark' : ''} suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="QuickPick" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            try {
              var hasCookie = document.cookie.indexOf('theme=') !== -1;
              if (!hasCookie) {
                var isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                var val = isDark ? 'dark' : 'light';
                document.cookie = 'theme=' + val + ';path=/;max-age=31536000';
                if (isDark) {
                  document.documentElement.classList.add('dark');
                  document.documentElement.style.colorScheme = 'dark';
                }
              }
            } catch(e){}
          })();
        `}} />
      </head>
      <body>
        <ThemeProvider>
          {children}
          <UserNotifications />
        </ThemeProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
