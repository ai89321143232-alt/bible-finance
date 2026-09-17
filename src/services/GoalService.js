// ============================================================
// services/GoalService.js — СЕРВИС ФИНАНСОВЫХ ЦЕЛЕЙ
// ============================================================
// Единственная точка бизнес-операций над целями. Компоненты НЕ
// обращаются к base44.entities.Goal напрямую — только сюда.
//
// Отвечает за: создание/обновление с обогащением workspace/ownership,
// удаление, пополнение цели со списанием со счёта и созданием операции,
// трату из цели, эмит событий для инвалидации кэша.
// ============================================================

import { getRepository } from '@/data/repositories';
import { getCurrentUser, enrichWithOwnership } from './context';
import { validateGoalInput } from '@/domain/validators';
import { eventBus, EVENTS } from '@/lib/eventBus';
import { AccountService } from './AccountService';
import { TransactionService } from './TransactionService';
import { base44 } from '@/api/base44Client';

const repo = () => getRepository('Goal');

export const GoalService = {
  list() {
    return repo().list();
  },

  get(id) {
    return repo().get(id);
  },

  /** Создать цель: валидация + обогащение workspace/ownership. */
  async create(input) {
    const check = validateGoalInput(input);
    if (!check.ok) throw new Error(check.error);

    const user = await getCurrentUser();
    const data = await enrichWithOwnership({ ...input }, user);
    const created = await repo().create(data);
    eventBus.emit(EVENTS.GOAL_CHANGED, { id: created?.id, action: 'create' });
    return created;
  },

  /**
   * Обновить цель. enrich=false — для служебных апдейтов
   * (current_amount, status, notification_sent), которые не должны
   * менять принадлежность/workspace.
   */
  async update(id, input, { enrich = true } = {}) {
    const user = await getCurrentUser();
    const data = enrich ? await enrichWithOwnership({ ...input }, user) : { ...input };
    const updated = await repo().update(id, data);
    eventBus.emit(EVENTS.GOAL_CHANGED, { id, action: 'update' });
    return updated;
  },

  async remove(id) {
    await repo().delete(id);
    eventBus.emit(EVENTS.GOAL_CHANGED, { id, action: 'delete' });
  },

  /**
   * Пополнить цель: заморозить средства на счёте (без списания!),
   * увеличить накопления, создать операцию-перенос для истории.
   */
  async addFunds(goal, account, amount) {
    const amt = parseFloat(amount);
    const freshGoal = await repo().get(goal.id);
    const freshAccount = account ? await AccountService.get(account.id) : null;
    const newAmount = (freshGoal.current_amount || 0) + amt;
    const isCompleted = newAmount >= freshGoal.target_amount;

    if (freshAccount) {
      await AccountService.freezeAmount(freshAccount.id, (freshAccount.frozen_amount || 0) + amt);
    }
    await TransactionService.createRaw({
      type: 'transfer',
      amount: amt,
      category: 'Перенос на цель',
      description: `${freshAccount?.name || ''} → Цель: ${freshGoal.title}`,
      date: new Date().toISOString(),
      account_id: freshAccount?.id,
    });
    const updated = await this.update(
      freshGoal.id,
      { current_amount: newAmount, status: isCompleted ? 'completed' : 'active' },
      { enrich: false }
    );
    eventBus.emit(EVENTS.ACCOUNT_CHANGED, { id: freshAccount?.id, action: 'update' });

    if (isCompleted) {
      base44.functions.invoke('gamificationDailyCheckin', { action: 'goal_completed', context: freshGoal.family_id ? 'family' : undefined })
        .then(() => eventBus.emit(EVENTS.GAMIFICATION_UPDATED))
        .catch(() => {});
    }
    return updated;
  },

  /**
   * Потратить из цели: списать замороженные средства с баланса счёта,
   * разморозить, уменьшить накопления, создать операцию-расход.
   */
  async spend(goal, { amount, category, description, account_id }) {
    const amt = parseFloat(amount);
    const freshGoal = await repo().get(goal.id);
    const freshAccount = account_id ? await AccountService.get(account_id) : null;
    const newAmount = Math.max((freshGoal.current_amount || 0) - amt, 0);

    if (freshAccount) {
      await AccountService.unfreezeAndDeduct(freshAccount.id, amt);
      eventBus.emit(EVENTS.ACCOUNT_CHANGED, { id: freshAccount.id, action: 'update' });
    }

    await TransactionService.createRaw({
      type: 'expense',
      amount: amt,
      category,
      description: `${description || ''} (из цели: ${freshGoal.title})`,
      date: new Date().toISOString(),
      account_id: freshAccount?.id,
    });
    return this.update(freshGoal.id, { current_amount: newAmount }, { enrich: false });
  },

  /** Снять средства с цели: разморозить на связанных счетах без списания баланса. */
  async release(goal, amount) {
    const requested = parseFloat(amount);
    if (!requested || requested <= 0) throw new Error('Укажите сумму для снятия');

    const freshGoal = await repo().get(goal.id);
    const currentAmount = freshGoal.current_amount || 0;
    const newCurrent = Math.max(currentAmount - requested, 0);
    const releasedAmount = currentAmount - newCurrent;
    const accountIds = freshGoal.linked_account_ids?.length
      ? freshGoal.linked_account_ids
      : (freshGoal.linked_account_id ? [freshGoal.linked_account_id] : []);
    const linkedAccounts = (await Promise.all(accountIds.map((id) => AccountService.get(id)))).filter(Boolean);
    const totalFrozen = linkedAccounts.reduce((sum, account) => sum + (account.frozen_amount || 0), 0);

    await Promise.all(linkedAccounts.map(async (account, index) => {
      const share = totalFrozen > 0
        ? releasedAmount * ((account.frozen_amount || 0) / totalFrozen)
        : releasedAmount / linkedAccounts.length;
      const newFrozen = Math.max((account.frozen_amount || 0) - share, 0);
      await AccountService.freezeAmount(account.id, newFrozen);
      eventBus.emit(EVENTS.ACCOUNT_CHANGED, { id: account.id, action: 'update' });
    }));

    await TransactionService.createRaw({
      type: 'transfer',
      amount: releasedAmount,
      category: 'Возврат с цели',
      description: `Цель: ${freshGoal.title} → возврат на счёт`,
      date: new Date().toISOString(),
      account_id: linkedAccounts[0]?.id,
    });

    return this.update(freshGoal.id, { current_amount: newCurrent }, { enrich: false });
  },
};

export default GoalService;