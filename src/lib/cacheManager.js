// ============================================================
// lib/cacheManager.js — ЦЕНТРАЛИЗОВАННЫЙ МЕНЕДЖЕР КЭША
// ============================================================
// Тонкий слой поверх React Query (queryClientInstance) с:
//   - едиными ключами запросов (queryKeys) — конец «магических строк»
//   - централизованной инвалидацией по доменным событиям
//   - настройками TTL по умолчанию
//
// Сервисы после записи вызывают cacheManager.invalidate(...) вместо
// того чтобы каждый компонент вручную дёргал queryClient.invalidateQueries.
// ============================================================

import { queryClientInstance } from '@/lib/query-client';
import { eventBus, EVENTS } from '@/lib/eventBus';

// Единые ключи запросов. Используйте их вместо строк во всех useQuery.
export const queryKeys = {
  transactions: (userId, wsId) => ['transactions', userId, wsId],
  accounts: (userId, wsId) => ['accounts', userId, wsId],
  budgets: (userId, wsId) => ['budgets', userId, wsId],
  goals: (userId, wsId) => ['goals', userId, wsId],
  investments: (userId, wsId) => ['investments', userId, wsId],
  categories: () => ['categories'],
  templates: () => ['transaction-templates'],
};

// TTL по умолчанию (мс). Используется как staleTime в useQuery при желании.
export const TTL = {
  short: 30 * 1000,
  medium: 5 * 60 * 1000,
  long: 30 * 60 * 1000,
};

// Какие корневые ключи инвалидировать при доменном событии.
const INVALIDATION_MAP = {
  [EVENTS.TRANSACTION_CHANGED]: [['transactions'], ['accounts'], ['budgets'], ['goals']],
  [EVENTS.ACCOUNT_CHANGED]: [['accounts'], ['transactions']],
  [EVENTS.BUDGET_CHANGED]: [['budgets']],
  [EVENTS.GOAL_CHANGED]: [['goals']],
  [EVENTS.WORKSPACE_CHANGED]: [
    ['transactions'], ['accounts'], ['budgets'], ['goals'], ['investments'],
  ],
};

export const cacheManager = {
  /** Инвалидировать конкретные корневые ключи. */
  invalidate(keys = []) {
    keys.forEach((key) =>
      queryClientInstance.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] })
    );
  },

  /** Инвалидация по доменному событию (используется сервисами). */
  invalidateForEvent(event) {
    const keys = INVALIDATION_MAP[event];
    if (keys) this.invalidate(keys);
  },

  /** Полный сброс кэша (напр. при смене пользователя). */
  clearAll() {
    queryClientInstance.invalidateQueries();
  },
};

// Автоматическая инвалидация: слушаем доменные события и чистим кэш.
Object.keys(INVALIDATION_MAP).forEach((event) => {
  eventBus.on(event, () => cacheManager.invalidateForEvent(event));
});

export default cacheManager;