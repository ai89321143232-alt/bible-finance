import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import {
  Home, Wallet, ArrowLeftRight, CreditCard, BarChart2, PieChart, Repeat,
  Target, Lightbulb, AlertTriangle, TrendingUp, TrendingDown, Users, Baby, MessageSquare,
  Bot, MessageCircle, Sparkles, CheckSquare, ListTodo, FileText,
  GraduationCap, Library, Settings, ChevronDown
} from 'lucide-react';
import useUnreadFamilyChat from '@/hooks/useUnreadFamilyChat';
import { useTranslation } from '@/lib/LanguageContext';

// ============================================================
// Структура меню: плоские пункты (type: 'link') и группы с подменю (type: 'group')
// ============================================================
const MENU_STRUCTURE = [
  { type: 'link', name: 'Dashboard', labelKey: 'nav.dashboard', icon: Home },
  {
    type: 'group', labelKey: 'nav.finance_group', icon: Wallet,
    children: [
      { name: 'Transactions', labelKey: 'nav.transactions', icon: ArrowLeftRight },
      { name: 'Accounts', labelKey: 'nav.accounts', icon: CreditCard },
      { name: 'Categories', labelKey: 'nav.categories', icon: BarChart2 },
      { name: 'Budgets', labelKey: 'nav.budgets', icon: PieChart },
      { name: 'Subscriptions', labelKey: 'nav.subscriptions', icon: Repeat },
    ],
  },
  {
    type: 'group', labelKey: 'nav.planning_group', icon: Target,
    children: [
      { name: 'FinancialPlanning', labelKey: 'nav.financial_planning', icon: Lightbulb },
      { name: 'Goals', labelKey: 'nav.goals', icon: Target },
      { name: 'DebtAnalytics', labelKey: 'nav.debt_analytics', icon: AlertTriangle },
      { name: 'DebtPlanner', labelKey: 'nav.debt_planner', icon: TrendingDown },
      { name: 'Investments', labelKey: 'nav.investments', icon: TrendingUp, hideInChildMode: true },
    ],
  },
  { type: 'link', name: 'Analytics', labelKey: 'nav.analytics', icon: TrendingUp },
  {
    type: 'group', labelKey: 'nav.family', icon: Users,
    children: [
      { name: 'FamilyFinances', labelKey: 'nav.family_finances', icon: Users },
      { name: 'ChildExpenses', labelKey: 'nav.child_expenses', icon: Baby, hideInChildMode: true },
      { name: 'FamilyChat', labelKey: 'nav.family_chat', icon: MessageSquare },
    ],
  },
  {
    type: 'group', labelKey: 'nav.ai_group', icon: Bot,
    children: [
      { name: 'AIAssistant', labelKey: 'nav.ai_chat', icon: MessageCircle },
      { name: 'AIAdvisors', labelKey: 'nav.ai_advisors', icon: Sparkles },
      { name: 'AIPlanning', labelKey: 'nav.ai_planning', icon: Sparkles },
    ],
  },
  {
    type: 'group', labelKey: 'nav.organizer_group', icon: CheckSquare,
    children: [
      { name: 'Tasks', labelKey: 'nav.tasks', icon: ListTodo },
      { name: 'Notes', labelKey: 'nav.notes', icon: FileText },
    ],
  },
  { type: 'link', name: 'Education', labelKey: 'nav.education', icon: GraduationCap },
  { type: 'link', name: 'HelpCenter', labelKey: 'nav.library', icon: Library },
  { type: 'link', name: 'Settings', labelKey: 'nav.settings', icon: Settings },
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
  const t = useTranslation();

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
    if (manualOpen[group.name] !== undefined) return manualOpen[group.name];
    return group.children.some(c => c.name === currentPageName);
  };

  const toggleGroup = (group) => {
    setManualOpen(prev => ({ ...prev, [group.name]: !isGroupOpen(group) }));
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
        <span>{t(item.labelKey)}</span>
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
          <div key={entry.name}>
            <button
              type="button"
              onClick={() => toggleGroup(entry)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${groupActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}
              `}
            >
              <GroupIcon className={`w-4 h-4 flex-shrink-0 ${groupActive ? 'text-foreground' : 'text-muted-foreground'}`} />
              <span>{t(entry.labelKey)}</span>
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