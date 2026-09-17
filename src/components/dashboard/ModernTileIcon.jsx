import React from 'react';
import { getCardTilePosition, getModernIconAsset } from '@/lib/modernIconStyles';

export default function ModernTileIcon({ styleKey, theme, tileName }) {
  const imageUrl = getModernIconAsset(styleKey, theme, tileName);
  const { x, y } = getCardTilePosition(tileName);

  return (
    <span
      aria-hidden="true"
      className="gt-tile-card"
      style={{
        backgroundImage: `url(${imageUrl})`,
        backgroundPosition: `${x * 20}% ${y * (100 / 3)}%`,
      }}
    />
  );
}