import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  User, Bell, Moon, Sun, Globe, Shield, CreditCard, 
  HelpCircle, LogOut, ChevronRight, Crown, Check, Tag, Users, Database
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SUBSCRIPTION_PLANS = [
  {
    id: 'free',
    name: 'Бесплатный',
    price: 0,
    features: [
      'До 100 транзакций в месяц',
      '3 бюджета',
      'Базовая аналитика',
      '1 финансовая цель'
    ]
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 299,
    popular: true,
    features: [
      'Безлимитные транзакции',
      'Неограниченные бюджеты',
      'Расширенная аналитика',
      'AI-ассистент без лимитов',
      'Экспорт отчётов',
      'Приоритетная поддержка'
    ]
  },
  {
    id: 'family',
    name: 'Family',
    price: 499,
    features: [
      'Всё из Premium',
      'До 5 членов семьи',
      'Семейные бюджеты',
      'Совместные цели',
      'Отдельная аналитика'
    ]
  }
];

export default function Settings() {
  const [user, setUser] = useState(null);
  const [isDark, setIsDark] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [notifications, setNotifications] = useState({
    budgetAlerts: true,
    goalReminders: true,
    weeklyReport: false,
    tips: true
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const userData = await base44.auth.me();
    setUser(userData);
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-24 sm:pb-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Настройки
          </h1>
        </motion.div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                  {user?.full_name?.[0] || user?.email?.[0] || '?'}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                    {user?.full_name || 'Пользователь'}
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400">{user?.email}</p>
                  <Badge variant="secondary" className="mt-2 bg-violet-100 text-violet-700">
                    <Crown className="w-3 h-3 mr-1" />
                    Бесплатный план
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Subscription */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-6"
        >
          <Card className="border-0 shadow-sm bg-gradient-to-br from-violet-600 to-indigo-700 text-white overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold mb-1">Разблокируйте Premium</h3>
                  <p className="text-violet-200 text-sm">
                    AI-ассистент, расширенная аналитика и многое другое
                  </p>
                </div>
                <Button 
                  onClick={() => setShowPlanModal(true)}
                  className="bg-white text-violet-700 hover:bg-violet-50 rounded-xl"
                >
                  Улучшить
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* Notifications */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="w-5 h-5 text-violet-600" />
                  Уведомления
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Предупреждения о бюджете</p>
                    <p className="text-sm text-slate-500">При приближении к лимиту</p>
                  </div>
                  <Switch 
                    checked={notifications.budgetAlerts}
                    onCheckedChange={(v) => setNotifications({...notifications, budgetAlerts: v})}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Напоминания о целях</p>
                    <p className="text-sm text-slate-500">Еженедельные напоминания</p>
                  </div>
                  <Switch 
                    checked={notifications.goalReminders}
                    onCheckedChange={(v) => setNotifications({...notifications, goalReminders: v})}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Еженедельный отчёт</p>
                    <p className="text-sm text-slate-500">Сводка по финансам</p>
                  </div>
                  <Switch 
                    checked={notifications.weeklyReport}
                    onCheckedChange={(v) => setNotifications({...notifications, weeklyReport: v})}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Appearance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Moon className="w-5 h-5 text-violet-600" />
                  Внешний вид
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Тёмная тема</p>
                    <p className="text-sm text-slate-500">Переключить тему приложения</p>
                  </div>
                  <Switch 
                    checked={isDark}
                    onCheckedChange={setIsDark}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Валюта</p>
                    <p className="text-sm text-slate-500">Основная валюта</p>
                  </div>
                  <Select defaultValue="RUB">
                    <SelectTrigger className="w-32 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RUB">🇷🇺 RUB</SelectItem>
                      <SelectItem value="USD">🇺🇸 USD</SelectItem>
                      <SelectItem value="EUR">🇪🇺 EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Security */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-5 h-5 text-violet-600" />
                  Данные и настройки
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Link to={createPageUrl('Categories')}>
                    <Button variant="ghost" className="w-full justify-between rounded-xl h-12">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4" />
                        <span>Категории</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </Button>
                  </Link>
                  <Link to={createPageUrl('Family')}>
                    <Button variant="ghost" className="w-full justify-between rounded-xl h-12">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>Семья</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </Button>
                  </Link>
                  <Link to={createPageUrl('Backup')}>
                    <Button variant="ghost" className="w-full justify-between rounded-xl h-12">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        <span>Резервные копии</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Logout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full h-12 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Выйти из аккаунта
            </Button>
          </motion.div>

          {/* App Info */}
          <div className="text-center text-sm text-slate-400 py-4">
            <p>FinanceApp v1.0.0</p>
            <p className="mt-1">© 2024 Все права защищены</p>
          </div>
        </div>
      </div>

      {/* Subscription Plans Modal */}
      <Dialog open={showPlanModal} onOpenChange={setShowPlanModal}>
        <DialogContent className="rounded-2xl max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center">Выберите план</DialogTitle>
          </DialogHeader>
          <div className="grid sm:grid-cols-3 gap-4 mt-4">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <Card 
                key={plan.id}
                className={`border-2 cursor-pointer transition-all hover:border-violet-500 ${
                  plan.popular ? 'border-violet-500 shadow-lg shadow-violet-500/20' : 'border-slate-200'
                }`}
              >
                <CardContent className="p-4">
                  {plan.popular && (
                    <Badge className="mb-3 bg-violet-600">Популярный</Badge>
                  )}
                  <h3 className="font-semibold text-lg text-slate-900">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 my-3">
                    <span className="text-3xl font-bold text-slate-900">{plan.price}</span>
                    <span className="text-slate-500">₽/мес</span>
                  </div>
                  <ul className="space-y-2 mb-4">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={`w-full rounded-xl ${
                      plan.popular 
                        ? 'bg-gradient-to-r from-violet-600 to-indigo-600' 
                        : ''
                    }`}
                    variant={plan.popular ? 'default' : 'outline'}
                  >
                    {plan.price === 0 ? 'Текущий план' : 'Выбрать'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}