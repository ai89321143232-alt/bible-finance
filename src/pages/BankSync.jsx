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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { motion } from 'framer-motion';
import { AlertCircle, CreditCard, Plus, RefreshCw, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';

const SUPPORTED_BANKS = [
  { id: 'tinkoff', name: 'Tinkoff Bank', icon: '🏦', status: 'coming' },
  { id: 'sber', name: 'Сбербанк', icon: '🏦', status: 'coming' },
  { id: 'vtb', name: 'ВТБ', icon: '🏦', status: 'coming' },
  { id: 'gazprom', name: 'Газпромбанк', icon: '🏦', status: 'coming' },
];

export default function BankSync() {
  const [showModal, setShowModal] = useState(false);
  const [selectedBank, setSelectedBank] = useState('');

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
            Синхронизация с банком
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Автоматически загружайте транзакции со своего банковского счёта
          </p>
        </motion.div>

        {/* Alert */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex gap-3"
        >
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-900 dark:text-blue-200">Функция в разработке</p>
            <p className="text-sm text-blue-800 dark:text-blue-300 mt-1">
              Интеграция с банками будет доступна в следующем обновлении. Пока вы можете загружать выписки вручную.
            </p>
          </div>
        </motion.div>

        {/* Available Banks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
            Поддерживаемые банки
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {SUPPORTED_BANKS.map((bank) => (
              <Card key={bank.id} className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{bank.icon}</span>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{bank.name}</p>
                        <p className="text-xs text-slate-500">
                          {bank.status === 'coming' && '🔄 Скоро будет доступно'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button 
                    disabled 
                    className="w-full"
                  >
                    Подключить
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Manual Import */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Ручная загрузка выписки</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                В ожидании автоматической синхронизации вы можете загружать CSV выписки вручную.
              </p>
              
              <div className="p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg text-center">
                <CreditCard className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-900 dark:text-white mb-2">
                  Загрузите выписку в CSV формате
                </p>
                <p className="text-xs text-slate-500 mb-4">
                  Формат: Дата, Описание, Сумма, Счёт
                </p>
                <Button className="bg-gradient-to-r from-violet-600 to-indigo-600">
                  Выбрать файл
                </Button>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                <p className="text-sm font-medium text-slate-900 dark:text-white mb-2">Примеры поддерживаемых форматов:</p>
                <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <li>• Tinkoff Bank CSV export</li>
                  <li>• Сбербанк Online выписка</li>
                  <li>• ВТБ Excel выписка</li>
                  <li>• Универсальный CSV формат</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8"
        >
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Часто задаваемые вопросы</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white mb-2">Безопасна ли синхронизация?</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Да, все данные передаются через защищённые каналы. Мы никогда не сохраняем ваши учётные данные банка.
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-900 dark:text-white mb-2">Как часто обновляются транзакции?</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  После подключения банка транзакции будут синхронизироваться ежедневно автоматически.
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-900 dark:text-white mb-2">Можно ли подключить несколько счётов?</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Да, вы можете подключить несколько счётов из одного или разных банков.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}