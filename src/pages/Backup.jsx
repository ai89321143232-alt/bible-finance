import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Download, Upload, Database, FileJson, Shield, 
  Check, AlertTriangle, RefreshCw, Loader2, Info
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import GoogleDriveBackup from '@/components/GoogleDriveBackup';

export default function Backup() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-date', 1000)
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.list()
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => base44.entities.Budget.list()
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => base44.entities.Goal.list()
  });

  const { data: investments = [] } = useQuery({
    queryKey: ['investments'],
    queryFn: () => base44.entities.Investment.list()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list()
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list()
  });

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      const backup = {
        version: '1.0',
        export_date: new Date().toISOString(),
        data: {
          transactions,
          accounts,
          budgets,
          goals,
          investments,
          tasks,
          categories
        },
        metadata: {
          transaction_count: transactions.length,
          account_count: accounts.length,
          budget_count: budgets.length,
          goal_count: goals.length,
          investment_count: investments.length,
          task_count: tasks.length,
          category_count: categories.length
        }
      };

      setExportProgress(100);

      // Create and download file
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financeapp-backup-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Резервная копия создана!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Ошибка при создании резервной копии');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      // Validate backup structure
      if (!backup.version || !backup.data) {
        throw new Error('Invalid backup file format');
      }

      // Import data
      if (backup.data.categories?.length) {
        await Promise.all(
          backup.data.categories
            .filter(c => !c.is_system)
            .map(cat => base44.entities.Category.create(cat))
        );
      }

      if (backup.data.accounts?.length) {
        await Promise.all(
          backup.data.accounts.map(acc => base44.entities.Account.create(acc))
        );
      }

      if (backup.data.transactions?.length) {
        await base44.entities.Transaction.bulkCreate(backup.data.transactions);
      }

      if (backup.data.budgets?.length) {
        await Promise.all(
          backup.data.budgets.map(budget => base44.entities.Budget.create(budget))
        );
      }

      if (backup.data.goals?.length) {
        await Promise.all(
          backup.data.goals.map(goal => base44.entities.Goal.create(goal))
        );
      }

      if (backup.data.investments?.length) {
        await Promise.all(
          backup.data.investments.map(inv => base44.entities.Investment.create(inv))
        );
      }

      if (backup.data.tasks?.length) {
        await Promise.all(
          backup.data.tasks.map(task => base44.entities.Task.create(task))
        );
      }

      toast.success('Данные успешно восстановлены!');
      
      // Refresh all data
      window.location.reload();
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Ошибка при восстановлении данных. Проверьте формат файла.');
    } finally {
      setIsImporting(false);
    }
  };

  const totalRecords = transactions.length + accounts.length + budgets.length + 
                        goals.length + investments.length + tasks.length + categories.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-24 sm:pb-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Резервное копирование
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Экспорт и восстановление данных
          </p>
        </motion.div>

        {/* Info Alert */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900 dark:text-blue-100">
              Регулярно создавайте резервные копии для защиты ваших финансовых данных. 
              Храните файлы в безопасном месте.
            </AlertDescription>
          </Alert>
        </motion.div>

        {/* Stats Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="w-5 h-5 text-violet-600" />
                Текущие данные
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Операции</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{transactions.length}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Счета</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{accounts.length}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Бюджеты</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{budgets.length}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Цели</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{goals.length}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <p className="text-sm text-slate-500">
                  Всего записей: <span className="font-semibold text-slate-900 dark:text-white">{totalRecords}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Export Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-600" />
                Экспорт данных
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Создайте резервную копию всех ваших финансовых данных в формате JSON. 
                Файл будет содержать все операции, счета, бюджеты, цели и другую информацию.
              </p>
              
              {isExporting && (
                <div className="space-y-2">
                  <Progress value={exportProgress} className="h-2" />
                  <p className="text-sm text-slate-500 text-center">Создание резервной копии...</p>
                </div>
              )}

              <Button
                onClick={handleExport}
                disabled={isExporting || totalRecords === 0}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Создание копии...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    Скачать резервную копию
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Import Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                Восстановление данных
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-900 dark:text-amber-100">
                  Внимание! Восстановление добавит данные из резервной копии к существующим. 
                  Дубликаты не будут созданы автоматически.
                </AlertDescription>
              </Alert>

              <p className="text-sm text-slate-600 dark:text-slate-400">
                Загрузите ранее созданную резервную копию для восстановления данных. 
                Убедитесь, что файл имеет правильный формат JSON.
              </p>

              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                disabled={isImporting}
                className="hidden"
                id="import-file"
              />

              <Button
                onClick={() => document.getElementById('import-file')?.click()}
                disabled={isImporting}
                variant="outline"
                className="w-full rounded-xl border-blue-200 hover:bg-blue-50"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Восстановление...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" />
                    Загрузить резервную копию
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Google Drive Backup */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-6"
        >
          <GoogleDriveBackup />
        </motion.div>

        {/* Security Note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6"
        >
          <Card className="border-0 shadow-sm bg-violet-50 dark:bg-violet-900/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-violet-900 dark:text-violet-100 mb-1">
                    Безопасность данных
                  </h4>
                  <p className="text-sm text-violet-700 dark:text-violet-200">
                    Резервные копии содержат все ваши финансовые данные. Храните файлы в безопасном месте 
                    и не передавайте третьим лицам. Рекомендуем создавать копии еженедельно.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}