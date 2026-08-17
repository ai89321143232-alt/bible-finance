import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import {
  Home, Wallet, ArrowLeftRight, CreditCard, BarChart2, PieChart,
  Target, Lightbulb, AlertTriangle, TrendingUp, TrendingDown, Users, Baby, MessageSquare,
  Bot, MessageCircle, Sparkles, CheckSquare, ListTodo, FileText,
  GraduationCap, Library, Settings, ChevronDown
} from 'lucide-react';
import useUnreadFamilyChat from '@/hooks/useUnreadFamilyChat';

// ============================================================
// Структура меню: плоские пункты (type: 'link') и группы с подменю (type: 'group')
// ============================================================
const MENU_STRUCTURE = [
  { type: 'link', name: 'Dashboard', label: 'Дашборд', icon: Home },
  {
    type: 'group', label: 'Финансы', icon: Wallet,
    children: [
      { name: 'Transactions', label: 'Операции', icon: ArrowLeftRight },
      { name: 'Accounts', label: 'Счета', icon: CreditCard },
      { name: 'Categories', label: 'Категории', icon: BarChart2 },
      { name: 'Budgets', label: 'Бюджеты', icon: PieChart },
    ],
  },
  {
    type: 'group', label: 'Планирование', icon: Target,
    children: [
      { name: 'FinancialPlanning', label: 'Финплан', icon: Lightbulb },
      { name: 'Goals', label: 'Цели', icon: Target },
      { name: 'DebtAnalytics', label: 'Аналитика долгов', icon: AlertTriangle },
      { name: 'DebtPlanner', label: 'План погашения', icon: TrendingDown },
      { name: 'Investments', label: 'Инвестиции', icon: TrendingUp, hideInChildMode: true },
    ],
  },
  { type: 'link', name: 'Analytics', label: 'Аналитика', icon: TrendingUp },
  {
    type: 'group', label: 'Семья', icon: Users,
    children: [
      { name: 'FamilyFinances', label: 'Финансы семьи', icon: Users },
      { name: 'ChildExpenses', label: 'Расходы на детей', icon: Baby, hideInChildMode: true },
      { name: 'FamilyChat', label: 'Семейный чат', icon: MessageSquare },
    ],
  },
  {
    type: 'group', label: 'AI', icon: Bot,
    children: [
      { name: 'AIAssistant', label: 'AI Чат', icon: MessageCircle },
      { name: 'AIAdvisors', label: 'AI Ассистенты', icon: Sparkles },
    ],
  },
  {
    type: 'group', label: 'Органайзер', icon: CheckSquare,
    children: [
      { name: 'Tasks', label: 'Задачи', icon: ListTodo },
      { name: 'Notes', label: 'Заметки', icon: FileText },
    ],
  },
  { type: 'link', name: 'Education', label: 'Обучение', icon: GraduationCap },
  { type: 'link', name: 'HelpCenter', label: 'Библиотека', icon: Library },
  { type: 'link', name: 'Settings', label: 'Настройки', icon: Settings },
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
// Группы с подменю автоматически раскрываются, если внутри есть активная страница
// ============================================================
export default function NavigationMenu({ currentPageName, onNavigate, isChildMode }) {
  const [hiddenItems, setHiddenItems] = useState([]);
  const [manualOpen, setManualOpen] = useState({});
  const { data: unreadChatCount = 0 } = useUnreadFamilyChat();

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

  const isItemVisible = (item) => {
    if (isChildMode && item.hideInChildMode) return false;
    if (hiddenItems.includes(item.name)) return false;
    return true;
  };

  const isGroupOpen = (group) => {
    if (manualOpen[group.label] !== undefined) return manualOpen[group.label];
    return group.children.some(c => c.name === currentPageName);
  };

  const toggleGroup = (group) => {
    setManualOpen(prev => ({ ...prev, [group.label]: !isGroupOpen(group) }));
  };

  const renderLink = (item, isChild) => {
    const Icon = item.icon;
    const isActive = currentPageName === item.name;
    return (
      <Link
        key={item.name}
        to={createPageUrl(item.name)}
        onClick={onNavigate}
        className={`
          flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-colors
          ${isChild ? 'pl-9 pr-3' : 'px-3'}
          ${isActive
            ? 'bg-accent text-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          }
        `}
      >
        <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-foreground' : 'text-muted-foreground'}`} />
        <span>{item.label}</span>
        {item.name === 'FamilyChat' && unreadChatCount > 0 && (
          <span className="ml-auto flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-fuchsia-600 text-white text-[10px] font-semibold">
            {unreadChatCount > 9 ? '9+' : unreadChatCount}
          </span>
        )}
        {isActive && item.name !== 'FamilyChat' && (
          <div className="ml-auto w-1 h-4 rounded-full bg-foreground opacity-70" />
        )}
      </Link>
    );
  };

  return (
    <nav className="p-3 space-y-0.5">
      {MENU_STRUCTURE.map((entry) => {
        if (entry.type === 'link') {
          if (!isItemVisible(entry)) return null;
          return renderLink(entry, false);
        }

        // Группа с подменю
        const visibleChildren = entry.children.filter(isItemVisible);
        if (visibleChildren.length === 0) return null;

        const GroupIcon = entry.icon;
        const open = isGroupOpen(entry);
        const groupActive = visibleChildren.some(c => c.name === currentPageName);

        return (
          <div key={entry.label}>
            <button
              type="button"
              onClick={() => toggleGroup(entry)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${groupActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}
              `}
            >
              <GroupIcon className={`w-4 h-4 flex-shrink-0 ${groupActive ? 'text-foreground' : 'text-muted-foreground'}`} />
              <span>{entry.label}</span>
              <ChevronDown className={`w-3.5 h-3.5 ml-auto flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
              <div className="space-y-0.5 mt-0.5">
                {visibleChildren.map((child) => renderLink(child, true))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}