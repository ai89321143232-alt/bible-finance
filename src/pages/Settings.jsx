import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  User, Bell, Moon, Globe, Shield, CreditCard, 
  HelpCircle, LogOut, ChevronRight, Crown, Check, Tag, Users, Database, Settings as SettingsIcon, Clock, Copy, Trash2,
  Image, Loader2, X
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { useTrialActivation, getSubscriptionStatus } from '@/components/SubscriptionManager';
import { useAuth } from '@/lib/AuthContext';
import { eventBus, EVENTS } from '@/lib/eventBus';
import PersonalizationSettings from '@/components/settings/PersonalizationSettings';
import AIModelSettings from '@/components/settings/AIModelSettings';
import { Layout, Bot } from 'lucide-react';

const PRESET_BACKGROUNDS = [
  { name: 'Сетка', url: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/2d7380dc7_generated_image.png' },
  { name: 'Аврора', url: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/ce36510b1_generated_image.png' },
  { name: 'Город', url: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/7332cb888_generated_image.png' },
  { name: 'Изумруд', url: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/c2586403a_generated_image.png' },
  { name: 'Космос', url: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/be1b66dc5_generated_image.png' },
  { name: 'Горы', url: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/d6cb2f566_generated_image.png' },
  { name: 'Золото', url: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/593a3a7a7_generated_image.png' },
  { name: 'Платина', url: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/9e7390212_generated_image.png' },
  { name: 'Неон', url: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/587e0a9db_generated_image.png' },
  { name: 'Радуга', url: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/7c6762446_generated_image.png' },
  { name: 'Золотой блеск', url: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/9e3710b95_generated_image.png' },
  { name: 'Неоновый город', url: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/a9f9846a0_generated_image.png' },
];

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
      'AI-ассистент без лимитов',
      'До 5 членов семьи',
      'Семейные бюджеты',
      'Совместные цели',
      'Отдельная аналитика'
    ]
  }
];

export default function Settings() {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState(authUser);
  const [isDark, setIsDark] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    telegramNick: ''
  });
  const [notifications, setNotifications] = useState({
    budgetAlerts: true,
    goalReminders: true,
    weeklyReport: false,
    tips: true
  });
  const [showPersonalization, setShowPersonalization] = useState(false);
  const [showAISettings, setShowAISettings] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingBg, setIsUploadingBg] = useState(false);

  // Автоматическая активация демо-периода при первом входе
  useTrialActivation();

  useEffect(() => {
    if (authUser) {
      setUser(authUser);
    }
    loadUser();
  }, [authUser]);

  const loadUser = async () => {
    const userData = await base44.auth.me();
    setUser(userData);
    const status = getSubscriptionStatus(userData);
    setSubscriptionStatus(status);
    
    // Load profile data
    setProfileData({
      firstName: userData.data?.firstName || '',
      lastName: userData.data?.lastName || '',
      telegramNick: userData.data?.telegramNick || ''
    });
  };

  const handleSaveProfile = async () => {
    try {
      await base44.auth.updateMe({
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        telegramNick: profileData.telegramNick
      });
      await loadUser();
      setShowEditProfile(false);
    } catch (error) {
      console.error('Failed to save profile:', error);
    }
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      // Delete all user's transactions
      const userTransactions = await base44.entities.Transaction.filter({});
      for (const tx of userTransactions) {
        try { await base44.entities.Transaction.delete(tx.id); } catch(e) {}
      }
      // Delete all user's accounts
      const allAccts = await base44.entities.Account.list();
      for (const acc of allAccts) {
        try { await base44.entities.Account.delete(acc.id); } catch(e) {}
      }
      // Delete all user's budgets
      const allBudgets = await base44.entities.Budget.filter({});
      for (const b of allBudgets) {
        try { await base44.entities.Budget.delete(b.id); } catch(e) {}
      }
      // Delete all user's goals
      const allGoals = await base44.entities.Goal.filter({});
      for (const g of allGoals) {
        try { await base44.entities.Goal.delete(g.id); } catch(e) {}
      }
      // Delete all user's investments
      const allInvs = await base44.entities.Investment.list();
      for (const inv of allInvs) {
        try { await base44.entities.Investment.delete(inv.id); } catch(e) {}
      }
      base44.auth.logout();
    } catch (error) {
      console.error('Delete account error:', error);
      setIsDeleting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const handleBackgroundUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingBg(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.auth.updateMe({ background_image_url: file_url });
      await loadUser();
      eventBus.emit(EVENTS.BACKGROUND_CHANGED, { url: file_url });
    } catch (error) {
      console.error('Failed to upload background:', error);
    } finally {
      setIsUploadingBg(false);
      e.target.value = '';
    }
  };

  const handleRemoveBackground = async () => {
    await base44.auth.updateMe({ background_image_url: null });
    await loadUser();
    eventBus.emit(EVENTS.BACKGROUND_CHANGED, { url: null });
  };

  const handleSelectPreset = async (url) => {
    await base44.auth.updateMe({ background_image_url: url });
    await loadUser();
    eventBus.emit(EVENTS.BACKGROUND_CHANGED, { url });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50/95 via-white/95 to-slate-50/95 dark:from-slate-950/90 dark:via-slate-900/90 dark:to-slate-950/90">
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
                  {profileData.firstName?.[0] || user?.full_name?.[0] || user?.email?.[0] || '?'}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                    {profileData.firstName && profileData.lastName 
                      ? `${profileData.firstName} ${profileData.lastName}` 
                      : user?.full_name || 'Пользователь'}
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400">{user?.email}</p>
                  {profileData.telegramNick && (
                    <p className="text-sm text-violet-600">@{profileData.telegramNick}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge 
                      variant="secondary" 
                      className={
                        subscriptionStatus?.plan === 'premium' 
                          ? 'bg-violet-100 text-violet-700' 
                          : subscriptionStatus?.plan === 'family'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-slate-100 text-slate-700'
                      }
                    >
                      <Crown className="w-3 h-3 mr-1" />
                      {subscriptionStatus?.displayName || 'Бесплатный'}
                    </Badge>
                    {subscriptionStatus?.isTrial && subscriptionStatus?.daysLeft > 0 && (
                      <Badge className="bg-amber-100 text-amber-700">
                        <Clock className="w-3 h-3 mr-1" />
                        Осталось {subscriptionStatus.daysLeft} дн.
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowEditProfile(true)}
                  className="rounded-xl"
                >
                  <User className="w-5 h-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Admin Panel */}
        {user?.role === 'admin' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-6"
          >
            <Link to={createPageUrl('Admin')}>
              <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-500 to-orange-600 text-white overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold mb-1 flex items-center gap-2">
                        <SettingsIcon className="w-5 h-5" />
                        Панель администратора
                      </h3>
                      <p className="text-orange-100 text-sm">
                        Управление пользователями и подписками
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        )}

        {/* Subscription */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-6"
        >
          {(!subscriptionStatus?.isActive || subscriptionStatus?.isTrial) && (
            <Card className="border-0 shadow-sm bg-gradient-to-br from-violet-600 to-indigo-700 text-white overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setShowPlanModal(true)}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold mb-1">
                      {subscriptionStatus?.isTrial ? 'Продлите доступ к Premium' : 'Разблокируйте Premium'}
                    </h3>
                    <p className="text-violet-200 text-sm">
                      {subscriptionStatus?.isTrial 
                        ? `Демо-период заканчивается через ${subscriptionStatus.daysLeft} дн.`
                        : 'AI-ассистент, расширенная аналитика и многое другое'
                      }
                    </p>
                  </div>
                  <Button 
                    className="bg-white text-violet-700 hover:bg-violet-50 rounded-xl"
                  >
                    Выбрать план
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
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

          {/* AI Models */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.21 }}
          >
            <Card
              className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setShowAISettings(true)}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">AI-модели</p>
                      <p className="text-sm text-slate-500">DeepSeek и ChatGPT для аналитики</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Personalization */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
          >
            <Card
              className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setShowPersonalization(true)}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                      <Layout className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">Персонализация</p>
                      <p className="text-sm text-slate-500">Настройка меню и блоков дашборда</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
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
                <ThemeToggle />
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

          {/* Background Image */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.27 }}
          >
            <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Image className="w-5 h-5 text-violet-600" />
                  Фоновое изображение
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {user?.background_image_url && (
                  <div className="relative rounded-xl overflow-hidden h-32">
                    <img src={user.background_image_url} alt="Фон" className="w-full h-full object-cover" />
                    <button
                      onClick={handleRemoveBackground}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <label className="block">
                  <input type="file" accept="image/*" onChange={handleBackgroundUpload} className="hidden" disabled={isUploadingBg} />
                  <div className="w-full h-11 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    {isUploadingBg ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Загрузка...
                      </>
                    ) : (
                      <>
                        <Image className="w-4 h-4" />
                        {user?.background_image_url ? 'Заменить изображение' : 'Загрузить изображение'}
                      </>
                    )}
                  </div>
                </label>

                <p className="text-sm text-slate-500 dark:text-slate-400 pt-1">Или выберите готовый фон:</p>
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_BACKGROUNDS.map((preset) => (
                    <button
                      key={preset.url}
                      onClick={() => handleSelectPreset(preset.url)}
                      className={`relative rounded-xl overflow-hidden h-16 border-2 transition-all ${
                        user?.background_image_url === preset.url ? 'border-violet-500' : 'border-transparent'
                      }`}
                    >
                      <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                      {user?.background_image_url === preset.url && (
                        <div className="absolute inset-0 bg-violet-500/20 flex items-center justify-center">
                          <Check className="w-5 h-5 text-white drop-shadow" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Account ID */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Tag className="w-5 h-5 text-violet-600" />
                  ID пользователя
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <code className="flex-1 text-sm font-mono text-slate-600 dark:text-slate-300 break-all">
                    {user?.id}
                  </code>
                  <button
                    onClick={() => copyToClipboard(user?.id)}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors flex-shrink-0"
                    title="Копировать"
                  >
                    <Copy className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Уникальный идентификатор вашего аккаунта
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Security */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
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
           transition={{ delay: 0.4 }}
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

          {/* Delete Account */}
          <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.45 }}
           className="mt-3"
          >
           <Button
             variant="ghost"
             onClick={() => setShowDeleteAccount(true)}
             className="w-full h-12 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
           >
             <Trash2 className="w-4 h-4 mr-2" />
             Удалить аккаунт
           </Button>
          </motion.div>

          {/* Privacy Policy + App Info */}
          <div className="text-center text-sm text-slate-400 py-4 space-y-2">
            <div>
              <Link to="/PrivacyPolicy" className="text-violet-500 hover:text-violet-600 underline underline-offset-2">
                Политика конфиденциальности
              </Link>
            </div>
            <p>Библия Финансов v1.0.0</p>
            <p>© 2025 Все права защищены</p>
          </div>
        </div>
      </div>

      {/* AI Model Settings Modal */}
      <AIModelSettings
        open={showAISettings}
        onOpenChange={setShowAISettings}
      />

      {/* Personalization Modal */}
      <PersonalizationSettings
        open={showPersonalization}
        onOpenChange={setShowPersonalization}
        onSaved={loadUser}
      />

      {/* Edit Profile Modal */}
      <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>Редактировать профиль</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Имя</Label>
              <Input
                value={profileData.firstName}
                onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
                placeholder="Введите имя"
                className="rounded-xl mt-1"
              />
            </div>
            <div>
              <Label>Фамилия</Label>
              <Input
                value={profileData.lastName}
                onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
                placeholder="Введите фамилию"
                className="rounded-xl mt-1"
              />
            </div>
            <div>
              <Label>Телеграм ник</Label>
              <Input
                value={profileData.telegramNick}
                onChange={(e) => setProfileData({...profileData, telegramNick: e.target.value})}
                placeholder="username"
                className="rounded-xl mt-1"
              />
            </div>
            <Button
              onClick={handleSaveProfile}
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600"
            >
              <Check className="w-4 h-4 mr-2" />
              Сохранить
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation */}
      <AlertDialog open={showDeleteAccount} onOpenChange={setShowDeleteAccount}>
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-rose-600">Удалить аккаунт?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>Это действие <strong>нельзя отменить</strong>. Будут безвозвратно удалены:</p>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Все ваши транзакции</li>
                <li>Все счета и их балансы</li>
                <li>Все бюджеты</li>
                <li>Все финансовые цели</li>
                <li>Все инвестиции</li>
              </ul>
              <p className="font-medium">После удаления вы выйдете из системы.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={isDeleting}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 rounded-xl"
            >
              {isDeleting ? 'Удаление...' : 'Удалить навсегда'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                className={`border-2 transition-all ${
                  plan.popular ? 'border-violet-500 shadow-lg shadow-violet-500/20' : 'border-slate-200'
                }`}
              >
                <CardContent className="p-4">
                  {plan.popular && (
                    <Badge className="mb-3 bg-violet-600">Популярный</Badge>
                  )}
                  <h3 className="font-semibold text-lg text-slate-900 dark:text-white">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 my-3">
                    <span className="text-3xl font-bold text-slate-900 dark:text-white">{plan.price}</span>
                    <span className="text-slate-500 dark:text-slate-400">₽/мес</span>
                  </div>
                  <ul className="space-y-2 mb-4">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-center">
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
              Для подключения тарифа свяжитесь с разработчиком
            </p>
            <a 
              href="https://t.me/RussianExpert" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700">
                <span className="mr-2">💬</span>
                Написать в Telegram
              </Button>
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}