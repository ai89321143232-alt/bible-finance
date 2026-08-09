import React from 'react';
import { useBottomTabs } from '@/components/bottomTabsConfig';

// ============================================================
// components/BottomTabBar.jsx — ЕДИНОЕ НИЖНЕЕ МЕНЮ (мобильные)
// ============================================================
// Вкладки берутся из хука useBottomTabs() — порядок настраивается
// в персонализации. AI Чат (isCenter) рендерится приподнятой
// кнопкой по центру.
// ============================================================
export default function BottomTabBar({ activeIndex, onTabClick }) {
  const tabs = useBottomTabs();

  return (
    <div
      className="lg:hidden fixed left-4 right-4 z-40"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
    >
      <div className="flex items-end justify-around py-2 px-1 rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-2xl">
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = activeIndex === index;

          if (tab.isCenter) {
            return (
              <button
                key={tab.label}
                onClick={() => onTabClick(index, tab.path)}
                className={`flex flex-col items-center gap-1 px-2 py-1 rounded-xl transition-all duration-200 flex-1 ${isActive ? 'bg-accent' : ''}`}
              >
                <span
                  className={`flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-fuchsia-500 to-cyan-400 transition-all duration-200 ${isActive ? 'scale-110' : ''}`}
                  style={{ boxShadow: '0 0 8px rgba(217,70,239,0.9), 0 0 14px rgba(34,211,238,0.7)' }}
                >
                  <Icon className="w-3 h-3 text-white" />
                </span>
                <span className={`text-[10px] font-medium transition-all duration-200 ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.label}
              onClick={() => onTabClick(index, tab.path)}
              className={`flex flex-col items-center gap-1 px-2 py-1 rounded-xl transition-all duration-200 flex-1 ${isActive ? 'bg-accent' : ''}`}
            >
              <Icon className={`w-5 h-5 transition-all duration-200 ${isActive ? 'text-foreground scale-110' : 'text-muted-foreground'}`} />
              <span className={`text-[10px] font-medium transition-all duration-200 ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}