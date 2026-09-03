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
import { parseFlexibleDate } from '@/lib/parseDate';
import { offlineQueue } from '@/lib/offlineQueue';
import { base44 } from '@/api/base44Client';

const repo = () => getRepository('Transaction');
const goalRepo = () => getRepository('Goal');

const notifyChanged = (payload = {}) => eventBus.emit(EVENTS.TRANSACTION_CHANGED, payload);

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
  async saveEntry({ type, amount, category, description, date, account_id, accounts = [], existingId = null, budget_scope = undefined }) {
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
      if (prev && prev.type !== 'transfer') {
        if (prev.account_id === account_id) {
          // Тот же счёт — откатываем в рамках effectiveBalance
          effectiveBalance = prev.type === 'expense' ? effectiveBalance + prev.amount : effectiveBalance - prev.amount;
        } else {
          // Счёт сменился — откатываем старый счёт в БД, новый счёт не трогаем
          const prevAccount = await AccountService.get(prev.account_id).catch(() => null);
          if (prevAccount) {
            const reverted =
              prev.type === 'expense'
                ? (prevAccount.balance ?? 0) + prev.amount
                : (prevAccount.balance ?? 0) - prev.amount;
            await AccountService.setBalance(prevAccount.id, reverted);
          }
        }
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
        budget_scope,
      },
      user
    );

    if (existingId) {
      await repo().update(existingId, data);
      notifyChanged({ action: 'update', transaction: { id: existingId, ...data } });
    } else {
      let created;
      try {
        created = await repo().create(data);
      } catch (e) {
        // Нет интернета — ставим в очередь, покажем оптимистично
        if (!navigator.onLine) {
          const entry = offlineQueue.enqueue(data);
          notifyChanged({ action: 'create', transaction: { ...data, id: entry.id, _pending: true } });
          return { ok: true, offline: true };
        }
        throw e;
      }
      notifyChanged({ action: 'create', transaction: created });
      // Награда за транзакцию в системе духовного роста
      base44.functions.invoke('gamificationDailyCheckin', { action: 'transaction', context: data.family_id ? 'family' : undefined })
        .then(() => eventBus.emit(EVENTS.GAMIFICATION_UPDATED))
        .catch(() => {});
    }
    return { ok: true };
  },

  /**
   * Перенос: между счетами или на цель (toAccountId начинается с "goal_").
   * @returns {Promise<{ok:boolean, error?:string}>}
   */
  async transfer({ amount, description, date, account_id, toAccountId, accounts = [], goals = [], existingId = null, fxRate = null }) {
    const valid = validateTransactionInput({ type: 'transfer', amount, account_id, toAccountId });
    if (!valid.ok) return { ok: false, error: valid.error };

    const amountNum = parseFloat(amount);
    const user = await getCurrentUser();
    const source = accounts.find((a) => a.id === account_id);
    const dest = !toAccountId.startsWith('goal_') ? accounts.find((a) => a.id === toAccountId) : null;
    const isFx = !toAccountId.startsWith('goal_') && dest && source && (source.currency || 'RUB') !== (dest.currency || 'RUB');

    const own = validateAccountOwnership(source, user);
    if (!own.ok) return { ok: false, error: own.error };

    // При редактировании — откатываем старые эффекты переноса, чтобы не задваивать
    let prev = null;
    if (existingId) {
      prev = await repo().get(existingId).catch(() => null);
    }
    if (prev && prev.type === 'transfer') {
      const prevAmount = prev.amount || 0;
      const prevSource = await AccountService.get(prev.account_id).catch(() => null);
      if (prevSource) {
        if (prev.to_account_id?.startsWith('goal_')) {
          // Старый перенос был на цель — разморозить на источнике
          await AccountService.freezeAmount(prevSource.id, (prevSource.frozen_amount || 0) - prevAmount);
        } else {
          // Старый перенос был на счёт — вернуть сумму на источник
          await AccountService.setBalance(prevSource.id, (prevSource.balance || 0) + prevAmount);
        }
      }
      if (prev.to_account_id?.startsWith('goal_')) {
        const oldGoalId = prev.to_account_id.replace('goal_', '');
        const oldGoal = await goalRepo().get(oldGoalId).catch(() => null);
        if (oldGoal) {
          await goalRepo().update(oldGoalId, {
            current_amount: Math.max((oldGoal.current_amount || 0) - prevAmount, 0),
          });
          eventBus.emit(EVENTS.GOAL_CHANGED, { id: oldGoalId });
        }
      } else if (prev.to_account_id) {
        const oldDest = await AccountService.get(prev.to_account_id).catch(() => null);
        if (oldDest) {
          await AccountService.setBalance(oldDest.id, (oldDest.balance || 0) - prevAmount);
        }
      }
    }

    // Перезагружаем источник после отката
    const refreshedSource = existingId && prev ? await AccountService.get(account_id).catch(() => source) : source;
    const funds = validateSufficientFunds(refreshedSource, amountNum);
    if (!funds.ok) return { ok: false, error: funds.error };

    const isDestGoal = toAccountId.startsWith('goal_');
    let destName = '';

    if (refreshedSource) {
      if (isDestGoal) {
        await AccountService.freezeAmount(refreshedSource.id, (refreshedSource.frozen_amount || 0) + amountNum);
      } else {
        await AccountService.setBalance(refreshedSource.id, (refreshedSource.balance || 0) - amountNum);
      }
    }

    // Валютный обмен: зачисляем на получатель пересчитанную сумму в его валюте
    let fxTags = undefined;
    let destAmount = amountNum;
    if (isFx) {
      const rateNum = parseFloat(fxRate);
      if (!rateNum || rateNum <= 0) return { ok: false, error: 'Укажите курс обмена' };
      destAmount = amountNum / rateNum;
      fxTags = ['fx', `fx:${rateNum}`];
    }

    if (isDestGoal) {
      const goalId = toAccountId.replace('goal_', '');
      // Перезагружаем цель из БД — после отката старый объект из props устарел
      const goal = await goalRepo().get(goalId).catch(() => null) || goals.find((g) => g.id === goalId);
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
      // Перезагружаем счёт-получатель из БД — после отката баланс в props устарел
      const dest = await AccountService.get(toAccountId).catch(() => null) || accounts.find((a) => a.id === toAccountId);
      if (dest) {
        await AccountService.setBalance(dest.id, (dest.balance || 0) + destAmount);
        destName = dest.name;
      }
    }

    const data = await enrichWithOwnership(
      {
        type: 'transfer',
        amount: amountNum,
        category: isFx ? 'Обмен валют' : (isDestGoal ? 'Перенос на цель' : 'Перенос между счетами'),
        description: isFx
          ? `Обмен: ${source.currency || 'RUB'} → ${dest.currency || 'RUB'} @ ${parseFloat(fxRate)}${description ? ': ' + description : ''}`
          : `${refreshedSource?.name} → ${destName}${description ? ': ' + description : ''}`,
        date: date instanceof Date ? date.toISOString() : date,
        account_id,
        to_account_id: toAccountId,
        tags: fxTags,
      },
      user
    );

    if (existingId) {
      await repo().update(existingId, data);
      notifyChanged({ action: 'update', transaction: { id: existingId, ...data } });
    } else {
      let created;
      try {
        created = await repo().create(data);
      } catch (e) {
        if (!navigator.onLine) {
          const entry = offlineQueue.enqueue(data);
          notifyChanged({ action: 'create', transaction: { ...data, id: entry.id, _pending: true } });
          return { ok: true, offline: true };
        }
        throw e;
      }
      notifyChanged({ action: 'create', transaction: created });
    }
    return { ok: true };
  },

  /**
   * Пакетное добавление позиций чека как отдельных расходов + списание суммы.
   * @returns {Promise<{ok:boolean, count:number}>}
   */
  async addReceiptItems({ items = [], description, date, account_id, accounts = [] }) {
    if (!account_id) return { ok: false, error: 'Сначала создайте счёт — без счёта сохранить операцию нельзя' };
    const user = await getCurrentUser();
    const account = accounts.find((a) => a.id === account_id);
    const createdTx = [];

    for (const item of items) {
      const data = await enrichWithOwnership(
        {
          type: 'expense',
          amount: parseFloat(item.price) || 0,
          category: item.category,
          description: `${description} - ${item.name}`,
          date: date instanceof Date ? date.toISOString() : date,
          account_id: account_id || undefined,
        },
        user
      );
      try {
        const created = await repo().create(data);
        createdTx.push(created);
      } catch (e) {
        if (!navigator.onLine) {
          offlineQueue.enqueue(data);
          createdTx.push({ ...data, id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, _pending: true });
        } else {
          throw e;
        }
      }
    }

    if (account) {
      const total = items.reduce((sum, i) => sum + (parseFloat(i.price) || 0), 0);
      await AccountService.setBalance(account.id, (account.balance || 0) - total);
    }
    createdTx.forEach((tx) => notifyChanged({ action: 'create', transaction: tx }));
    return { ok: true, count: items.length };
  },

  /**
   * Пакетное добавление ОТДЕЛЬНЫХ операций из выписки банка (каждая со своими
   * датой и типом income/expense) + суммарная корректировка баланса счёта.
   * @returns {Promise<{ok:boolean, count:number}>}
   */
  async addBankOperations({ items = [], account_id, accounts = [] }) {
    if (!account_id) return { ok: false, error: 'Сначала создайте счёт — без счёта сохранить операцию нельзя' };
    const user = await getCurrentUser();
    const account = accounts.find((a) => a.id === account_id);
    let netDelta = 0;
    const createdTx = [];

    for (const item of items) {
      const itemType = item.type === 'income' ? 'income' : 'expense';
      const txDate = parseFlexibleDate(item.date) || new Date();
      const itemAmount = parseFloat(item.price) || 0;
      const data = await enrichWithOwnership(
        {
          type: itemType,
          amount: itemAmount,
          category: item.category,
          description: item.name,
          date: txDate.toISOString(),
          account_id: account_id || undefined,
        },
        user
      );
      try {
        const created = await repo().create(data);
        createdTx.push(created);
      } catch (e) {
        if (!navigator.onLine) {
          offlineQueue.enqueue(data);
          createdTx.push({ ...data, id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, _pending: true });
        } else {
          throw e;
        }
      }
      netDelta += itemType === 'income' ? itemAmount : -itemAmount;
    }

    if (account) {
      await AccountService.setBalance(account.id, (account.balance || 0) + netDelta);
    }
    createdTx.forEach((tx) => notifyChanged({ action: 'create', transaction: tx }));
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
    notifyChanged({ action: 'create', transaction: created });
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
    notifyChanged({ action: 'delete', transaction: { id } });
  },
};

export default TransactionService;