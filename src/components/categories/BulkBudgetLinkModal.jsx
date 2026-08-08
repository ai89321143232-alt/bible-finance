import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link2, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ============================================================
// BulkBudgetLinkModal — массовая привязка категорий к бюджетам
// ============================================================
// Показывает все категории расходов и позволяет выбрать бюджет
// для каждой. Категории без бюджета помечаются как «не привязана».
// При сохранении синхронизирует categories[] на каждом бюджете.
// ============================================================

export default function BulkBudgetLinkModal({ open, onClose, categories, budgets }) {
  const queryClient = useQueryClient();
  const [assignments, setAssignments] = useState({}); // { [categoryName]: budgetId | '' }
  const [saving, setSaving] = useState(false);

  // Инициализация: для каждой expense-категории находим привязанный бюджет
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories]
  );

  React.useEffect(() => {
    if (!open) return;
    const init = {};
    for (const cat of expenseCategories) {
      const linkedBudget = budgets.find((b) =>
        (b.categories || (b.category ? [b.category] : [])).includes(cat.name)
      );
      init[cat.name] = linkedBudget?.id || '';
    }
    setAssignments(init);
  }, [open, expenseCategories, budgets]);

  const unlinkedCount = Object.values(assignments).filter((v) => !v).length;

  const handleSave = async () => {
    setSaving(true);
    try {
      // Для каждого бюджета собираем список категорий
      const budgetCategoryMap = {}; // { [budgetId]: [categoryName, ...] }
      for (const budget of budgets) {
        budgetCategoryMap[budget.id] = [];
      }
      for (const [catName, budgetId] of Object.entries(assignments)) {
        if (budgetId && budgetCategoryMap[budgetId]) {
          budgetCategoryMap[budgetId].push(catName);
        }
      }

      // Обновляем каждый бюджет
      for (const budget of budgets) {
        const newCats = budgetCategoryMap[budget.id] || [];
        const oldCats = budget.categories || (budget.category ? [budget.category] : []);
        // Сравниваем — если изменилось, обновляем
        const changed =
          newCats.length !== oldCats.length ||
          newCats.some((c) => !oldCats.includes(c)) ||
          oldCats.some((c) => !newCats.includes(c));
        if (changed) {
          await base44.entities.Budget.update(budget.id, { categories: newCats });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['budgets-for-categories'] });
      queryClient.invalidateQueries({ queryKey: ['my-budgets'] });
      queryClient.invalidateQueries({ queryKey: ['shared-budgets'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      onClose();
    } catch (e) {
      console.error('Bulk link error:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleLinkAll = () => {
    // Найти или создать бюджет "Прочее" и привязать все непривязанные
    const otherBudget = budgets.find(
      (b) => b.name === 'Прочее' || b.name === 'Другое'
    );
    const targetBudgetId = otherBudget?.id || budgets[0]?.id || '';
    if (!targetBudgetId) return;
    const updated = { ...assignments };
    for (const cat of expenseCategories) {
      if (!updated[cat.name]) {
        updated[cat.name] = targetBudgetId;
      }
    }
    setAssignments(updated);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="rounded-2xl max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-violet-600" />
            Привязка категорий к бюджетам
          </DialogTitle>
        </DialogHeader>

        {budgets.length === 0 ? (
          <div className="py-8 text-center">
            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
            <p className="text-slate-600 dark:text-slate-300 text-sm">
              Сначала создайте хотя бы один бюджет на странице «Бюджеты».
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <Badge variant={unlinkedCount > 0 ? 'destructive' : 'default'}>
                {unlinkedCount > 0
                  ? `Не привязано: ${unlinkedCount}`
                  : 'Все привязаны'}
              </Badge>
              {unlinkedCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLinkAll}
                  className="rounded-lg text-xs"
                >
                  Привязать все к «Прочее»
                </Button>
              )}
            </div>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {expenseCategories.map((cat) => {
                const icon =
                  typeof cat.icon === 'string' && cat.icon.length <= 2
                    ? cat.icon
                    : '📦';
                return (
                  <div
                    key={cat.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                      style={{ backgroundColor: `${cat.color || '#8B5CF6'}20` }}
                    >
                      {icon}
                    </div>
                    <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                      {cat.name}
                    </span>
                    {assignments[cat.name] ? (
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    )}
                    <Select
                      value={assignments[cat.name] || 'none'}
                      onValueChange={(v) =>
                        setAssignments({
                          ...assignments,
                          [cat.name]: v === 'none' ? '' : v,
                        })
                      }
                    >
                      <SelectTrigger className="w-40 h-8 rounded-lg text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          <span className="text-amber-600">— Не привязано —</span>
                        </SelectItem>
                        {budgets.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 mt-4"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Сохранить привязки
                </>
              )}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}