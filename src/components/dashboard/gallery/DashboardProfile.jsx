import React from 'react';
import { Sparkles } from 'lucide-react';

export default function DashboardProfile({ user, family }) {
  const name = user?.firstName || user?.full_name || 'Профиль';
  const premium = user?.subscription_tier === 'premium' || user?.subscription_tier === 'family' || family?.subscription_tier === 'premium' || family?.subscription_tier === 'family';
  return (
    <header className="ds-profile-row"><div className="ds-profile"><div className="ds-avatar">{name[0]?.toUpperCase()}</div><div><p>Добрый день, {name}</p>{premium && <span className="ds-premium">Премиум</span>}</div></div><Sparkles className="ds-profile-sparkle" /></header>
  );
}