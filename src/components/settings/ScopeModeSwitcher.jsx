import React from 'react';
import { User, Briefcase, Layers } from 'lucide-react';
import { useScopeMode } from '@/hooks/useScopeMode';

// Сегментированный переключатель: Личные | Бизнес | Всё
export default function ScopeModeSwitcher({ size = 'md' }) {
  const { scopeMode, setScopeMode } = useScopeMode();

  const options = [
    { value: 'personal', label: 'Личные', icon: User },
    { value: 'business', label: 'Бизнес', icon: Briefcase },
    { value: 'all', label: 'Всё', icon: Layers },
  ];

  const pad = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm';

  return (
    <div className="flex gap-1 p-1 bg-muted border border-border rounded-lg w-fit">
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = scopeMode === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => setScopeMode(opt.value)}
            className={`flex items-center gap-1.5 rounded-md font-medium transition-all ${pad} ${
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}