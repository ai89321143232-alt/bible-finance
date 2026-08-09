import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  LayoutDashboard, ArrowLeftRight, Target, Settings as SettingsIcon,
  Wallet, Sparkles, CreditCard, TrendingUp
} from 'lucide-react';

// Все доступные вкладки для нижнего меню
export const ALL_TABS = [
  { label: 'Дашборд',  path: '/',              icon: LayoutDashboard, page: 'Dashboard' },
  { label: 'Операции', path: '/Transactions',  icon: ArrowLeftRight,  page: 'Transactions' },
  { label: 'Счета',    path: '/Accounts',     icon: CreditCard,      page: 'Accounts' },
  { label: 'Бюджеты',  path: '/Budgets',      icon: Wallet,           page: 'Budgets' },
  { label: 'Цели',     path: '/Goals',        icon: Target,           page: 'Goals' },
  { label: 'Аналитика', path: '/Analytics',    icon: TrendingUp,       page: 'Analytics' },
  { label: 'Ещё',      path: '/Settings',      icon: SettingsIcon,     page: 'Settings' },
  { label: 'AI Чат',   path: '/AIAssistant',  icon: Sparkles,         page: 'AIAssistant', isCenter: true },
];

export const DEFAULT_TAB_ORDER = ['Dashboard', 'Transactions', 'Goals', 'Budgets', 'Settings'];

/**
 * Хук возвращает настроенные вкладки нижнего меню.
 * Регулярные вкладки — в порядке пользователя.
 * Center-вкладка (AI Чат) вставляется в середину.
 */
export function useBottomTabs() {
  const { data: user } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
  });

  const tabOrder = user?.bottom_tab_order || user?.data?.bottom_tab_order || DEFAULT_TAB_ORDER;

  const regularTabs = tabOrder
    .map((page) => ALL_TABS.find((t) => t.page === page))
    .filter(Boolean);

  const centerTab = ALL_TABS.find((t) => t.isCenter);
  if (centerTab) {
    const mid = Math.ceil(regularTabs.length / 2);
    return [...regularTabs.slice(0, mid), centerTab, ...regularTabs.slice(mid)];
  }

  return regularTabs;
}