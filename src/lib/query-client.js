import { QueryClient } from '@tanstack/react-query';

// ============================================================
// lib/query-client.js — НАСТРОЙКА КЭША REACT QUERY
// ============================================================
// staleTime: 0 — данные сразу помечаются как "устаревшие".
//   При монтировании компонента кэш показывается мгновенно (без
//   мигания на null), а в фоне запускается повторный запрос.
//   Это паттерн "stale-while-revalidate": мгновенный показ + свежие данные.
//
// refetchOnWindowFocus: true — при возврате на вкладку данные
//   обновляются автоматически (важно для PWA на телефоне).
//
// refetchOnReconnect: true — при восстановлении интернета
//   все запросы перезапускаются (синхронизация после офлайна).
// ============================================================

export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
      retry: 1,
      staleTime: 0,
      gcTime: 1000 * 60 * 30, // 30 минут — кэш хранится, чтобы показать данные мгновенно при возврате
    },
  },
});