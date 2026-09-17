import React from 'react';
import { Check } from 'lucide-react';
import { CARD_STYLES, getModernIconAsset, INDIVIDUAL_CARD_STYLES } from '@/lib/modernIconStyles';
import { useTheme } from '@/lib/themeManager';

export default function CardStylePicker({ value, onChange }) {
  const [theme] = useTheme();
  return (
    <div className="grid grid-cols-2 gap-3">
      {CARD_STYLES.map((style) => {
        const selected = style.key === value;
        return (
          <button key={style.key} type="button" onClick={() => onChange(style.key)} className={`rounded-xl border p-2 text-left transition-colors ${selected ? 'border-violet-500 ring-2 ring-violet-500/20' : 'border-border bg-card'}`}>
            <span className="card-style-preview" style={{ backgroundImage: `url(${getModernIconAsset(style.key, theme, 'Dashboard')})`, backgroundSize: INDIVIDUAL_CARD_STYLES.includes(style.key) ? 'cover' : '600% 400%' }} />
            <span className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              {selected && <Check className="h-4 w-4 text-violet-600" />}{style.label}
            </span>
            <span className="mt-0.5 block text-sm text-muted-foreground">{style.description}</span>
          </button>
        );
      })}
    </div>
  );
}