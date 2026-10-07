import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { calcBudgetSpent, normalizeCategory } from '../../shared/budgetSpent.ts';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const payload = await req.json();

        const { event, data, old_data } = payload;

        // Не доверяем полям из тела запроса — берём ВСЕ поля из реальной записи БД.
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

        // Обрабатываем только расходы (transfer исключён — переводы не являются расходами бюджета)
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

        // #4: Отсутствующий budget_scope трактуется как 'personal' (нет family_id)
        // или 'family' (есть family_id) — это исключает задвоение расхода
        // одновременно в личном и семейном бюджете.
        const effectiveBudgetScope = budgetScope || (familyId ? 'family' : 'personal');

        // Загружаем только бюджеты владельца операции (personal) и семьи (family),
        // а не все бюджеты приложения — иначе на росте базы каждый вебхук тратит квоты.
        const [userBudgets, familyBudgets] = await Promise.all([
            base44.asServiceRole.entities.Budget.filter({ user_id: ownerId, is_active: true }).catch(() => []),
            familyId
                ? base44.asServiceRole.entities.Budget.filter({ family_id: familyId, is_active: true }).catch(() => [])
                : Promise.resolve([])
        ]);
        const allBudgets = [...userBudgets, ...familyBudgets];

        const matchingBudgets = allBudgets.filter(b => {
            if (!b.is_active) return false;

            // Проверяем даты
            if (b.start_date && transactionDate < b.start_date) return false;
            if (b.end_date && transactionDate > b.end_date) return false;

            // Проверяем категорию
            const budgetCategories = b.categories || (b.category ? [b.category] : []);
            const normCategory = normalizeCategory(category);
            const categoryMatches = budgetCategories.length === 0 || budgetCategories.some((c) => normalizeCategory(c) === normCategory);
            if (!categoryMatches) return false;

            // Семейный и личный бюджет с одинаковой категорией не должны оба получать
            // один и тот же расход — effectiveBudgetScope решает, в какой именно.
            if (b.is_family_budget) {
                const belongsToFamily = familyId && b.family_id === familyId;
                if (!belongsToFamily) return false;
                return effectiveBudgetScope !== 'personal';
            }

            const belongsToUser = b.user_id === ownerId || b.created_by_id === ownerId;
            if (!belongsToUser) return false;
            return effectiveBudgetScope !== 'family';
        });

        if (matchingBudgets.length === 0) {
            // #8: Fallback — бюджет "Прочее" с проверкой периода (как в основном matching)
            const fallbackBudget = allBudgets.find(b => {
                if (!b.is_active) return false;
                const name = (b.name || '').toLowerCase();
                if (name !== 'прочее' && name !== 'другое') return false;
                // Проверяем попадание даты операции в период бюджета
                if (b.start_date && transactionDate < b.start_date) return false;
                if (b.end_date && transactionDate > b.end_date) return false;
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

        // Идемпотентный пересчёт: используем единую формулу calcBudgetSpent
        // (тот же код, что и в UI — BudgetOverview).
        // Загружаем только счета и транзакции владельца бюджета, а не все записи приложения.
        const budgetOwnerIds = [...new Set(matchingBudgets.map(b => b.user_id || b.created_by_id).filter(Boolean))];
        const accountScopeMap = new Map();
        const transactionsByOwner = {};

        await Promise.all(budgetOwnerIds.map(async (oid) => {
            const [accs, txs] = await Promise.all([
                base44.asServiceRole.entities.Account.filter({ user_id: oid }).catch(() => []),
                base44.asServiceRole.entities.Transaction.filter({ user_id: oid }).catch(() => [])
            ]);
            for (const a of accs) accountScopeMap.set(a.id, a.scope || 'personal');
            transactionsByOwner[oid] = txs;
        }));

        for (const budget of matchingBudgets) {
            const budgetOwnerId = budget.user_id || budget.created_by_id;
            const allTransactions = transactionsByOwner[budgetOwnerId] || [];
            const realSpent = calcBudgetSpent(budget, allTransactions, budgetOwnerId, accountScopeMap);
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