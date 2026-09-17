import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const TILES = [
  ['💳', 'Мои счета', '/Accounts'], ['📈', 'Инвестиции', '/Investments'],
  ['📚', 'Обучение', '/Education'], ['✨', 'ИИ-советник', '/AIAdvisors'],
  ['💭', 'Желания', '/Goals'], ['🗓️', 'Финплан', '/FinancialPlanning'],
  ['🎯', 'Фин. цели', '/Goals'], ['✅', 'Чек-листы', '/Tasks'],
  ['📝', 'Заметки', '/Notes'], ['📊', 'Аналитика', '/Analytics'],
  ['🤖', 'ИИ-ассистент', '/AIAssistant'], ['🛟', 'Резерв', '/FinancialPlanning'],
];

export default function GalleryTiles() {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => setIsDark(document.documentElement.classList.contains('dark')));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return (
    <div className={`gt-gallery ${isDark ? 'gt-dark' : 'gt-light'}`}>
      <div className="gt-scroll scrollbar-none snap-x snap-mandatory">
        {TILES.map(([emoji, label, to]) => (
          <Link key={label} to={to} className="gt-tile snap-start">
            <span className="text-2xl leading-none">{emoji}</span>
            <span className="gt-label">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}