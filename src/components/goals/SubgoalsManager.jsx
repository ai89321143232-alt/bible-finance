import React, { useState } from 'react';
import { Plus, X, Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SubgoalsManager({ subgoals, onChange, formatCurrency }) {
  const [newSubgoal, setNewSubgoal] = useState({ title: '', target_amount: '' });

  const addSubgoal = () => {
    if (!newSubgoal.title || !newSubgoal.target_amount) return;

    const subgoal = {
      id: Date.now().toString(),
      title: newSubgoal.title,
      target_amount: parseFloat(newSubgoal.target_amount),
      current_amount: 0,
      status: 'active'
    };

    onChange([...(subgoals || []), subgoal]);
    setNewSubgoal({ title: '', target_amount: '' });
  };

  const removeSubgoal = (id) => {
    onChange(subgoals.filter(sg => sg.id !== id));
  };

  const toggleSubgoal = (id) => {
    const updated = subgoals.map(sg => ({
      ...sg,
      status: sg.id === id 
        ? (sg.status === 'completed' ? 'active' : 'completed')
        : sg.status
    }));
    onChange(updated);
  };

  const totalSubgoals = subgoals?.reduce((sum, sg) => sum + sg.target_amount, 0) || 0;

  return (
    <div className="space-y-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-700/30">
      <div>
        <Label className="font-semibold">Подцели</Label>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Разбейте главную цель на более мелкие этапы
        </p>
      </div>

      {subgoals && subgoals.length > 0 && (
        <div className="space-y-2 mb-4">
          {subgoals.map(sg => (
            <div key={sg.id} className="flex items-center gap-2 p-3 bg-white dark:bg-slate-800 rounded-lg">
              <button
                onClick={() => toggleSubgoal(sg.id)}
                className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                  sg.status === 'completed'
                    ? 'bg-emerald-500 border-emerald-500'
                    : 'border-slate-300 dark:border-slate-600'
                }`}
              >
                {sg.status === 'completed' && (
                  <Check className="w-3 h-3 text-white" />
                )}
              </button>
              <div className="flex-1">
                <p className={sg.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}>
                  {sg.title}
                </p>
                <p className="text-sm text-slate-500">{formatCurrency(sg.target_amount)}</p>
              </div>
              <button
                onClick={() => removeSubgoal(sg.id)}
                className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <p className="text-sm text-blue-900 dark:text-blue-300">
              Сумма подцелей: <span className="font-semibold">{formatCurrency(totalSubgoals)}</span>
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Input
          value={newSubgoal.title}
          onChange={(e) => setNewSubgoal({ ...newSubgoal, title: e.target.value })}
          placeholder="Название подцели"
          className="rounded-lg"
        />
        <div className="relative">
          <Input
            type="number"
            value={newSubgoal.target_amount}
            onChange={(e) => setNewSubgoal({ ...newSubgoal, target_amount: e.target.value })}
            placeholder="Сумма"
            className="rounded-lg pr-8"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">₽</span>
        </div>
        <Button
          onClick={addSubgoal}
          disabled={!newSubgoal.title || !newSubgoal.target_amount}
          variant="outline"
          className="w-full rounded-lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          Добавить подцель
        </Button>
      </div>
    </div>
  );
}