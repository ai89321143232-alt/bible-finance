import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { MENU_STRUCTURE } from '@/components/Navigation/NavigationMenu';
import { useTranslation } from '@/lib/LanguageContext';

const getMenuTiles = () => MENU_STRUCTURE.flatMap((item) =>
  item.type === 'group' ? item.children : [item]
);

export default function GalleryTiles() {
  const [user, setUser] = useState(null);
  const t = useTranslation();

  useEffect(() => {
    const loadUser = () => base44.auth.me().then(setUser).catch(() => {});
    loadUser();
    window.addEventListener('personalization-saved', loadUser);
    return () => window.removeEventListener('personalization-saved', loadUser);
  }, []);

  const rows = useMemo(() => {
    const hiddenItems = user?.hidden_menu_items || user?.data?.hidden_menu_items || [];
    const isChildMode = (user?.theme_preference || user?.data?.theme_preference) === 'child';
    const visibleTiles = getMenuTiles().filter((item) =>
      !hiddenItems.includes(item.name) && !(isChildMode && item.hideInChildMode)
    );
    const splitAt = Math.ceil(visibleTiles.length / 2);
    return [visibleTiles.slice(0, splitAt), visibleTiles.slice(splitAt)];
  }, [user]);

  return (
    <div className="gt-gallery">
      {rows.map((row, index) => (
        <div key={index} className="gt-row scrollbar-none snap-x snap-mandatory">
          {row.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.name} to={createPageUrl(item.name)} className="gt-tile glass-card snap-start">
                <Icon className="w-5 h-5" strokeWidth={1.8} />
                <span className="gt-label">{item.label || t(item.labelKey)}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}