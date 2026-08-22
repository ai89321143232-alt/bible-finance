import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { setLiquidGlass } from '@/hooks/useLiquidGlass';

export default function LiquidGlassToggle() {
  const [enabled, setEnabled] = useState(() =>
    localStorage.getItem('app_liquid_glass') === 'true'
  );

  const toggle = (on) => {
    setEnabled(on);
    setLiquidGlass(on);
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium text-slate-900 dark:text-white flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-violet-500" />
          Liquid Glass
        </p>
        <p className="text-sm text-slate-500">Эффект стекла для карточек</p>
      </div>
      <Switch checked={enabled} onCheckedChange={toggle} />
    </div>
  );
}