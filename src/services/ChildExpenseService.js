import { base44 } from '@/api/base44Client';
import { TransactionService } from '@/services/TransactionService';
import { enrichWithOwnership, getCurrentUser } from '@/services/context';

const transactionDescription = ({ child_name, category, description }) =>
  `Ребёнок: ${child_name} · ${category}${description ? ` — ${description}` : ''}`;

export const ChildExpenseService = {
  async create(input, accounts) {
    const transactionResult = await TransactionService.saveEntry({
      type: 'expense', amount: input.amount, category: 'Дети',
      description: transactionDescription(input), date: input.date,
      account_id: input.account_id, accounts, tags: ['child_expense', input.child_name],
    });
    if (!transactionResult.ok || !transactionResult.transaction) throw new Error(transactionResult.error || 'Не удалось создать операцию');
    const user = await getCurrentUser();
    const account = accounts.find((item) => item.id === input.account_id);
    return base44.entities.ChildExpense.create(await enrichWithOwnership({
      ...input, amount: Number(input.amount), currency: account?.currency || 'RUB', transaction_id: transactionResult.transaction.id,
    }, user));
  },

  async update(expense, input, accounts) {
    const transactionResult = await TransactionService.saveEntry({
      type: 'expense', amount: input.amount, category: 'Дети',
      description: transactionDescription(input), date: input.date,
      account_id: input.account_id, accounts, existingId: expense.transaction_id,
      tags: ['child_expense', input.child_name],
    });
    if (!transactionResult.ok) throw new Error(transactionResult.error || 'Не удалось обновить операцию');
    const account = accounts.find((item) => item.id === input.account_id);
    return base44.entities.ChildExpense.update(expense.id, {
      ...input, amount: Number(input.amount), currency: account?.currency || 'RUB', transaction_id: expense.transaction_id,
    });
  },

  async remove(expense) {
    if (expense.transaction_id) await TransactionService.remove(expense.transaction_id);
    return base44.entities.ChildExpense.delete(expense.id);
  },
};

export default ChildExpenseService;