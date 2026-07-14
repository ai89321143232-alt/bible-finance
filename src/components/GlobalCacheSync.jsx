import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { eventBus, EVENTS } from '@/lib/eventBus';

// ============================================================
// components/GlobalCacheSync.jsx — ГЛОБАЛЬНАЯ СИНХРОНИЗАЦИЯ КЭША
// ============================================================
// Слушает события eventBus (транзакции/счета/бюджеты/цели/пространство)
// и мгновенно инвалидирует соответствующие react-query кэши, чтобы
// баланс и данные на Dashboard/Transactions обновлялись без задержек,
// не дожидаясь истечения staleTime.
// Монтируется один раз в App.jsx внутри QueryClientProvider.
// ============================================================

const QUERY_KEYS_BY_EVENT = {
  [EVENTS.TRANSACTION_CHANGED]: ['transactions', 'accounts', 'budgets', 'goals'],
  [EVENTS.ACCOUNT_CHANGED]: ['accounts', 'transactions'],
  [EVENTS.BUDGET_CHANGED]: ['budgets'],
  [EVENTS.GOAL_CHANGED]: ['goals'],
  [EVENTS.WORKSPACE_CHANGED]: ['transactions', 'accounts', 'budgets', 'goals', 'investments', 'fixed-assets'],
};

export default function GlobalCacheSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribers = Object.entries(QUERY_KEYS_BY_EVENT).map(([event, keys]) =>
      eventBus.on(event, () => {
        keys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
      })
    );
    return () => unsubscribers.forEach((off) => off());
  }, [queryClient]);

  return null;
}