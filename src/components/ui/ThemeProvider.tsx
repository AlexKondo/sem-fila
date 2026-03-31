'use client';

import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  // O tema real é capturado do localStorage ou sistema pelo inline script no layout.tsx
  // Aqui apenas mantemos o estado sincronizado para a UI do React (Componentes)
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    // 1. Identifica o tema que o script inline aplicou
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');

    // 2. Garante que a transição de cor só ocorra após esta primeira leitura
    // O USER já adicionou CSS para 'html.hydrated body' no globals.css
    setTimeout(() => {
      document.documentElement.classList.add('hydrated');
    }, 100);

    // 3. Monitor externo (caso algo mude a classe fora do React)
    const observer = new MutationObserver(() => {
      const dark = document.documentElement.classList.contains('dark');
      setTheme(dark ? 'dark' : 'light');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const toggleTheme = useCallback(() => {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    document.documentElement.style.colorScheme = next;
    localStorage.setItem('theme', next);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
