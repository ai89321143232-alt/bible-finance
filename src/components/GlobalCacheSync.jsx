import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { eventBus, EVENTS } from '@/lib/eventBus';
import { base44 } from '@/api/base44Client';

// ============================================================
// components/GlobalCacheSync.jsx — ГЛОБАЛЬНАЯ СИНХРОНИЗАЦИЯ КЭША
// ============================================================
// Два источника мгновенного обновления:
// 1. eventBus — локальные действия текущей вкладки (свои же изменения).
// 2. base44.entities.<Entity>.subscribe — realtime-события от сервера
//    (WebSocket), которые срабатывают, когда запись меняет ЛЮБОЙ член
//    семьи в другой сессии/устройстве. Без этого данные у остальных
//    участников семьи обновлялись только при ручном обновлении страницы
//    или по истечении staleTime.
// Монтируется один раз в App.jsx внутри QueryClientProvider.
// ============================================================

const QUERY_KEYS_BY_EVENT = {
  [EVENTS.TRANSACTION_CHANGED]: ['transactions', 'accounts', 'budgets', 'goals'],
  [EVENTS.ACCOUNT_CHANGED]: ['accounts', 'transactions'],
  [EVENTS.BUDGET_CHANGED]: ['budgets'],
  [EVENTS.GOAL_CHANGED]: ['goals'],
  [EVENTS.WORKSPACE_CHANGED]: ['transactions', 'accounts', 'budgets', 'goals', 'investments', 'fixed-assets'],
};

// Сущности, изменения которых должны мгновенно прилетать всем членам семьи
const REALTIME_ENTITY_QUERY_KEYS = {
  Transaction: ['transactions', 'accounts', 'budgets', 'goals'],
  Account: ['accounts', 'transactions'],
  Budget: ['budgets'],
  Goal: ['goals'],
  Investment: ['investments'],
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

  useEffect(() => {
    const unsubscribers = Object.entries(REALTIME_ENTITY_QUERY_KEYS).map(([entityName, keys]) =>
      base44.entities[entityName].subscribe(() => {
        keys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
      })
    );
    return () => unsubscribers.forEach((off) => off());
  }, [queryClient]);

  return null;
}