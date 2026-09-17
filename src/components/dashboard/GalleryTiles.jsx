import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { MENU_STRUCTURE } from '@/components/Navigation/NavigationMenu';
import { useTranslation } from '@/lib/LanguageContext';
import { DEFAULT_CARD_STYLE } from '@/lib/modernIconStyles';
import ModernTileIcon from '@/components/dashboard/ModernTileIcon';
import { useTheme } from '@/lib/themeManager';

const SECTION_STYLES = {
  general: 'gt-pedestal-blue',
  finance_group: 'gt-pedestal-blue',
  planning_group: 'gt-pedestal-gold',
  family_group: 'gt-pedestal-pink',
  ai_group: 'gt-pedestal-purple',
  organizer_group: 'gt-pedestal-blue',
};

const getGroupedTiles = () => MENU_STRUCTURE.map((entry) => ({
  section: entry.type === 'group' ? entry.name : 'general',
  tiles: entry.type === 'group' ? entry.children : [entry],
}));

export default function GalleryTiles() {
  const [user, setUser] = useState(null);
  const [theme] = useTheme();
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
    const groups = getGroupedTiles().map((group) => ({
      ...group,
      tiles: group.tiles.filter((item) => !hiddenItems.includes(item.name) && !(isChildMode && item.hideInChildMode)),
    })).filter((group) => group.tiles.length);
    const count = groups.reduce((total, group) => total + group.tiles.length, 0);
    const firstRow = [];
    const secondRow = [];
    let firstCount = 0;
    groups.forEach((group) => {
      const row = firstCount < Math.ceil(count / 2) ? firstRow : secondRow;
      row.push(...group.tiles.map((tile) => ({ ...tile, section: group.section })));
      if (row === firstRow) firstCount += group.tiles.length;
    });
    return [firstRow, secondRow];
  }, [user]);

  return (
    <div className="gt-gallery">
      {rows.map((row, index) => (
        <div key={index} className="gt-row scrollbar-none snap-x snap-mandatory">
          {row.map((item) => {
            const cardStyle = user?.card_style || user?.data?.card_style || DEFAULT_CARD_STYLE;
            return (
              <Link key={item.name} to={createPageUrl(item.name)} className="gt-tile snap-start">
                <ModernTileIcon tileName={item.name} theme={theme} />
                <span className="gt-label">{item.label || t(item.labelKey)}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}