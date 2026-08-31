import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cloud, RotateCcw, Trash2, Plus, Loader2, Shield, Clock } from 'lucide-react';
import RestoreDialog from '@/components/backup/RestoreDialog';
import { toast } from 'sonner';

const ENTITY_LABELS = {
  transactions: 'Транзакции',
  accounts: 'Счета',
  budgets: 'Бюджеты',
  goals: 'Цели',
  investments: 'Инвестиции',
  debts: 'Долги',
  subscriptions: 'Подписки',
  categories: 'Категории',
  fixed_assets: 'Активы',
  tasks: 'Задачи',
};

export default function Backup() {
  const [user, setUser] = useState(null);
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState(null);

  const fetchBackups = useCallback(async () => {
    try {
      const me = await base44.auth.me();
      setUser(me);
      const records = await base44.entities.BackupRecord.filter(
        { user_id: me.id },
        '-backup_date',
        50
      );
      setBackups(records);
    } catch (e) {
      toast.error('Ошибка загрузки бэкапов');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      const res = await base44.functions.invoke('createBackup', {});
      if (res.data?.skipped) {
        toast.info('Нет данных для бэкапа');
      } else {
        toast.success('Бэкап создан');
        await fetchBackups();
      }
    } catch (e) {
      toast.error('Ошибка: ' + (e.response?.data?.error || e.message));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (backup) => {
    if (!confirm('Удалить запись о бэкапе? Файл в Drive останется.')) return;
    try {
      await base44.entities.BackupRecord.delete(backup.id);
      setBackups((prev) => prev.filter((b) => b.id !== backup.id));
      toast.success('Запись удалена');
    } catch (e) {
      toast.error('Ошибка удаления');
    }
  };

  const formatDate = (d) => {
    return new Date(d).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalRecords = (summary) => {
    if (!summary) return 0;
    return Object.values(summary).reduce((a, b) => a + (b || 0), 0);
  };

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Cloud className="w-5 h-5" /> Резервные копии
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Google Drive · папка по пользователю
          </p>
        </div>
        <Button onClick={handleCreateBackup} disabled={creating}>
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Создать
        </Button>
      </div>

      {/* Status card */}
      <Card className="glass-card">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
            <Cloud className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Google Drive подключён</p>
            <p className="text-xs text-muted-foreground">
              Бэкапы хранятся в папке bible_finance_{user?.id?.slice(0, 8) || '...'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{backups.length}</p>
            <p className="text-xs text-muted-foreground">копий</p>
          </div>
        </CardContent>
      </Card>

      {/* Info banner */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-sm">
        <Shield className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-muted-foreground">
          Автоматический бэкап создаётся ежедневно при наличии изменений.
          Перед восстановлением автоматически создаётся резервный снапшот.
        </p>
      </div>

      {/* Backup list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : backups.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-8 text-center text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>Пока нет резервных копий</p>
            <p className="text-xs mt-1">Нажмите «Создать» для первого бэкапа</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {backups.map((backup) => (
            <Card key={backup.id} className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">
                        {formatDate(backup.backup_date)}
                      </span>
                      {backup.is_pre_restore && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-medium">
                          перед откатом
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {backup.file_name}
                    </p>
                    {backup.summary && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Object.entries(backup.summary)
                          .filter(([, count]) => count > 0)
                          .map(([key, count]) => (
                            <span
                              key={key}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                            >
                              {ENTITY_LABELS[key] || key}: {count}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {!backup.is_pre_restore && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setRestoreTarget(backup)}
                        title="Восстановить"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(backup)}
                      title="Удалить запись"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Restore dialog */}
      {restoreTarget && (
        <RestoreDialog
          backup={restoreTarget}
          onClose={() => setRestoreTarget(null)}
          onRestored={() => {
            setRestoreTarget(null);
            fetchBackups();
          }}
        />
      )}
    </div>
  );
}