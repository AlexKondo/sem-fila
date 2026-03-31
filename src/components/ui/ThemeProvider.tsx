'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    // Restaura tema do localStorage ou usa preferência do sistema
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    let currentTheme: Theme = 'light';

    if (savedTheme) {
      currentTheme = savedTheme;
    } else {
      // Fallback para preferência do sistema
      const isDark = document.documentElement.classList.contains('dark');
      currentTheme = isDark ? 'dark' : 'light';
    }

    // Aplica o tema
    setTheme(currentTheme);
    document.documentElement.classList.toggle('dark', currentTheme === 'dark');

    // Observer to sync if class changes externally
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark');
      setTheme(isDark ? 'dark' : 'light');
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    localStorage.setItem('theme', nextTheme);
  };

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
