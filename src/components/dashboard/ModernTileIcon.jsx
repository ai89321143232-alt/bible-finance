import React from 'react';
import { getModernIconStyle } from '@/lib/modernIconStyles';

export default function ModernTileIcon({ icon: Icon, styleKey }) {
  const style = getModernIconStyle(styleKey);

  return (
    <span className={`modern-icon modern-icon-${style.key}`} aria-hidden="true">
      <Icon className="modern-icon-glyph" strokeWidth={1.8} />
    </span>
  );
}