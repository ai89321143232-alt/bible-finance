import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useTheme } from '@/lib/themeManager';

export default function ThemeToggle() {
  const [theme, setTheme] = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <Button
      variant="outline"
      onClick={toggleTheme}
      className="w-full justify-between rounded-xl h-12"
    >
      <span>Темная тема</span>
      <div className="flex items-center gap-2">
        {theme === 'dark' ? (
          <>
            <Moon className="w-4 h-4" />
            <span className="text-sm text-slate-500">Вкл</span>
          </>
        ) : (
          <>
            <Sun className="w-4 h-4" />
            <span className="text-sm text-slate-500">Выкл</span>
          </>
        )}
      </div>
    </Button>
  );
}