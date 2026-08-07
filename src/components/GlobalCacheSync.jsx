import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { eventBus, EVENTS } from '@/lib/eventBus';
import { base44 } from '@/api/base44Client';
import { offlineQueue } from '@/lib/offlineQueue';
import { getRepository } from '@/data/repositories';

// ============================================================
// components/GlobalCacheSync.jsx — ГЛОБАЛЬНАЯ СИНХРОНИЗАЦИЯ КЭША
// ============================================================
// Три источника мгновенного обновления:
// 1. eventBus — локальные действия текущей вкладки (свои же изменения).
//    При создании/удалении транзакции — оптимистичное обновление кэша:
//    новая запись появляется в UI мгновенно, не дожидаясь refetch.
// 2. base44.entities.<Entity>.subscribe — realtime-события от сервера
//    (WebSocket), которые срабатывают когда ЛЮБОЙ член семьи меняет
//    данные в другой сессии/устройстве.
// 3. online event — при восстановлении интернета обрабатывается
//    офлайн-очередь транзакций, сохранённых в localStorage.
// Монтируется один раз в App.jsx внутри QueryClientProvider.
// ============================================================

const QUERY_KEYS_BY_EVENT = {
  [EVENTS.TRANSACTION_CHANGED]: ['transactions', 'accounts', 'budgets', 'goals'],
  [EVENTS.ACCOUNT_CHANGED]: ['accounts', 'transactions'],
  [EVENTS.BUDGET_CHANGED]: ['budgets'],
  [EVENTS.GOAL_CHANGED]: ['goals'],
  [EVENTS.WORKSPACE_CHANGED]: ['transactions', 'accounts', 'budgets', 'goals', 'investments', 'fixed-assets'],
};

const REALTIME_ENTITY_QUERY_KEYS = {
  Transaction: ['transactions', 'accounts', 'budgets', 'goals'],
  Account: ['accounts', 'transactions'],
  Budget: ['budgets'],
  Goal: ['goals'],
  Investment: ['investments'],
};

export default function GlobalCacheSync() {
  const queryClient = useQueryClient();

  // 1. eventBus → оптимистичные обновления + инвалидация
  useEffect(() => {
    const unsubscribers = Object.entries(QUERY_KEYS_BY_EVENT).map(([event, keys]) =>
      eventBus.on(event, (payload) => {
        // Оптимистичное обновление кэша транзакций
        if (event === EVENTS.TRANSACTION_CHANGED && payload?.action && payload?.transaction) {
          const tx = payload.transaction;
          queryClient.setQueriesData({ queryKey: ['transactions'] }, (old = []) => {
            if (payload.action === 'create') {
              if (old.some((t) => t.id === tx.id)) return old;
              return [tx, ...old];
            }
            if (payload.action === 'delete') {
              return old.filter((t) => t.id !== tx.id);
            }
            if (payload.action === 'update') {
              return old.map((t) => (t.id === tx.id ? { ...t, ...tx } : t));
            }
            return old;
          });
        }

        // Инвалидация для фонового обновления (сверка с сервером)
        keys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
      })
    );
    return () => unsubscribers.forEach((off) => off());
  }, [queryClient]);

  // 2. Realtime WebSocket → инвалидация при изменениях от других участников
  useEffect(() => {
    const unsubscribers = Object.entries(REALTIME_ENTITY_QUERY_KEYS).map(([entityName, keys]) =>
      base44.entities[entityName].subscribe(() => {
        keys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
      })
    );
    return () => unsubscribers.forEach((off) => off());
  }, [queryClient]);

  // 3. Восстановление интернета → обработка офлайн-очереди
  useEffect(() => {
    const handleOnline = async () => {
      const queue = offlineQueue.peekAll();
      if (queue.length === 0) return;

      const repo = getRepository('Transaction');
      await offlineQueue.processQueue(async (entry) => {
        const { id, created_at, ...txData } = entry;
        const created = await repo.create(txData);
        // Удаляем временную офлайн-запись из кэша, добавляем реальную
        queryClient.setQueriesData({ queryKey: ['transactions'] }, (old = []) => {
          const withoutTemp = old.filter((t) => t.id !== entry.id);
          return [created, ...withoutTemp];
        });
        return true;
      });

      // Финальная инвалидация для полной сверки
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    };

    // Если уже онлайн при монтировании — тоже проверяем очередь
    if (navigator.onLine) handleOnline();

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [queryClient]);

  return null;
}