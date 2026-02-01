import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Cloud, Download, Loader2, CheckCircle2, AlertCircle, HardDrive } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function GoogleDriveBackup() {
  const queryClient = useQueryClient();
  const [backups, setBackups] = useState([]);

  useQuery({
    queryKey: ['googleDriveBackups'],
    queryFn: async () => {
      try {
        const backupHistory = localStorage.getItem('backup_history');
        if (backupHistory) {
          setBackups(JSON.parse(backupHistory));
        }
      } catch (e) {
        console.log('No backup history found');
      }
      return null;
    }
  });

  const backupMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('backupToGoogleDrive', {});
      return response.data;
    },
    onSuccess: (data) => {
      const newBackup = {
        id: data.backup_info.file_id,
        name: data.backup_info.file_name,
        date: new Date(data.backup_info.backup_date),
        summary: data.backup_info.summary
      };
      
      const updated = [newBackup, ...backups].slice(0, 10);
      setBackups(updated);
      localStorage.setItem('backup_history', JSON.stringify(updated));
      
      toast.success('Резервная копия успешно создана!');
      queryClient.invalidateQueries({ queryKey: ['googleDriveBackups'] });
    },
    onError: (error) => {
      toast.error('Ошибка при создании резервной копии');
    }
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Backup Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-blue-600" />
            Резервная копия в Google Drive
          </CardTitle>
          <CardDescription>
            Автоматически сохраняйте ваши финансовые данные
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Резервная копия содержит все ваши операции, счета, бюджеты, цели и инвестиции в формате JSON.
            Данные хранятся безопасно в вашей учетной записи Google Drive.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => backupMutation.mutate()}
              disabled={backupMutation.isPending}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 gap-2"
            >
              {backupMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Создание резервной копии...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Создать резервную копию
                </>
              )}
            </Button>

            {backups.length > 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  const message = `Последняя резервная копия от ${new Date(backups[0].date).toLocaleString('ru-RU')}`;
                  toast.success(message);
                }}
                className="gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Резервная копия актуальна
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Backup History */}
      {backups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-slate-600" />
              История резервных копий
            </CardTitle>
            <CardDescription>
              Ваши последние 10 резервных копий
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {backups.map((backup, index) => (
                <motion.div
                  key={backup.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 dark:text-white text-sm">
                        {backup.name}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        {formatDistanceToNow(new Date(backup.date), { 
                          addSuffix: true,
                          locale: ru 
                        })}
                      </p>
                      {backup.summary && (
                        <div className="flex gap-4 mt-2 text-xs text-slate-600 dark:text-slate-400">
                          <span>Операций: {backup.summary.total_transactions}</span>
                          <span>Счетов: {backup.summary.total_accounts}</span>
                          <span>Целей: {backup.summary.total_goals}</span>
                        </div>
                      )}
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-1" />
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-blue-900 dark:text-blue-200">
            <AlertCircle className="w-5 h-5" />
            Совет по безопасности
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 dark:text-blue-300">
          <ul className="space-y-2">
            <li>✓ Резервные копии хранятся в защищенном Google Drive</li>
            <li>✓ Данные зашифрованы при передаче и хранении</li>
            <li>✓ Вы можете создавать резервные копии в любое время</li>
            <li>✓ История резервных копий сохраняется локально на устройстве</li>
          </ul>
        </CardContent>
      </Card>
    </motion.div>
  );
}