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
    const newAmount = (goal.current_amount || 0) + amt;
    const isCompleted = newAmount >= goal.target_amount;

    if (account) {
      await AccountService.freezeAmount(account.id, (account.frozen_amount || 0) + amt);
    }
    await TransactionService.createRaw({
      type: 'transfer',
      amount: amt,
      category: 'Перенос на цель',
      description: `${account?.name || ''} → Цель: ${goal.title}`,
      date: new Date().toISOString(),
      account_id: account?.id,
    });
    const updated = await this.update(
      goal.id,
      { current_amount: newAmount, status: isCompleted ? 'completed' : 'active' },
      { enrich: false }
    );
    eventBus.emit(EVENTS.ACCOUNT_CHANGED, { id: account?.id, action: 'update' });

    if (isCompleted) {
      base44.functions.invoke('gamificationDailyCheckin', { action: 'goal_completed', context: goal.family_id ? 'family' : undefined })
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
    const newAmount = Math.max((goal.current_amount || 0) - amt, 0);

    if (account_id) {
      await AccountService.unfreezeAndDeduct(account_id, amt);
      eventBus.emit(EVENTS.ACCOUNT_CHANGED, { id: account_id, action: 'update' });
    }

    await TransactionService.createRaw({
      type: 'expense',
      amount: amt,
      category,
      description: `${description || ''} (из цели: ${goal.title})`,
      date: new Date().toISOString(),
      account_id,
    });
    return this.update(goal.id, { current_amount: newAmount }, { enrich: false });
  },
};

export default GoalService;