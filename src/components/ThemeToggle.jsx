import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function ThemeToggle() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (newTheme) => {
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', newTheme);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    applyTheme(newTheme);
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