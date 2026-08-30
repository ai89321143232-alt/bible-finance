import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useCurrencySymbol, useFormatCurrency } from '@/lib/formatCurrency';

export default function GoalContributions({ goal, currentUser, familyMembers }) {
  const queryClient = useQueryClient();
  const currencySymbol = useCurrencySymbol();
  const formatCurrency = useFormatCurrency();
  const [showModal, setShowModal] = useState(false);
  const [contributionAmount, setContributionAmount] = useState('');

  const contributions = goal.contributions || [];
  const totalContributed = contributions.reduce((sum, c) => sum + c.amount, 0);

  const addContributionMutation = useMutation({
    mutationFn: async (amount) => {
      const updatedContributions = [
        ...contributions,
        {
          user_id: currentUser.id,
          user_name: currentUser.full_name,
          amount: parseFloat(amount),
          date: new Date().toISOString().split('T')[0]
        }
      ];
      return base44.entities.Goal.update(goal.id, {
        contributions: updatedContributions,
        current_amount: totalContributed + parseFloat(amount)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setContributionAmount('');
      setShowModal(false);
      toast.success('Вклад добавлен');
    }
  });

  if (!goal.is_family_goal) return null;

  return (
    <>
      <Card className="border-0 shadow-sm mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-5 h-5" />
            Командные вклады
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <p className="text-xs text-slate-600 dark:text-slate-400">Всего внесено</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(totalContributed)}</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <p className="text-xs text-slate-600 dark:text-slate-400">Осталось</p>
              <p className="text-lg font-bold text-violet-600">{formatCurrency(Math.max(0, goal.target_amount - totalContributed))}</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <p className="text-xs text-slate-600 dark:text-slate-400">Человек</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{new Set(contributions.map(c => c.user_id)).size}</p>
            </div>
          </div>

          {contributions.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {contributions.map((contrib, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{contrib.user_name}</p>
                    <p className="text-xs text-slate-500">{format(new Date(contrib.date), 'd MMM', { locale: ru })}</p>
                  </div>
                  <p className="font-semibold text-emerald-600">{formatCurrency(contrib.amount)}</p>
                </div>
              ))}
            </div>
          )}

          <Button
            onClick={() => setShowModal(true)}
            variant="outline"
            className="w-full gap-2"
          >
            <Plus className="w-4 h-4" />
            Добавить свой вклад
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить вклад в цель</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Сумма</Label>
              <div className="relative mt-1">
                <Input
                  type="number"
                  value={contributionAmount}
                  onChange={(e) => setContributionAmount(e.target.value)}
                  placeholder="0"
                  autoFocus
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{currencySymbol}</span>
              </div>
            </div>

            <Button
              onClick={() => addContributionMutation.mutate(contributionAmount)}
              disabled={!contributionAmount || addContributionMutation.isPending}
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600"
            >
              Добавить вклад
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}