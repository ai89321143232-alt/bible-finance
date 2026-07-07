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

const repo = () => getRepository('Investment');

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
    eventBus.emit(EVENTS.ACCOUNT_CHANGED, { id: created?.id, action: 'investment-create' });
    return created;
  },

  async update(id, input) {
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
    const updated = await repo().update(id, data);
    eventBus.emit(EVENTS.ACCOUNT_CHANGED, { id, action: 'investment-update' });
    return updated;
  },

  async remove(id) {
    await repo().delete(id);
    eventBus.emit(EVENTS.ACCOUNT_CHANGED, { id, action: 'investment-delete' });
  },
};

export default InvestmentService;