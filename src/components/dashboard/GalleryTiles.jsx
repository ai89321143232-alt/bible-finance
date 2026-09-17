import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { MENU_STRUCTURE } from '@/components/Navigation/NavigationMenu';
import { useTranslation } from '@/lib/LanguageContext';
import { DEFAULT_ICON_STYLE } from '@/lib/modernIconStyles';
import ModernTileIcon from '@/components/dashboard/ModernTileIcon';

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
  const [icons, setIcons] = useState({});
  const t = useTranslation();

  useEffect(() => {
    const loadUser = () => base44.auth.me().then((nextUser) => {
      setUser(nextUser);
      setIcons(nextUser?.modern_tile_icons || nextUser?.data?.modern_tile_icons || {});
    }).catch(() => {});
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

  useEffect(() => {
    if (!user) return;
    const missingTiles = rows.flat().filter((item) => !icons[item.name]);
    if (!missingTiles.length) return;
    let cancelled = false;
    const createIcons = async () => {
      const created = { ...icons };
      const selectedIconStyle = getModernIconStyle(user?.modern_icon_style || user?.data?.modern_icon_style || DEFAULT_ICON_STYLE);
      for (const item of missingTiles) {
        const style = SECTION_STYLES[item.section] || SECTION_STYLES.general;
        const label = item.label || t(item.labelKey);
        try {
          const result = await base44.integrations.Core.GenerateImage({
            prompt: `A single premium 3D cartoon app icon representing ${label} for a personal finance app. Isolated centered object only, ${selectedIconStyle.promptSuffix}, ${style.prompt} pastel palette, soft studio lighting, fully transparent background, with a soft natural drop shadow directly beneath the object, no backdrop, no text, no letters, no device frame.`,
          });
          if (cancelled) return;
          created[item.name] = result.url;
          setIcons({ ...created });
        } catch {
          continue;
        }
      }
      await base44.auth.updateMe({ modern_tile_icons: created });
    };
    createIcons();
    return () => { cancelled = true; };
  }, [user, rows, t]);

  return (
    <div className="gt-gallery">
      {rows.map((row, index) => (
        <div key={index} className="gt-row scrollbar-none snap-x snap-mandatory">
          {row.map((item) => {
            const Icon = item.icon;
            const style = SECTION_STYLES[item.section] || SECTION_STYLES.general;
            return (
              <Link key={item.name} to={createPageUrl(item.name)} className="gt-tile snap-start">
                <span className={`gt-pedestal ${style.className}`}>
                  {icons[item.name] ? <img src={icons[item.name]} alt="" className="gt-icon-image" /> : <Icon className="gt-icon-placeholder" strokeWidth={1.8} />}
                </span>
                <span className="gt-label">{item.label || t(item.labelKey)}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}