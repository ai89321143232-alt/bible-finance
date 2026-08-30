import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from 'lucide-react';
import { useCurrencySymbol } from '@/lib/formatCurrency';

export default function AutoDistributeModal({ 
  open, 
  onOpenChange, 
  goals, 
  availableAmount,
  onDistribute,
  formatCurrency
}) {
  const currencySymbol = useCurrencySymbol();
  const [amount, setAmount] = useState('');
  const [distribution, setDistribution] = useState({});

  useEffect(() => {
    if (open && availableAmount > 0) {
      calculateDistribution(availableAmount);
    }
  }, [open, availableAmount]);

  const calculateDistribution = (totalAmount) => {
    const activeGoals = goals.filter(g => g.status === 'active' && g.current_amount < g.target_amount);
    if (activeGoals.length === 0) return;

    // Сортируем по приоритету: high (3), medium (2), low (1)
    const priorityScore = { high: 3, medium: 2, low: 1 };
    const sorted = [...activeGoals].sort((a, b) => 
      priorityScore[b.priority] - priorityScore[a.priority]
    );

    const dist = {};
    let remaining = totalAmount;

    // Сначала распределяем по приоритетам
    for (const goal of sorted) {
      const needAmount = Math.max(0, goal.target_amount - goal.current_amount);
      const alloc = Math.min(needAmount, remaining);
      dist[goal.id] = alloc;
      remaining -= alloc;
      if (remaining <= 0) break;
    }

    setDistribution(dist);
  };

  const handleDistribute = () => {
    if (!amount || parseFloat(amount) <= 0) return;
    onDistribute(distribution, parseFloat(amount));
  };

  const totalDistributed = Object.values(distribution).reduce((a, b) => a + b, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle>Автоматическое распределение средств</DialogTitle>
          <DialogDescription>
            По приоритетам целей
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Сумма для распределения</Label>
            <div className="relative mt-1">
              <Input
                type="number"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (e.target.value) calculateDistribution(parseFloat(e.target.value));
                }}
                placeholder="0"
                className="rounded-xl pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{currencySymbol}</span>
            </div>
          </div>

          {Object.keys(distribution).length > 0 && (
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-3">
                План распределения:
              </h4>
              <div className="space-y-2">
                {Object.entries(distribution).map(([goalId, amount]) => {
                  const goal = goals.find(g => g.id === goalId);
                  if (!goal || amount === 0) return null;
                  return (
                    <div key={goalId} className="flex justify-between text-sm text-blue-800 dark:text-blue-300">
                      <span>{goal.title}</span>
                      <span className="font-medium">{formatCurrency(amount)}</span>
                    </div>
                  );
                })}
                <div className="pt-2 border-t border-blue-200 dark:border-blue-800 flex justify-between font-semibold text-blue-900 dark:text-blue-200">
                  <span>Итого:</span>
                  <span>{formatCurrency(totalDistributed)}</span>
                </div>
              </div>
            </div>
          )}

          {totalDistributed < parseFloat(amount || 0) && (
            <div className="flex gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {formatCurrency(parseFloat(amount || 0) - totalDistributed)} останется нераспределённо
              </p>
            </div>
          )}

          <Button
            onClick={handleDistribute}
            disabled={!amount || parseFloat(amount) <= 0 || totalDistributed === 0}
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600"
          >
            Распределить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}