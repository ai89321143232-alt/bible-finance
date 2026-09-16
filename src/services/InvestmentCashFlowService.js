import { getRepository } from '@/data/repositories';
import { getCurrentUser, enrichWithOwnership } from './context';
import { AccountService } from './AccountService';
import { TransactionService } from './TransactionService';
import { eventBus, EVENTS } from '@/lib/eventBus';

const repo = () => getRepository('InvestmentCashFlow');
const goalRepo = () => getRepository('Goal');

export const InvestmentCashFlowService = {
  list() { return repo().list('-date', 200); },
  async create(input) {
    const amount = Number(input.amount);
    if (!input.investment_id || !input.type || !amount || amount <= 0) throw new Error('Укажите тип и сумму выплаты');
    const user = await getCurrentUser();
    const data = await enrichWithOwnership({ ...input, amount, date: input.date || new Date().toISOString() }, user);
    const created = await repo().create(data);
    if (input.linked_goal_id && !input.reinvested) {
      const goal = await goalRepo().get(input.linked_goal_id);
      const nextAmount = (goal.current_amount || 0) + amount;
      await goalRepo().update(goal.id, { current_amount: nextAmount, status: nextAmount >= goal.target_amount ? 'completed' : 'active' });
      if (input.account_id) {
        const account = await AccountService.get(input.account_id);
        await AccountService.setBalance(account.id, (account.balance || 0) + amount);
        await TransactionService.createRaw({ type: 'income', amount, category: input.type === 'coupon' ? 'Купоны' : 'Дивиденды', description: `Выплата по активу: ${input.investment_name || ''}`, date: data.date, account_id: account.id });
        eventBus.emit(EVENTS.ACCOUNT_CHANGED, { id: account.id, action: 'cashflow-income' });
      }
      eventBus.emit(EVENTS.GOAL_CHANGED, { id: goal.id, action: 'cashflow' });
    }
    eventBus.emit(EVENTS.TRANSACTION_CHANGED, { action: 'cashflow-create' });
    return created;
  },
  async remove(id) { await repo().delete(id); }
};

export default InvestmentCashFlowService;