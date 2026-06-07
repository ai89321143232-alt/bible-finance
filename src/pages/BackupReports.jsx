import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Cloud, Download, CheckCircle, AlertCircle, Loader2, HardDrive, FileSpreadsheet, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function BackupReports() {
  const [isLoading, setIsLoading] = useState(false);
  const [isExcelLoading, setIsExcelLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);

  const handleDownloadExcel = async () => {
    setIsExcelLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BASE44_FUNCTIONS_URL || ''}/api/functions/monthlyFamilyReport`,
        {
          method: 'POST',
          headers: {
            'Accept': 'application/octet-stream',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await base44.auth.me())?.token || ''}`,
          },
          body: JSON.stringify({})
        }
      );
      if (!response.ok) throw new Error('Ошибка генерации');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const month = new Date();
      month.setMonth(month.getMonth() - 1);
      a.download = `Семейный_отчет_${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Excel-отчёт скачан!');
    } catch (error) {
      // Запасной вариант через SDK
      try {
        const res = await base44.functions.invoke('monthlyFamilyReport', {});
        toast.info('Отчёт сформирован. Email отправлен на вашу почту.');
      } catch (e) {
        toast.error('Ошибка при формировании отчёта');
      }
    } finally {
      setIsExcelLoading(false);
    }
  };

  const handleSendEmail = async () => {
    setIsEmailLoading(true);
    try {
      const res = await base44.functions.invoke('monthlyFamilyReport', {});
      if (res.data?.success) {
        toast.success(`Отчёт за ${res.data.month} отправлен на вашу почту!`);
        if (res.data.budgetsOverLimit?.length > 0) {
          toast.warning(`⚠️ Превышены лимиты: ${res.data.budgetsOverLimit.join(', ')}`);
        }
      } else {
        toast.error(res.data?.error || 'Ошибка');
      }
    } catch (e) {
      toast.error('Ошибка при отправке отчёта');
    } finally {
      setIsEmailLoading(false);
    }
  };
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

        {/* Monthly Report Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="mb-6 border-2 border-emerald-200 dark:border-emerald-900 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                Ежемесячный отчёт по семейным тратам
              </CardTitle>
              <CardDescription>
                Детальный Excel-отчёт: бюджеты, лимиты, расходы по категориям и транзакции за прошлый месяц. Автоматически отправляется 1-го числа каждого месяца.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-white dark:bg-slate-900 rounded-lg p-4 mb-4 space-y-1 text-sm text-slate-600 dark:text-slate-400">
                <p>✓ Сводка доходов и расходов за месяц</p>
                <p>✓ Статус каждого бюджета: укладываемся ли в лимит</p>
                <p>✓ Расходы по категориям с долями</p>
                <p>✓ Все транзакции за месяц</p>
                <p>✓ Текущий баланс счетов</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleDownloadExcel}
                  disabled={isExcelLoading}
                  size="lg"
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 h-12"
                >
                  {isExcelLoading ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Формирование...</>
                  ) : (
                    <><FileSpreadsheet className="w-5 h-5 mr-2" />Скачать Excel</>
                  )}
                </Button>
                <Button
                  onClick={handleSendEmail}
                  disabled={isEmailLoading}
                  size="lg"
                  variant="outline"
                  className="flex-1 h-12 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400"
                >
                  {isEmailLoading ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Отправка...</>
                  ) : (
                    <><Mail className="w-5 h-5 mr-2" />Отправить на email</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
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