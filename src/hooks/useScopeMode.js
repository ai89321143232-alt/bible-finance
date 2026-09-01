import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// ============================================================
// useScopeMode — режим просмотра «Личные / Бизнес / Всё вместе»
// ============================================================
// Читает user.scope_mode из общего кэша ['auth-me'], чтобы
// переключатель и все страницы были синхронизированы.
// setScopeMode сохраняет выбор в профиль и инвалидирует кэш.
//
// Логика фильтрации:
//   - mode === 'all' → без фильтра (все счета и операции)
//   - mode === 'personal' → только счета со scope=personal (или без scope)
//   - mode === 'business' → только счета со scope=business
//
// Для транзакций:
//   - income/expense: попадают, если account_id в выбранной области
//   - transfer: попадает в списки, если ОБА счёта в области;
//     для прибыли/убытка переводы исключаются (кросс-областные тоже).
// ============================================================

export function useScopeMode() {
  const queryClient = useQueryClient();
  const { data: user } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
  });

  const scopeMode = user?.scope_mode || user?.data?.scope_mode || 'all';

  const setScopeMode = useCallback(async (mode) => {
    try {
      await base44.auth.updateMe({ scope_mode: mode });
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
    } catch (e) {
      console.error('Failed to save scope_mode:', e);
    }
  }, [queryClient]);

  // Множество id счетов выбранной области
  const buildScopedAccountIds = useCallback((accounts) => {
    if (scopeMode === 'all') return null; // null = без фильтра
    return new Set(
      accounts
        .filter((a) => (a.scope || 'personal') === scopeMode)
        .map((a) => a.id)
    );
  }, [scopeMode]);

  // Счета выбранной области
  const filterAccounts = useCallback((accounts) => {
    if (scopeMode === 'all') return accounts;
    return accounts.filter((a) => (a.scope || 'personal') === scopeMode);
  }, [scopeMode]);

  // Транзакции для отображения в списках (включая переводы внутри области)
  const filterTransactions = useCallback((transactions, accounts) => {
    if (scopeMode === 'all') return transactions;
    const ids = buildScopedAccountIds(accounts);
    if (!ids) return transactions;
    return transactions.filter((t) => {
      const fromIn = t.account_id && ids.has(t.account_id);
      const toIn = t.to_account_id ? ids.has(t.to_account_id) : true;
      if (t.type === 'transfer') return fromIn && toIn;
      return fromIn;
    });
  }, [scopeMode, buildScopedAccountIds]);

  // Транзакции для прибыли/убытка (доходы/расходы по области, переводы исключены)
  const filterPLTransactions = useCallback((transactions, accounts) => {
    if (scopeMode === 'all') {
      return transactions.filter((t) => t.type !== 'transfer');
    }
    const ids = buildScopedAccountIds(accounts);
    if (!ids) return transactions.filter((t) => t.type !== 'transfer');
    return transactions.filter((t) => {
      if (t.type === 'transfer') return false;
      return t.account_id && ids.has(t.account_id);
    });
  }, [scopeMode, buildScopedAccountIds]);

  return {
    scopeMode,
    setScopeMode,
    filterAccounts,
    filterTransactions,
    filterPLTransactions,
    buildScopedAccountIds,
  };
}