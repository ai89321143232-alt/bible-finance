import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  LayoutDashboard, ArrowLeftRight, Target, Settings as SettingsIcon,
  Wallet, Sparkles, CreditCard, TrendingUp
} from 'lucide-react';
import { useTranslation } from '@/lib/LanguageContext';

// Все доступные вкладки для нижнего меню (labelKey → переводится через t())
export const ALL_TABS = [
  { labelKey: 'nav.dashboard',  path: '/',              icon: LayoutDashboard, page: 'Dashboard' },
  { labelKey: 'nav.transactions', path: '/Transactions',  icon: ArrowLeftRight,  page: 'Transactions' },
  { labelKey: 'nav.accounts',    path: '/Accounts',     icon: CreditCard,      page: 'Accounts' },
  { labelKey: 'nav.budgets',  path: '/Budgets',      icon: Wallet,           page: 'Budgets' },
  { labelKey: 'nav.goals',     path: '/Goals',        icon: Target,           page: 'Goals' },
  { labelKey: 'nav.analytics', path: '/Analytics',    icon: TrendingUp,       page: 'Analytics' },
  { labelKey: 'nav.more',      path: '/Settings',      icon: SettingsIcon,     page: 'Settings' },
  { labelKey: 'nav.ai_chat',   path: '/AIAssistant',  icon: Sparkles,         page: 'AIAssistant', isCenter: true },
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
  const { t } = useTranslation();

  const tabOrder = user?.bottom_tab_order || user?.data?.bottom_tab_order || DEFAULT_TAB_ORDER;

  const regularTabs = tabOrder
    .map((page) => ALL_TABS.find((tab) => tab.page === page))
    .filter(Boolean)
    .map((tab) => ({ ...tab, label: t(tab.labelKey) }));

  const centerTab = ALL_TABS.find((tab) => tab.isCenter);
  if (centerTab) {
    const mid = Math.ceil(regularTabs.length / 2);
    const centerLabeled = { ...centerTab, label: t(centerTab.labelKey) };
    return [...regularTabs.slice(0, mid), centerLabeled, ...regularTabs.slice(mid)];
  }

  return regularTabs;
}