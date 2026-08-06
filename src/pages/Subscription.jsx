import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import {
  Crown, Check, Sparkles, TrendingUp, Users, 
  FileBarChart, Shield, Zap, ArrowRight
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const PLANS = [
  {
    id: 'free',
    name: 'Бесплатный',
    price: 0,
    period: 'навсегда',
    description: 'Для начала работы',
    features: [
      'До 100 операций в месяц',
      'Базовая аналитика',
      '1 счет',
      '3 бюджета',
      'Поддержка по email'
    ],
    current: true
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 299,
    period: 'в месяц',
    description: 'Для активных пользователей',
    badge: 'Популярный',
    features: [
      'Неограниченные операции',
      'Продвинутая аналитика',
      'Неограниченно счетов',
      'Неограниченно бюджетов',
      'AI финансовый ассистент',
      'OCR сканирование чеков',
      'Голосовой ввод',
      'Экспорт в Excel',
      'Приоритетная поддержка'
    ],
    highlighted: true
  },
  {
    id: 'family',
    name: 'Family',
    price: 499,
    period: 'в месяц',
    description: 'Для всей семьи',
    features: [
      'Неограниченные операции',
      'Продвинутая аналитика',
      'AI финансовый ассистент',
      'OCR сканирование чеков',
      'Голосовой ввод',
      'Экспорт в Excel',
      'До 5 членов семьи',
      'Общие счета',
      'Синхронизация расходов',
      'Семейные цели',
      'Распределение бюджета',
      'Роли и права доступа',
      'Семейная статистика'
    ]
  }
];

export default function Subscription() {
  const [loading, setLoading] = useState(null);

  const handleSubscribe = async (planId) => {
    if (planId === 'free') {
      toast.info('Вы уже используете бесплатный план');
      return;
    }

    setLoading(planId);

    try {
      // В реальном приложении здесь будет интеграция со Stripe
      // Пример:
      // const stripe = await stripePromise;
      // const response = await base44.integrations.Stripe.CreateCheckoutSession({
      //   price_id: planId === 'premium' ? 'price_xxx' : 'price_yyy',
      //   success_url: window.location.origin + '/settings',
      //   cancel_url: window.location.origin + '/subscription'
      // });
      // await stripe.redirectToCheckout({ sessionId: response.session_id });

      // Для демо просто показываем сообщение
      toast.success('Функция оплаты будет доступна после настройки Stripe');
      
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error('Ошибка при оформлении подписки');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-24 sm:pb-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-sm font-medium mb-4">
            <Crown className="w-4 h-4" />
            Выберите свой тариф
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Разблокируйте все возможности
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Получите полный контроль над своими финансами с Premium функциями
          </p>
        </motion.div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {PLANS.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={plan.highlighted ? 'md:-mt-4' : ''}
            >
              <Card className={`border-0 shadow-lg relative ${
                plan.highlighted 
                  ? 'bg-gradient-to-br from-violet-600 to-indigo-700 text-white ring-4 ring-violet-200 dark:ring-violet-800' 
                  : 'bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm'
              }`}>
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-amber-500 text-white px-4 py-1">
                      {plan.badge}
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-4">
                  <CardTitle className="text-center">
                    <div className={`inline-flex p-3 rounded-xl mb-4 ${
                      plan.highlighted ? 'bg-white/20' : 'bg-violet-100 dark:bg-violet-900/30'
                    }`}>
                      {plan.id === 'free' ? (
                        <Shield className={`w-6 h-6 ${plan.highlighted ? 'text-white' : 'text-violet-600'}`} />
                      ) : plan.id === 'premium' ? (
                        <Sparkles className="w-6 h-6 text-white" />
                      ) : (
                        <Users className={`w-6 h-6 ${plan.highlighted ? 'text-white' : 'text-violet-600'}`} />
                      )}
                    </div>
                    <h3 className={`text-2xl font-bold ${plan.highlighted ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                      {plan.name}
                    </h3>
                    <p className={`text-sm mt-2 ${
                      plan.highlighted ? 'text-violet-100' : 'text-slate-500 dark:text-slate-400'
                    }`}>
                      {plan.description}
                    </p>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center mb-6">
                    <div className={`text-4xl font-bold ${plan.highlighted ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                      {plan.price === 0 ? 'Бесплатно' : `${plan.price} ₽`}
                    </div>
                    <div className={`text-sm mt-1 ${
                      plan.highlighted ? 'text-violet-200' : 'text-slate-500 dark:text-slate-400'
                    }`}>
                      {plan.period}
                    </div>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                          plan.highlighted ? 'text-white' : 'text-emerald-500'
                        }`} />
                        <span className={`text-sm ${
                          plan.highlighted ? 'text-white' : 'text-slate-600 dark:text-slate-300'
                        }`}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={plan.current || loading === plan.id}
                    className={`w-full rounded-xl h-12 ${
                      plan.highlighted 
                        ? 'bg-white text-violet-700 hover:bg-white/90' 
                        : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white'
                    }`}
                  >
                    {loading === plan.id ? (
                      <span className="animate-pulse">Загрузка...</span>
                    ) : plan.current ? (
                      'Текущий план'
                    ) : (
                      <>
                        Выбрать план
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Features Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-center">Почему Premium?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="w-6 h-6 text-violet-600" />
                  </div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2">AI Ассистент</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Умный помощник для финансовых советов
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <TrendingUp className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Аналитика</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Продвинутые графики и отчеты
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Zap className="w-6 h-6 text-blue-600" />
                  </div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Автоматизация</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    OCR чеков и голосовой ввод
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <FileBarChart className="w-6 h-6 text-amber-600" />
                  </div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Экспорт</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Выгрузка в Excel и PDF
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Есть вопросы? Свяжитесь с нами: <a href="mailto:support@financeapp.ru" className="text-violet-600 hover:underline">support@financeapp.ru</a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}