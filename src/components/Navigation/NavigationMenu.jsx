import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import {
  LayoutDashboard, ArrowLeftRight, CreditCard, Target, TrendingUp,
  ListTodo, PieChart, Settings, Users, FileText, Lightbulb, Baby, BarChart2, HelpCircle
} from 'lucide-react';

const MENU_ITEMS = [
  { name: 'Dashboard',         label: 'Главная',          icon: LayoutDashboard },
  { name: 'Transactions',      label: 'Операции',         icon: ArrowLeftRight },
  { name: 'Accounts',          label: 'Счета',            icon: CreditCard },
  { name: 'Budgets',           label: 'Бюджеты',          icon: PieChart },
  { name: 'Categories',        label: 'Категории',        icon: BarChart2 },
  { name: 'Analytics',         label: 'Аналитика',        icon: TrendingUp },
  { name: 'Goals',             label: 'Цели',             icon: Target },
  { name: 'Investments',       label: 'Инвестиции',       icon: TrendingUp,  hideInChildMode: true },
  { name: 'FinancialPlanning', label: 'Финплан',          icon: Lightbulb },
  { name: 'Tasks',             label: 'Задачи',           icon: ListTodo },
  { name: 'Notes',             label: 'Заметки',          icon: FileText },
  { name: 'FamilyFinances',    label: 'Финансы семьи',    icon: Users },
  { name: 'ChildExpenses',     label: 'Расходы на детей', icon: Baby,        hideInChildMode: true },
  { name: 'HelpCenter',        label: 'База знаний',      icon: HelpCircle },
  { name: 'Settings',          label: 'Настройки',        icon: Settings },
];

// ============================================================
// components/Navigation/NavigationMenu.jsx — НАВИГАЦИОННОЕ МЕНЮ
// ============================================================
// Используется в Layout.jsx (desktop sidebar + mobile sidebar)
// Props:
//   currentPageName → имя активной страницы (для подсветки)
//   onNavigate      → коллбэк после клика (закрывает мобильное меню)
//   isChildMode     → если true — скрывает пункты с hideInChildMode: true
//
// Фильтрация видимости: читает user.data.hidden_menu_items из base44
// Обязательные пункты (Dashboard, Transactions, Settings) всегда видны
// ============================================================
export default function NavigationMenu({ currentPageName, onNavigate, isChildMode }) {
  const [hiddenItems, setHiddenItems] = useState([]);

  useEffect(() => {
    base44.auth.me().then(user => {
      setHiddenItems(user?.hidden_menu_items || user?.data?.hidden_menu_items || []);
    }).catch(() => {});
  }, []); // начальная загрузка

  // Слушаем кастомное событие для обновления меню после сохранения настроек
  useEffect(() => {
    const handler = () => {
      base44.auth.me().then(user => {
        setHiddenItems(user?.hidden_menu_items || user?.data?.hidden_menu_items || []);
      }).catch(() => {});
    };
    window.addEventListener('personalization-saved', handler);
    return () => window.removeEventListener('personalization-saved', handler);
  }, []);

  const visibleItems = MENU_ITEMS.filter(item => {
    if (isChildMode && item.hideInChildMode) return false;
    if (hiddenItems.includes(item.name)) return false;
    return true;
  });

  return (
    <nav className="p-3 space-y-0.5">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentPageName === item.name;

        return (
          <Link
            key={item.name}
            to={createPageUrl(item.name)}
            onClick={onNavigate}
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
              ${isActive
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white/80 hover:bg-white/5'
              }
            `}
          >
            <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-white/40'}`} />
            <span>{item.label}</span>
            {isActive && (
              <div className="ml-auto w-1 h-4 rounded-full bg-white opacity-70" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}