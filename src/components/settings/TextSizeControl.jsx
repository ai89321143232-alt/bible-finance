import React from 'react';
import { useFontScale, FONT_SCALES } from '@/hooks/useFontScale';
import { Type, Minus, Plus, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export default function TextSizeControl() {
  const { scale, updateScale, reset } = useFontScale();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-slate-900 dark:text-white">Размер текста</p>
          <p className="text-sm text-slate-500">Для слабовидящих пользователей</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="rounded-lg h-9 w-9"
            onClick={() => updateScale(scale - 5)}
            disabled={scale <= 85}
          >
            <Minus className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium w-12 text-center text-slate-700 dark:text-slate-300">
            {scale}%
          </span>
          <Button
            variant="outline"
            size="icon"
            className="rounded-lg h-9 w-9"
            onClick={() => updateScale(scale + 5)}
            disabled={scale >= 150}
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-lg h-9 w-9"
            onClick={reset}
            title="Сбросить"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <Separator />
      <div className="flex items-center gap-2 flex-wrap">
        {FONT_SCALES.map((s) => (
          <button
            key={s.value}
            onClick={() => updateScale(s.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              scale === s.value
                ? 'bg-violet-600 text-white'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
            style={{ fontSize: `${s.value / 100}rem` }}
            title={s.description}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}