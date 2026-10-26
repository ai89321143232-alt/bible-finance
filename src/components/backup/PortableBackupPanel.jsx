import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { HardDrive, Download, Loader2, CloudUpload } from 'lucide-react';
import { toast } from 'sonner';
import PortableRestoreCard from '@/components/backup/PortableRestoreCard';

export default function PortableBackupPanel() {
  const [last, setLast] = useState(null);
  const [busy, setBusy] = useState(null);

  const loadLast = async () => {
    const { items } = await base44.entities.BackupRecord.filter({ kind: 'full_app' }, { sort: '-backup_date', limit: 1 });
    setLast(items[0] || null);
  };
  useEffect(() => { loadLast(); }, []);

  const saveToDrive = async () => {
    setBusy('drive');
    try {
      const res = await base44.functions.invoke('fullAppBackup', { mode: 'drive' });
      toast.success(`Сохранено на Google Диск: ${res.data.total} записей`);
      await loadLast();
    } catch (e) {
      toast.error('Ошибка: ' + (e.response?.data?.error || e.message));
    } finally { setBusy(null); }
  };

  const download = async () => {
    setBusy('download');
    try {
      const res = await base44.functions.invoke('fullAppBackup', { mode: 'download' });
      const blob = new Blob([JSON.stringify(res.data.content, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = res.data.file_name;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      toast.error('Ошибка: ' + (e.response?.data?.error || e.message));
    } finally { setBusy(null); }
  };

  return (
    <div className="space-y-3">
      <Card className="glass-card">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Полный бэкап для переноса</p>
              <p className="text-xs text-muted-foreground">
                Все данные приложения сохраняются каждый день в папку bible_finance_full_backup на вашем Google Диске.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {last
                  ? `Последний: ${new Date(last.backup_date).toLocaleString('ru-RU')} · ${last.total_records || 0} записей`
                  : 'Полных бэкапов ещё нет'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={saveToDrive} disabled={!!busy}>
              {busy === 'drive' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
              На Google Диск
            </Button>
            <Button size="sm" variant="outline" onClick={download} disabled={!!busy}>
              {busy === 'download' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Скачать JSON
            </Button>
          </div>
        </CardContent>
      </Card>
      <PortableRestoreCard />
    </div>
  );
}