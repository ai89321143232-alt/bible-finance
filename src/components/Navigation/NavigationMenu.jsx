import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  LayoutDashboard, ArrowLeftRight, CreditCard, Target, TrendingUp,
  ListTodo, PieChart, Settings, Users, FileText, Lightbulb, Baby, BarChart2
} from 'lucide-react';

const MENU_ITEMS = [
  { name: 'Dashboard',         label: 'Главная',          icon: LayoutDashboard },
  { name: 'Transactions',      label: 'Операции',         icon: ArrowLeftRight },
  { name: 'Accounts',          label: 'Счета',            icon: CreditCard },
  { name: 'Budgets',           label: 'Бюджеты',          icon: PieChart },
  { name: 'Categories',        label: 'Категории',        icon: BarChart2 },
  { name: 'Analytics',         label: 'Аналитика',        icon: TrendingUp },
  { name: 'Goals',             label: 'Цели',             icon: Target },
  { name: 'Investments',       label: 'Инвестиции',       icon: TrendingUp },
  { name: 'FinancialPlanning', label: 'Финплан',          icon: Lightbulb },
  { name: 'Tasks',             label: 'Задачи',           icon: ListTodo },
  { name: 'Notes',             label: 'Заметки',          icon: FileText },
  { name: 'FamilyFinances',    label: 'Финансы семьи',    icon: Users },
  { name: 'ChildExpenses',     label: 'Расходы на детей', icon: Baby },
  { name: 'Settings',          label: 'Настройки',        icon: Settings },
];

export default function NavigationMenu({ currentPageName, onNavigate }) {
  return (
    <nav className="p-3 space-y-0.5">
      {MENU_ITEMS.map((item) => {
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