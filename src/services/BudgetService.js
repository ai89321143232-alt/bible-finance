// ============================================================
// services/BudgetService.js — СЕРВИС БЮДЖЕТОВ
// ============================================================
// Единственная точка бизнес-операций над бюджетами. Компоненты НЕ
// обращаются к base44.entities.Budget напрямую — только сюда.
//
// Отвечает за: создание/обновление с обогащением workspace/ownership,
// удаление, эмит событий для инвалидации кэша.
// ============================================================

import { getRepository } from '@/data/repositories';
import { getCurrentUser, enrichWithOwnership } from './context';
import { validateBudgetInput } from '@/domain/validators';
import { eventBus, EVENTS } from '@/lib/eventBus';

const repo = () => getRepository('Budget');

// Запись лимита за текущий месяц (повторное изменение в месяце перезаписывает значение)
function withLimitHistory(history, amount, currency) {
  const month = new Date().toISOString().slice(0, 7);
  return [...(history || []).filter((h) => h.month !== month), { month, amount, currency: currency || 'RUB' }];
}

export const BudgetService = {
  list() {
    return repo().list();
  },

  get(id) {
    return repo().get(id);
  },

  /** Создать бюджет: валидация + обогащение workspace/ownership. */
  async create(input) {
    const check = validateBudgetInput(input);
    if (!check.ok) throw new Error(check.error);

    const user = await getCurrentUser();
    const data = await enrichWithOwnership(
      { ...input, limit_amount: parseFloat(input.limit_amount), is_active: true,
        limit_history: withLimitHistory([], parseFloat(input.limit_amount), input.currency) },
      user
    );
    const created = await repo().create(data);
    eventBus.emit(EVENTS.BUDGET_CHANGED, { id: created?.id, action: 'create' });
    return created;
  },

  /**
   * Обновить бюджет. Обогащение workspace/ownership применяется только
   * для полноценного редактирования; для служебных апдейтов (напр.
   * notification_sent) обогащение можно пропустить через enrich=false.
   */
  async update(id, input, { enrich = true } = {}) {
    const user = await getCurrentUser();
    const data = enrich ? await enrichWithOwnership({ ...input }, user) : { ...input };
    if (input.limit_amount !== undefined) {
      const current = await repo().get(id);
      data.limit_amount = parseFloat(input.limit_amount);
      data.limit_history = withLimitHistory(current?.limit_history, data.limit_amount, input.currency || current?.currency);
    }
    const updated = await repo().update(id, data);
    eventBus.emit(EVENTS.BUDGET_CHANGED, { id, action: 'update' });
    return updated;
  },

  async remove(id) {
    await repo().delete(id);
    eventBus.emit(EVENTS.BUDGET_CHANGED, { id, action: 'delete' });
  },
};

export default BudgetService;