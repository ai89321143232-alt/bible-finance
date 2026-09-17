import React from 'react';
import { getCardTilePosition, getModernIconAsset, INDIVIDUAL_CARD_STYLES } from '@/lib/modernIconStyles';

export default function ModernTileIcon({ styleKey, theme, tileName }) {
  const imageUrl = getModernIconAsset(styleKey, theme, tileName);
  const { x, y } = getCardTilePosition(tileName);

  return (
    <span
      aria-hidden="true"
      className="gt-tile-card"
      style={{
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: INDIVIDUAL_CARD_STYLES.includes(styleKey) ? 'cover' : '600% 400%',
        backgroundPosition: INDIVIDUAL_CARD_STYLES.includes(styleKey) ? 'center' : `${x * 20}% ${y * (100 / 3)}%`,
      }}
    />
  );
}