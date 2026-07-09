import React from 'react';
import { LayoutDashboard, ArrowLeftRight, Target, Settings as SettingsIcon, Wallet } from 'lucide-react';

// ============================================================
// components/BottomTabBar.jsx — ЕДИНОЕ НИЖНЕЕ МЕНЮ (мобильные)
// ============================================================
// Общий список вкладок + общий UI, чтобы нижнее меню выглядело
// одинаково на всех страницах (и на главном экране, и на остальных).
// ============================================================
export const BOTTOM_TABS = [
  { label: 'Главная', path: '/', icon: LayoutDashboard },
  { label: 'Операции', path: '/Transactions', icon: ArrowLeftRight },
  { label: 'Цели', path: '/Goals', icon: Target },
  { label: 'Бюджеты', path: '/Budgets', icon: Wallet },
  { label: 'Ещё', path: '/Settings', icon: SettingsIcon },
];

export default function BottomTabBar({ activeIndex, onTabClick }) {
  return (
    <div
      className="lg:hidden fixed left-4 right-4 z-40"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
    >
      <div className="flex items-center justify-around py-2 px-1 rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-2xl">
        {BOTTOM_TABS.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = activeIndex === index;
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