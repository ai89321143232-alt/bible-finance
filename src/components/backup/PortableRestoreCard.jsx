import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import RestoreReport from '@/components/backup/RestoreReport';

export default function PortableRestoreCard() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [report, setReport] = useState(null);

  const onPick = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    setPreview(null); setError(''); setReport(null); setFile(null);
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (data.format !== 'bible_finance_portable' || !data.entities) throw new Error();
      const total = Object.values(data.entities).reduce((s, r) => s + (r?.length || 0), 0);
      setPreview({ date: data.created_at, total, users: data.users?.length || 0,
        accounts: data.entities.Account?.length || 0, transactions: data.entities.Transaction?.length || 0 });
      setFile(f);
    } catch {
      setError('Это не файл полного бэкапа Bible Finance');
    }
  };

  const restore = async () => {
    if (!confirm('Записи из бэкапа будут добавлены к текущим данным. Продолжить?')) return;
    setRestoring(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      const res = await base44.functions.invoke('restorePortableBackup', { file_uri });
      setReport(res.data.report);
      setFile(null); setPreview(null);
      toast.success('Восстановление завершено');
    } catch (e) {
      toast.error('Ошибка: ' + (e.response?.data?.error || e.message));
    } finally { setRestoring(false); }
  };

  return (
    <Card className="glass-card">
      <CardContent className="p-4 space-y-3">
        <div>
          <p className="text-sm font-medium">Восстановить из JSON-файла</p>
          <p className="text-xs text-muted-foreground">
            Перед восстановлением на новом сервере пригласите членов семьи — их данные сопоставятся по email.
          </p>
        </div>
        <label className="inline-flex">
          <input type="file" accept="application/json,.json" className="hidden" onChange={onPick} disabled={restoring} />
          <span className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-border text-sm cursor-pointer hover:bg-muted">
            <Upload className="w-4 h-4" /> Выбрать файл
          </span>
        </label>
        {error && <p className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />{error}</p>}
        {preview && (
          <div className="text-xs text-muted-foreground space-y-2">
            <p>Бэкап от {new Date(preview.date).toLocaleString('ru-RU')}: {preview.total} записей, счетов — {preview.accounts}, операций — {preview.transactions}, пользователей — {preview.users}</p>
            <Button size="sm" onClick={restore} disabled={restoring}>
              {restoring && <Loader2 className="w-4 h-4 animate-spin" />}
              {restoring ? 'Восстанавливаем…' : 'Восстановить'}
            </Button>
          </div>
        )}
        {report && <RestoreReport report={report} />}
      </CardContent>
    </Card>
  );
}