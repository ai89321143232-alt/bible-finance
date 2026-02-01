import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Cloud, Download, CheckCircle, AlertCircle, Loader2, HardDrive } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function BackupReports() {
  const [isLoading, setIsLoading] = useState(false);
  const [backups, setBackups] = useState([
    {
      id: 1,
      fileName: 'FinancialReport_2025-12-15.pdf',
      date: new Date('2025-12-15'),
      size: '2.5 MB',
      status: 'success'
    },
    {
      id: 2,
      fileName: 'FinancialReport_2025-12-08.pdf',
      date: new Date('2025-12-08'),
      size: '2.3 MB',
      status: 'success'
    }
  ]);

  const handleBackup = async () => {
    setIsLoading(true);
    try {
      const response = await base44.functions.invoke('backupFinancialReports');
      
      if (response.data?.success) {
        toast.success('Отчет успешно загружен в Google Drive!');
        
        // Add to backups list
        setBackups(prev => [{
          id: prev.length + 1,
          fileName: response.data.fileName,
          date: new Date(),
          size: 'Недавний',
          status: 'success'
        }, ...prev]);
      } else {
        toast.error(response.data?.error || 'Ошибка при загрузке');
      }
    } catch (error) {
      toast.error('Ошибка при загрузке отчета');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Резервные копии отчетов
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Экспортируйте и сохраняйте свои финансовые отчеты в Google Drive
          </p>
        </motion.div>

        {/* Main Action Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-8 border-2 border-violet-200 dark:border-violet-900 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="w-6 h-6 text-violet-600" />
                Создать резервную копию
              </CardTitle>
              <CardDescription>
                Экспортируйте полный отчет со всеми счетами, операциями, бюджетами и целями
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-900 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    Что будет включено в отчет:
                  </p>
                  <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                    <li>✓ Сводка по всем счетам и общему балансу</li>
                    <li>✓ История последних операций</li>
                    <li>✓ Статус бюджетов и их текущие затраты</li>
                    <li>✓ Прогресс по финансовым целям</li>
                    <li>✓ Информация об инвестициях</li>
                  </ul>
                </div>

                <Button
                  onClick={handleBackup}
                  disabled={isLoading}
                  size="lg"
                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 h-12"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Загрузка в Google Drive...
                    </>
                  ) : (
                    <>
                      <Cloud className="w-5 h-5 mr-2" />
                      Создать и загрузить отчет
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-2 gap-4 mb-8"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-blue-600" />
                Автоматическое сохранение
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 dark:text-slate-400">
              Создавайте резервные копии в любой момент с одного клика
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Cloud className="w-5 h-5 text-emerald-600" />
                Google Drive интеграция
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 dark:text-slate-400">
              Все файлы безопасно хранятся в вашем Google Drive
            </CardContent>
          </Card>
        </motion.div>

        {/* Backup History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>История резервных копий</CardTitle>
              <CardDescription>
                {backups.length} резервных копий сохранено
              </CardDescription>
            </CardHeader>
            <CardContent>
              {backups.length === 0 ? (
                <div className="text-center py-8">
                  <Cloud className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                  <p className="text-slate-500 dark:text-slate-400">
                    Резервные копии еще не созданы
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {backups.map((backup) => (
                    <motion.div
                      key={backup.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-violet-400 dark:hover:border-violet-600 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex-shrink-0">
                          {backup.status === 'success' ? (
                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-900 dark:text-white">
                            {backup.fileName}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {format(backup.date, 'dd MMMM yyyy HH:mm', { locale: ru })} • {backup.size}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open('https://drive.google.com', '_blank')}
                        className="gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Google Drive
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4"
        >
          <p className="text-sm text-blue-900 dark:text-blue-200">
            <strong>Важно:</strong> Все резервные копии хранятся в вашем личном Google Drive. Вы можете управлять ними, скачивать или удалять в любой момент.
          </p>
        </motion.div>
      </div>
    </div>
  );
}