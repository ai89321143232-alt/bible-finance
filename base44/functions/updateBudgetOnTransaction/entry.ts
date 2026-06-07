import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const payload = await req.json();

        const { event, data, old_data } = payload;

        // Обрабатываем только расходы
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

            // Проверяем принадлежность бюджета пользователю или семье
            const belongsToUser = b.user_id === data.user_id || b.created_by_id === data.user_id;
            const belongsToFamily = data.family_id && b.family_id === data.family_id;
            if (!belongsToUser && !belongsToFamily) return false;

            // Проверяем даты
            if (b.start_date && transactionDate < b.start_date) return false;
            if (b.end_date && transactionDate > b.end_date) return false;

            // Проверяем категорию
            const budgetCategories = b.categories || (b.category ? [b.category] : []);
            if (budgetCategories.length === 0) return true; // бюджет без категорий — учитывает все расходы
            return budgetCategories.includes(data.category);
        });

        if (matchingBudgets.length === 0) {
            return Response.json({ message: 'No matching budgets found' });
        }

        for (const budget of matchingBudgets) {
            let delta = 0;

            if (event.type === 'create') {
                delta = data.amount || 0;
            } else if (event.type === 'update') {
                const oldAmount = (old_data && old_data.type === 'expense') ? (old_data.amount || 0) : 0;
                const newAmount = data.amount || 0;
                delta = newAmount - oldAmount;
            } else if (event.type === 'delete') {
                delta = -(data.amount || 0);
            }

            if (delta !== 0) {
                const currentSpent = budget.spent_amount || 0;
                await base44.asServiceRole.entities.Budget.update(budget.id, {
                    spent_amount: Math.max(0, currentSpent + delta)
                });
            }
        }

        return Response.json({ message: `Updated ${matchingBudgets.length} budget(s)` });
    } catch (error) {
        console.error('Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});