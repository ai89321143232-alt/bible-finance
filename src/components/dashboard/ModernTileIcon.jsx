import React from 'react';
import { getModernIconAsset } from '@/lib/modernIconStyles';

export default function ModernTileIcon({ theme, tileName }) {
  return <img aria-hidden="true" alt="" className="gt-tile-card" src={getModernIconAsset(null, theme, tileName)} />;
}