import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from 'framer-motion';
import { FileText, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function TaxExport() {
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [reportType, setReportType] = useState('income');

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const handleExport = (format) => {
    toast.success(`Отчёт будет экспортирован в ${format}...`);
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
            Экспорт для налогов
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Подготовка отчётов для декларации и налоговой инспекции
          </p>
        </motion.div>

        {/* Alert */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-8 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex gap-3"
        >
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-200">⚠️ Важно</p>
            <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
              Все отчёты только в справочных целях. Перед подачей в налоговую проверьте данные и проконсультируйтесь с бухгалтером или налоговым консультантом.
            </p>
          </div>
        </motion.div>

        {/* Report Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Параметры отчёта</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label>Год</Label>
                  <Select value={year} onValueChange={setYear}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map(y => (
                        <SelectItem key={y} value={y.toString()}>
                          {y} год
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Тип отчёта</Label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">📊 Доходы</SelectItem>
                      <SelectItem value="expenses">📉 Расходы</SelectItem>
                      <SelectItem value="summary">📋 Сводка</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-sm font-medium text-slate-900 dark:text-white mb-3">Экспортировать как:</p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleExport('CSV')}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleExport('Excel')}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Excel (.xlsx)
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleExport('PDF')}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Report Types */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid md:grid-cols-3 gap-4 mb-8"
        >
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">📊 УПД/Счёт-фактура</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 dark:text-slate-400">
              Универсальный передаточный документ для B2B операций
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">📋 Акт приёма-передачи</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 dark:text-slate-400">
              Документ подтверждения выполнения работ/услуг
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">🧾 Расчётный лист</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 dark:text-slate-400">
              Отчёт по доходам и вычетам сотрудника
            </CardContent>
          </Card>
        </motion.div>

        {/* For Self-employed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Для ИП и самозанятых
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Налог на доходы физических лиц (НДФЛ)</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Декларация 3-НДФЛ со всеми доходами и вычетами</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Налог на профессиональный доход (НПД)</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Отчёт для самозанятых с учётом авансовых платежей</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Единый налог на вменённый доход (ЕНВД)</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Расчёт и декларация для определённых видов деятельности</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Упрощённая система налогообложения (УСН)</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Декларация УСН 15-20 с расчётом налога</p>
                  </div>
                </div>
              </div>

              <Button
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 gap-2"
              >
                <Download className="w-4 h-4" />
                Загрузить отчёт для ФНС
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Help */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-8"
        >
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Справка: Как подать отчёт</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
              <p>1. Подготовьте файл отчёта в нужном формате</p>
              <p>2. Посетите сайт ФНС (nalog.ru) или используйте 1C:Бухгалтерия</p>
              <p>3. Загрузите файл в личный кабинет налогоплательщика</p>
              <p>4. Подпишите документ квалифицированной подписью</p>
              <p>5. Отправьте в налоговую инспекцию</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}