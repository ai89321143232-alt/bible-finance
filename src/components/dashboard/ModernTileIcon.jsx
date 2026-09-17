import React from 'react';
import { getModernIconAsset } from '@/lib/modernIconStyles';

export default function ModernTileIcon({ icon: Icon, styleKey, tileName }) {
  const imageUrl = getModernIconAsset(styleKey, tileName);

  return (
    <span className="modern-icon" aria-hidden="true">
      {imageUrl ? (
        <img src={imageUrl} alt="" className="modern-icon-image" />
      ) : (
        <Icon className="modern-icon-glyph" strokeWidth={1.8} />
      )}
    </span>
  );
}