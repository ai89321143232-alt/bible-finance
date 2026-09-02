import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useScopeMode } from '@/hooks/useScopeMode';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ScopeModeSwitcher from './ScopeModeSwitcher';

// Переключатель «Бизнес»: включает/выключает возможность бизнес-учёта.
// Когда выключено — ScopeModeSwitcher скрыт, scope_mode принудительно personal.
// Когда включено — появляется выбор Личные / Бизнес / Всё.
export default function BusinessToggle() {
  const queryClient = useQueryClient();
  const { data: user } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
  });
  const [saving, setSaving] = useState(false);

  const businessEnabled = user?.business_enabled ?? true;

  const handleToggle = async (next) => {
    const prevUser = queryClient.getQueryData(['auth-me']);
    // Оптимистично обновляем кэш
    queryClient.setQueryData(['auth-me'], (old) => (old ? { ...old, business_enabled: next } : old));
    if (!next) {
      // При выключении бизнеса — принудительно личный режим
      queryClient.setQueryData(['auth-me'], (old) => (old ? { ...old, scope_mode: 'personal' } : old));
    }
    setSaving(true);
    try {
      const updates = { business_enabled: next };
      if (!next) updates.scope_mode = 'personal';
      await base44.auth.updateMe(updates);
    } catch (e) {
      console.error('Failed to save business_enabled:', e);
      // Откат
      queryClient.setQueryData(['auth-me'], prevUser);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Тумблер «Бизнес» */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-slate-900 dark:text-white">Бизнес</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Учёт личных и бизнес-финансов раздельно
          </p>
        </div>
        <Switch
          checked={businessEnabled}
          disabled={saving}
          onCheckedChange={handleToggle}
        />
      </div>

      {/* Переключатель режима — только когда бизнес включён */}
      {businessEnabled && (
        <>
          <Separator />
          <div>
            <p className="font-medium text-slate-900 dark:text-white">Режим просмотра</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
              Личные, бизнес или все счета вместе. Фильтрует балансы, операции и аналитику.
            </p>
            <ScopeModeSwitcher />
          </div>
        </>
      )}
    </div>
  );
}