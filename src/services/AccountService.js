// ============================================================
// services/AccountService.js — СЕРВИС СЧЕТОВ
// ============================================================
// Единственная точка бизнес-операций над счетами. Компоненты НЕ
// обращаются к base44.entities.Account напрямую — только сюда.
//
// Отвечает за: чтение (с учётом workspace), создание/обновление с
// проверкой прав и обогащением workspace-полями, изменение баланса,
// удаление вместе со связанными транзакциями.
// ============================================================

import { getRepository } from '@/data/repositories';
import { getCurrentUser, enrichWithOwnership } from './context';
import { validateAccountOwnership, validateAccountInput, isOwner } from '@/domain/validators';
import { applyTransactionToBalance } from '@/domain/FinanceEngine';
import { eventBus, EVENTS } from '@/lib/eventBus';

const repo = () => getRepository('Account');
const txRepo = () => getRepository('Transaction');

export const AccountService = {
  /** Все счета (сырой список, фильтрация по владельцу/workspace — на уровне выборки). */
  list() {
    return repo().list();
  },

  get(id) {
    return repo().get(id);
  },

  /** Создать счёт: валидация + обогащение workspace/ownership. */
  async create(input) {
    const check = validateAccountInput(input);
    if (!check.ok) throw new Error(check.error);

    const user = await getCurrentUser();
    const data = await enrichWithOwnership(
      { ...input, balance: parseFloat(input.balance) || 0, is_active: true },
      user
    );
    const created = await repo().create(data);
    eventBus.emit(EVENTS.ACCOUNT_CHANGED, { id: created?.id, action: 'create' });
    return created;
  },

  /** Обновить счёт: проверка прав + обогащение. */
  async update(id, input) {
    const user = await getCurrentUser();
    const existing = await repo().get(id);
    const own = validateAccountOwnership(existing, user);
    if (!own.ok) throw new Error(own.error);

    const data = await enrichWithOwnership({ ...input }, user);
    const updated = await repo().update(id, data);
    eventBus.emit(EVENTS.ACCOUNT_CHANGED, { id, action: 'update' });
    return updated;
  },

  /**
   * Изменить только баланс счёта на дельту согласно типу операции.
   * Используется TransactionService — не эмитит отдельного события.
   */
  async applyBalanceDelta(account, type, amount) {
    if (!account) return null;
    const newBalance = applyTransactionToBalance(account.balance, type, amount);
    return repo().update(account.id, { balance: newBalance });
  },

  /** Прямая установка баланса (для откатов/переносов). */
  setBalance(accountId, balance) {
    return repo().update(accountId, { balance });
  },

  /** Удалить счёт вместе со связанными транзакциями (с проверкой прав). */
  async remove(id) {
    const user = await getCurrentUser();
    const account = await repo().get(id);
    if (account && !isOwner(account, user)) {
      throw new Error('Действия с данными других пользователей запрещены!');
    }
    const allTx = await txRepo().list('-date', 500);
    const related = allTx.filter((t) => t.account_id === id);
    for (const tx of related) {
      await txRepo().delete(tx.id);
    }
    await repo().delete(id);
    eventBus.emit(EVENTS.ACCOUNT_CHANGED, { id, action: 'delete' });
    eventBus.emit(EVENTS.TRANSACTION_CHANGED, { action: 'bulk-delete' });
  },
};

export default AccountService;