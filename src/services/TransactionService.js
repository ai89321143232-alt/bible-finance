// ============================================================
// services/TransactionService.js — СЕРВИС ОПЕРАЦИЙ
// ============================================================
// Вся бизнес-логика операций: расход, доход, перенос (между счетами
// и на цель), пакетное добавление позиций чека. Проверка прав, остатков,
// активного пространства и обновление балансов — здесь, а не в компоненте.
//
// Компоненты вызывают методы этого сервиса и получают результат
// { ok, error? }. UI отвечает только за отображение и ввод.
// ============================================================

import { getRepository } from '@/data/repositories';
import { getCurrentUser, enrichWithOwnership } from './context';
import { AccountService } from './AccountService';
import {
  validateTransactionInput,
  validateAccountOwnership,
  validateSufficientFunds,
} from '@/domain/validators';
import { eventBus, EVENTS } from '@/lib/eventBus';

const repo = () => getRepository('Transaction');
const goalRepo = () => getRepository('Goal');

const notifyChanged = () => eventBus.emit(EVENTS.TRANSACTION_CHANGED, { action: 'change' });

export const TransactionService = {
  list(sort = '-date', limit = 100) {
    return repo().list(sort, limit);
  },

  /**
   * Создать/обновить обычную операцию (expense/income) с побочными эффектами:
   * проверка прав и остатка, изменение баланса счёта.
   * @param {object} params { type, amount, category, description, date, account_id, accounts, existingId }
   * @returns {Promise<{ok:boolean, error?:string}>}
   */
  async saveEntry({ type, amount, category, description, date, account_id, accounts = [], existingId = null }) {
    const valid = validateTransactionInput({ type, amount, category, account_id });
    if (!valid.ok) return { ok: false, error: valid.error };

    const amountNum = parseFloat(amount);
    const user = await getCurrentUser();
    const account = accounts.find((a) => a.id === account_id) || (await AccountService.get(account_id));

    const own = validateAccountOwnership(account, user);
    if (!own.ok) return { ok: false, error: own.error };

    // При редактировании существующей операции сначала откатываем старую сумму,
    // чтобы баланс не удваивался/не расходился с реальностью.
    let effectiveBalance = account.balance ?? 0;
    if (existingId) {
      const prev = await repo().get(existingId).catch(() => null);
      if (prev && prev.account_id === account_id && prev.type !== 'transfer') {
        effectiveBalance = prev.type === 'expense' ? effectiveBalance + prev.amount : effectiveBalance - prev.amount;
      }
    }

    if (type === 'expense') {
      const funds = validateSufficientFunds({ ...account, balance: effectiveBalance }, amountNum);
      if (!funds.ok) return { ok: false, error: funds.error };
      await AccountService.setBalance(account.id, effectiveBalance - amountNum);
    } else if (type === 'income') {
      await AccountService.setBalance(account.id, effectiveBalance + amountNum);
    }

    const data = await enrichWithOwnership(
      {
        type,
        amount: amountNum,
        category,
        description,
        date: date instanceof Date ? date.toISOString() : date,
        account_id: account_id || undefined,
      },
      user
    );

    if (existingId) {
      await repo().update(existingId, data);
    } else {
      await repo().create(data);
    }
    notifyChanged();
    return { ok: true };
  },

  /**
   * Перенос: между счетами или на цель (toAccountId начинается с "goal_").
   * @returns {Promise<{ok:boolean, error?:string}>}
   */
  async transfer({ amount, description, date, account_id, toAccountId, accounts = [], goals = [] }) {
    const valid = validateTransactionInput({ type: 'transfer', amount, account_id, toAccountId });
    if (!valid.ok) return { ok: false, error: valid.error };

    const amountNum = parseFloat(amount);
    const user = await getCurrentUser();
    const source = accounts.find((a) => a.id === account_id);

    const own = validateAccountOwnership(source, user);
    if (!own.ok) return { ok: false, error: own.error };
    const funds = validateSufficientFunds(source, amountNum);
    if (!funds.ok) return { ok: false, error: funds.error };

    if (source) {
      await AccountService.setBalance(source.id, (source.balance || 0) - amountNum);
    }

    const isDestGoal = toAccountId.startsWith('goal_');
    let destName = '';

    if (isDestGoal) {
      const goalId = toAccountId.replace('goal_', '');
      const goal = goals.find((g) => g.id === goalId);
      if (goal) {
        const newAmount = (goal.current_amount || 0) + amountNum;
        await goalRepo().update(goalId, {
          current_amount: newAmount,
          status: newAmount >= goal.target_amount ? 'completed' : 'active',
        });
        destName = `Цель: ${goal.title}`;
        eventBus.emit(EVENTS.GOAL_CHANGED, { id: goalId });
      }
    } else {
      const dest = accounts.find((a) => a.id === toAccountId);
      if (dest) {
        await AccountService.setBalance(dest.id, (dest.balance || 0) + amountNum);
        destName = dest.name;
      }
    }

    const data = await enrichWithOwnership(
      {
        type: 'transfer',
        amount: amountNum,
        category: isDestGoal ? 'Перенос на цель' : 'Перенос между счетами',
        description: `${source?.name} → ${destName}${description ? ': ' + description : ''}`,
        date: date instanceof Date ? date.toISOString() : date,
        account_id,
      },
      user
    );
    await repo().create(data);
    notifyChanged();
    return { ok: true };
  },

  /**
   * Пакетное добавление позиций чека как отдельных расходов + списание суммы.
   * @returns {Promise<{ok:boolean, count:number}>}
   */
  async addReceiptItems({ items = [], description, date, account_id, accounts = [] }) {
    const user = await getCurrentUser();
    const account = accounts.find((a) => a.id === account_id);

    for (const item of items) {
      const data = await enrichWithOwnership(
        {
          type: 'expense',
          amount: item.price,
          category: item.category,
          description: `${description} - ${item.name}`,
          date: date instanceof Date ? date.toISOString() : date,
          account_id: account_id || undefined,
        },
        user
      );
      await repo().create(data);
    }

    if (account) {
      const total = items.reduce((sum, i) => sum + (i.price || 0), 0);
      await AccountService.setBalance(account.id, (account.balance || 0) - total);
    }
    notifyChanged();
    return { ok: true, count: items.length };
  },

  /**
   * Пакетное добавление ОТДЕЛЬНЫХ операций из выписки банка (каждая со своими
   * датой и типом income/expense) + суммарная корректировка баланса счёта.
   * @returns {Promise<{ok:boolean, count:number}>}
   */
  async addBankOperations({ items = [], account_id, accounts = [] }) {
    const user = await getCurrentUser();
    const account = accounts.find((a) => a.id === account_id);
    let netDelta = 0;

    for (const item of items) {
      const itemType = item.type === 'income' ? 'income' : 'expense';
      let txDate = new Date();
      if (item.date) {
        const parsed = new Date(item.date);
        if (!isNaN(parsed.getTime())) txDate = parsed;
      }
      const data = await enrichWithOwnership(
        {
          type: itemType,
          amount: item.price,
          category: item.category,
          description: item.name,
          date: txDate.toISOString(),
          account_id: account_id || undefined,
        },
        user
      );
      await repo().create(data);
      netDelta += itemType === 'income' ? (item.price || 0) : -(item.price || 0);
    }

    if (account) {
      await AccountService.setBalance(account.id, (account.balance || 0) + netDelta);
    }
    notifyChanged();
    return { ok: true, count: items.length };
  },

  /**
   * Низкоуровневое создание записи операции без побочных эффектов на баланс.
   * Используется, когда изменение баланса уже выполнено вызывающим кодом
   * (напр. GoalService при пополнении/трате цели).
   */
  async createRaw({ type, amount, category, description, date, account_id }) {
    const user = await getCurrentUser();
    const data = await enrichWithOwnership(
      {
        type,
        amount: parseFloat(amount),
        category,
        description,
        date: date instanceof Date ? date.toISOString() : date,
        account_id: account_id || undefined,
      },
      user
    );
    const created = await repo().create(data);
    notifyChanged();
    return created;
  },

  /** Удалить операцию с откатом баланса счёта. */
  async remove(id) {
    const all = await repo().list('-date', 500);
    const tx = all.find((t) => t.id === id);
    if (tx?.account_id && tx.type !== 'transfer') {
      const account = await AccountService.get(tx.account_id);
      if (account) {
        const reverted =
          tx.type === 'expense'
            ? (account.balance ?? 0) + tx.amount
            : (account.balance ?? 0) - tx.amount;
        await AccountService.setBalance(account.id, reverted);
      }
    }
    await repo().delete(id);
    notifyChanged();
  },
};

export default TransactionService;