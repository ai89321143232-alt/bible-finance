import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function PedestalTile({ item, index }) {
  return (
    <Link to={createPageUrl(item.page)} className={`ds-tile ds-${item.accent}`} style={{ animationDelay: `${index * 0.06}s` }}>
      <span className="ds-stage"><span className="ds-emoji">{item.icon}</span></span>
      <span className="ds-tile-name">{item.label}</span>
    </Link>
  );
}