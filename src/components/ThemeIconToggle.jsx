import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/lib/themeManager';

export default function ThemeIconToggle() {
  const [theme, setTheme] = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <button
      onClick={toggleTheme}
      className="w-9 h-9 rounded-lg bg-muted border border-border text-foreground flex items-center justify-center hover:bg-accent transition-colors"
      title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
    >
      {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}