import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { DASHBOARD_VARIANTS, getDashboardVariant } from '@/lib/dashboardVariants';

export default function DashboardVariantPicker({ initialVariant, onSaved }) {
  const [current, setCurrent] = useState(initialVariant || 'dark_scene');
  React.useEffect(() => setCurrent(initialVariant || 'dark_scene'), [initialVariant]);
  const choose = async (variant) => {
    setCurrent(variant);
    await base44.auth.updateMe({ dashboard_view_variant: variant });
    base44.analytics.track({ eventName: 'dashboard_view_variant_changed', properties: { variant } });
    window.dispatchEvent(new Event('personalization-saved'));
    onSaved?.(variant);
  };
  return <div><p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Вид дашборда</p><p className="text-xs text-slate-500 mb-3">Выберите оформление главной страницы</p><div className="grid grid-cols-2 gap-2">{DASHBOARD_VARIANTS.map((variant) => <button key={variant.id} onClick={() => choose(variant.id)} className={`dv-picker ${getDashboardVariant(variant.id).className} ${current === variant.id ? 'dv-picker-active' : ''}`}><span className="dv-preview"><i>✨</i></span><span>{variant.label}</span>{current === variant.id && <Check />}</button>)}</div></div>;
}