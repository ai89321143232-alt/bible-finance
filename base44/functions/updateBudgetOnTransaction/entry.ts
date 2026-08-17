import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const payload = await req.json();

        const { event, data, old_data } = payload;

        // Обрабатываем только расходы (включая transfer, т.к. старая логика тоже их фильтровала)
        if (!data || data.type !== 'expense') {
            return Response.json({ message: 'Not an expense, skipping' });
        }

        const transactionDate = data.date ? data.date.substring(0, 10) : null;
        if (!transactionDate) {
            return Response.json({ message: 'No date, skipping' });
        }

        // Получаем все активные бюджеты пользователя/семьи
        const allBudgets = await base44.asServiceRole.entities.Budget.list();

        const matchingBudgets = allBudgets.filter(b => {
            if (!b.is_active) return false;

            // Проверяем даты
            if (b.start_date && transactionDate < b.start_date) return false;
            if (b.end_date && transactionDate > b.end_date) return false;

            // Проверяем категорию
            const budgetCategories = b.categories || (b.category ? [b.category] : []);
            const categoryMatches = budgetCategories.length === 0 || budgetCategories.includes(data.category);
            if (!categoryMatches) return false;

            // Семейный и личный бюджет с одинаковой категорией не должны оба получать один
            // и тот же расход — budget_scope (выбор пользователя при вводе операции) решает,
            // в какой именно бюджет засчитать расход, если есть совпадение.
            if (b.is_family_budget) {
                const belongsToFamily = data.family_id && b.family_id === data.family_id;
                if (!belongsToFamily) return false;
                if (data.budget_scope === 'personal') return false;
                return true;
            }

            const belongsToUser = b.user_id === data.user_id || b.created_by_id === data.user_id;
            if (!belongsToUser) return false;
            if (data.budget_scope === 'family') return false;
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
                    return data.family_id && b.family_id === data.family_id;
                }
                return b.user_id === data.user_id || b.created_by_id === data.user_id;
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
            const ownerId = budget.user_id || budget.created_by_id;
            const allTransactions = await base44.asServiceRole.entities.Transaction.filter({
                user_id: ownerId
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