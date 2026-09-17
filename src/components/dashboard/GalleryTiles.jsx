import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const GROUPS = [
  { title: 'Избранное', items: [['💳', 'Мои счета', '/Accounts'], ['📈', 'Инвестиции', '/Investments'], ['📚', 'Обучение', '/Education'], ['✨', 'ИИ-советник', '/AIAdvisors']] },
  { title: 'Цели', items: [['💭', 'Желания', '/Goals'], ['🗓️', 'Финплан', '/FinancialPlanning'], ['🎯', 'Фин. цели', '/Goals'], ['✅', 'Чек-листы', '/Tasks'], ['📝', 'Заметки', '/Notes']] },
  { title: 'Бюджет', items: [['🗓️', 'Планирование', '/Budgets'], ['📊', 'Аналитика', '/Analytics'], ['🤖', 'ИИ-ассистент', '/AIAssistant'], ['🛟', 'Резерв', '/FinancialPlanning']] },
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
        {GROUPS.map((group) => (
          <section key={group.title} className="gt-group snap-start">
            <p className="gt-title">{group.title}</p>
            <div className="grid grid-cols-2 gap-2">
              {group.items.map(([emoji, label, to]) => (
                <Link key={label} to={to} className="gt-tile">
                  <span className="text-2xl leading-none">{emoji}</span>
                  <span className="gt-label">{label}</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}