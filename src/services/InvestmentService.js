// ============================================================
// services/InvestmentService.js — СЕРВИС ИНВЕСТИЦИЙ
// ============================================================
// Единственная точка бизнес-операций над инвестициями. Компоненты НЕ
// обращаются к base44.entities.Investment напрямую — только сюда.
// ============================================================

import { getRepository } from '@/data/repositories';
import { getCurrentUser, enrichWithOwnership } from './context';
import { validateInvestmentInput } from '@/domain/validators';
import { eventBus, EVENTS } from '@/lib/eventBus';
import { INVESTMENT_CATEGORY } from '@/lib/investmentConstants';

const repo = () => getRepository('Investment');
const txRepo = () => getRepository('Transaction');
const accountRepo = () => getRepository('Account');
const goalRepo = () => getRepository('Goal');

const syncGoalLinks = async (investment, previousGoalIds = []) => {
  const nextGoalIds = investment.linked_goal_ids || [];
  const affectedIds = [...new Set([...previousGoalIds, ...nextGoalIds])];
  await Promise.all(affectedIds.map(async (goalId) => {
    const goal = await goalRepo().get(goalId);
    const current = goal.linked_investment_ids || [];
    const linked_investment_ids = nextGoalIds.includes(goalId)
      ? [...new Set([...current, investment.id])]
      : current.filter((id) => id !== investment.id);
    await goalRepo().update(goalId, { linked_investment_ids });
  }));
};

export const InvestmentService = {
  list() {
    return repo().list();
  },

  get(id) {
    return repo().get(id);
  },

  async create(input) {
    const check = validateInvestmentInput(input);
    if (!check.ok) throw new Error(check.error);

    const user = await getCurrentUser();
    const data = await enrichWithOwnership(
      {
        ...input,
        quantity: parseFloat(input.quantity),
        purchase_price: parseFloat(input.purchase_price),
        current_price: parseFloat(input.current_price) || parseFloat(input.purchase_price),
      },
      user
    );
    const created = await repo().create(data);
    await syncGoalLinks(created);
    eventBus.emit(EVENTS.ACCOUNT_CHANGED, { id: created?.id, action: 'investment-create' });
    eventBus.emit(EVENTS.GOAL_CHANGED, { action: 'investment-create' });
    return created;
  },

  /**
   * Создать инвестицию + связанную транзакцию-расход (покупка актива со счёта).
   * Транзакция получает категорию INVESTMENT_CATEGORY, которая исключается
   * из статистики повседневных трат, но корректно списывает баланс счёта.
   * @param {object} input - данные инвестиции
   * @param {object} options - { account_id, create_transaction }
   * @returns {Promise<{investment: object, transaction?: object}>}
   */
  async createWithTransaction(input, { account_id, create_transaction } = {}) {
    const investment = await this.create(input);

    let transaction = null;
    if (create_transaction && account_id) {
      const user = await getCurrentUser();
      const totalCost = parseFloat(input.quantity) * parseFloat(input.purchase_price);

      // Списываем со счёта
      const account = await accountRepo().get(account_id);
      if (account) {
        const newBalance = (account.balance || 0) - totalCost;
        await accountRepo().update(account_id, { balance: newBalance });
      }

      // Создаём транзакцию-расход с категорией "Инвестиции"
      const txData = await enrichWithOwnership(
        {
          type: 'expense',
          amount: totalCost,
          category: INVESTMENT_CATEGORY,
          description: `Покупка актива: ${input.name}`,
          date: new Date().toISOString(),
          account_id,
        },
        user
      );
      transaction = await txRepo().create(txData);
      eventBus.emit(EVENTS.TRANSACTION_CHANGED, { action: 'create', transaction });
      eventBus.emit(EVENTS.ACCOUNT_CHANGED, { id: account_id, action: 'balance-update' });
    }

    return { investment, transaction };
  },

  async update(id, input) {
    const existing = await repo().get(id);
    const user = await getCurrentUser();
    const data = await enrichWithOwnership({
      ...input,
      quantity: parseFloat(input.quantity),
      purchase_price: parseFloat(input.purchase_price),
      current_price: parseFloat(input.current_price) || parseFloat(input.purchase_price),
    }, user);
    const updated = await repo().update(id, data);
    await syncGoalLinks(updated, existing?.linked_goal_ids || []);
    eventBus.emit(EVENTS.ACCOUNT_CHANGED, { id, action: 'investment-update' });
    eventBus.emit(EVENTS.GOAL_CHANGED, { action: 'investment-update' });
    return updated;
  },

  async remove(id) {
    await repo().delete(id);
    eventBus.emit(EVENTS.ACCOUNT_CHANGED, { id, action: 'investment-delete' });
  },

  async removeWithTransfer(id, { account_id, amount }) {
    const investment = await this.get(id);
    const account = await accountRepo().get(account_id);
    const transferAmount = parseFloat(amount);
    const user = await getCurrentUser();

    const transaction = await txRepo().create(await enrichWithOwnership({
      type: 'income',
      amount: transferAmount,
      category: INVESTMENT_CATEGORY,
      description: `Продажа актива: ${investment.name}`,
      date: new Date().toISOString(),
      account_id,
      scope: investment.scope || 'personal'
    }, user));

    await accountRepo().update(account_id, { balance: (account.balance || 0) + transferAmount });
    await repo().delete(id);
    eventBus.emit(EVENTS.TRANSACTION_CHANGED, { action: 'create', transaction });
    eventBus.emit(EVENTS.ACCOUNT_CHANGED, { id: account_id, action: 'investment-transfer' });
  },
};

export default InvestmentService;