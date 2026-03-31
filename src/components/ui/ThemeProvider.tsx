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
    // Servidor já aplicou a classe correta via cookie — só sincroniza o estado React
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    document.documentElement.classList.add('hydrated');
  }, []);

  const toggleTheme = useCallback(() => {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    document.documentElement.style.colorScheme = next;
    document.cookie = `theme=${next};path=/;max-age=31536000`;
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
