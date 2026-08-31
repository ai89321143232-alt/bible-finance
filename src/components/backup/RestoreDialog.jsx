import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, AlertTriangle, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

const ENTITY_OPTIONS = [
  { key: 'transactions', label: 'Транзакции' },
  { key: 'accounts', label: 'Счета' },
  { key: 'budgets', label: 'Бюджеты' },
  { key: 'goals', label: 'Цели' },
  { key: 'investments', label: 'Инвестиции' },
  { key: 'debts', label: 'Долги' },
  { key: 'subscriptions', label: 'Подписки' },
  { key: 'categories', label: 'Категории' },
  { key: 'fixed_assets', label: 'Активы' },
  { key: 'tasks', label: 'Задачи' },
];

export default function RestoreDialog({ backup, onClose, onRestored }) {
  const [selected, setSelected] = useState(new Set());
  const [restoring, setRestoring] = useState(false);

  const toggle = (key) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selected.size === ENTITY_OPTIONS.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(ENTITY_OPTIONS.map((e) => e.key)));
    }
  };

  const handleRestore = async () => {
    if (selected.size === 0) {
      toast.error('Выберите хотя бы одну категорию');
      return;
    }

    const labels = [...selected]
      .map((k) => ENTITY_OPTIONS.find((e) => e.key === k)?.label)
      .join(', ');

    if (
      !confirm(
        `Восстановить: ${labels}?\n\n` +
          'Текущие данные в выбранных категориях будут УДАЛЕНЫ и заменены данными из бэкапа.\n' +
          'Автоматически будет создан резервный снапшот текущего состояния.'
      )
    )
      return;

    setRestoring(true);
    try {
      const res = await base44.functions.invoke('restoreBackup', {
        backup_id: backup.id,
        selected_entities: [...selected],
      });
      toast.success('Восстановление завершено');
      onRestored();
    } catch (e) {
      toast.error('Ошибка: ' + (e.response?.data?.error || e.message));
    } finally {
      setRestoring(false);
    }
  };

  const formatDate = (d) =>
    new Date(d).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5" /> Восстановление
          </DialogTitle>
          <DialogDescription>
            Бэкап от {formatDate(backup.backup_date)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-muted-foreground">
            Текущие данные в выбранных категориях будут заменены данными из бэкапа.
            Будет создан резервный снапшот для возможности отмены.
          </p>
        </div>

        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b">
            <span className="text-sm font-medium">Выберите категории</span>
            <button
              onClick={handleSelectAll}
              className="text-xs text-primary hover:underline"
            >
              {selected.size === ENTITY_OPTIONS.length ? 'Снять все' : 'Выбрать все'}
            </button>
          </div>
          {ENTITY_OPTIONS.map((entity) => {
            const count = backup.summary?.[entity.key] || 0;
            return (
              <label
                key={entity.key}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer"
              >
                <Checkbox
                  checked={selected.has(entity.key)}
                  onCheckedChange={() => toggle(entity.key)}
                />
                <span className="text-sm flex-1">{entity.label}</span>
                <span className="text-xs text-muted-foreground">{count} записей</span>
              </label>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={restoring}>
            Отмена
          </Button>
          <Button
            onClick={handleRestore}
            disabled={restoring || selected.size === 0}
            variant="destructive"
          >
            {restoring ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
            Восстановить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}