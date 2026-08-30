import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const payload = await req.json();

        const { event, data, old_data } = payload;

        // Не доверяем полям из тела запроса (data.user_id/category/family_id/amount и т.д.) —
        // внешний злоумышленник мог бы подделать их, чтобы повлиять на чужой бюджет.
        // Определяем транзакцию по event.entity_id и берём ВСЕ поля из реальной записи БД.
        // Для события delete запись уже удалена — используем old_data (снимок до удаления).
        const entityId = event?.entity_id || data?.id;
        if (!entityId) {
            return Response.json({ message: 'No entity_id, skipping' });
        }

        let txn = null;
        if (event?.type !== 'delete') {
            txn = await base44.asServiceRole.entities.Transaction.get(entityId).catch(() => null);
        }
        const source = txn || old_data;
        if (!source) {
            return Response.json({ message: 'Transaction not found, skipping' });
        }

        // Обрабатываем только расходы (включая transfer, т.к. старая логика тоже их фильтровала)
        if (source.type !== 'expense') {
            return Response.json({ message: 'Not an expense, skipping' });
        }

        const transactionDate = source.date ? source.date.substring(0, 10) : null;
        if (!transactionDate) {
            return Response.json({ message: 'No date, skipping' });
        }

        // Реальные поля владельца/категории/семьи — из БД, не из тела
        const ownerId = source.user_id || source.created_by_id;
        const category = source.category;
        const familyId = source.family_id;
        const budgetScope = source.budget_scope;

        // Получаем все активные бюджеты пользователя/семьи
        const allBudgets = await base44.asServiceRole.entities.Budget.list();

        const matchingBudgets = allBudgets.filter(b => {
            if (!b.is_active) return false;

            // Проверяем даты
            if (b.start_date && transactionDate < b.start_date) return false;
            if (b.end_date && transactionDate > b.end_date) return false;

            // Проверяем категорию
            const budgetCategories = b.categories || (b.category ? [b.category] : []);
            const categoryMatches = budgetCategories.length === 0 || budgetCategories.includes(category);
            if (!categoryMatches) return false;

            // Семейный и личный бюджет с одинаковой категорией не должны оба получать один
            // и тот же расход — budget_scope (выбор пользователя при вводе операции) решает,
            // в какой именно бюджет засчитать расход, если есть совпадение.
            if (b.is_family_budget) {
                const belongsToFamily = familyId && b.family_id === familyId;
                if (!belongsToFamily) return false;
                if (budgetScope === 'personal') return false;
                return true;
            }

            const belongsToUser = b.user_id === ownerId || b.created_by_id === ownerId;
            if (!belongsToUser) return false;
            if (budgetScope === 'family') return false;
            return true;
        });

        if (matchingBudgets.length === 0) {
            // Fallback: если категория не привязана ни к одному бюджету,
            // ищем бюджет "Прочее" (или "Другое") у того же пользователя/семьи
            // и засчитываем расход туда
            const fallbackBudget = allBudgets.find(b => {
                if (!b.is_active) return false;
                const name = (b.name || '').toLowerCase();
                if (name !== 'прочее' && name !== 'другое') return false;
                if (b.is_family_budget) {
                    return familyId && b.family_id === familyId;
                }
                return b.user_id === ownerId || b.created_by_id === ownerId;
            });
            if (fallbackBudget) {
                matchingBudgets.push(fallbackBudget);
            } else {
                return Response.json({ message: 'No matching budgets found' });
            }
        }

        // Идемпотентный пересчёт: вместо инкрементального обновления (которое
        // даёт задвоение при повторном срабатывании автоматизации), полностью
        // пересчитываем spent_amount из реальных транзакций текущего периода.
        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

        for (const budget of matchingBudgets) {
            const budgetCategories = budget.categories || (budget.category ? [budget.category] : []);

            // Загружаем все транзакции владельца бюджета за текущий период
            const budgetOwnerId = budget.user_id || budget.created_by_id;
            const allTransactions = await base44.asServiceRole.entities.Transaction.filter({
                user_id: budgetOwnerId
            });

            const realSpent = allTransactions
                .filter(t => {
                    if (t.type !== 'expense') return false;
                    if (budgetCategories.length > 0 && !budgetCategories.includes(t.category)) return false;
                    if (new Date(t.date) < periodStart) return false;
                    if (budget.is_family_budget) {
                        return t.budget_scope !== 'personal';
                    }
                    return t.budget_scope !== 'family';
                })
                .reduce((sum, t) => sum + (t.amount || 0), 0);

            await base44.asServiceRole.entities.Budget.update(budget.id, {
                spent_amount: realSpent
            });
        }

        return Response.json({ message: `Recalculated ${matchingBudgets.length} budget(s)` });
    } catch (error) {
        console.error('Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});