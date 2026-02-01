import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Copy, Gift, TrendingUp, Users, Calendar, Share2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function Referral() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [copied, setCopied] = useState(false);

  const { data: userData } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
      return user;
    }
  });

  const { data: referralStats = {} } = useQuery({
    queryKey: ['referralStats', userData?.id],
    queryFn: async () => {
      if (!userData?.id) return {};
      const referred = await base44.entities.User.filter({ referred_by: userData.id });
      return {
        totalReferred: referred.length,
        totalEarnings: userData?.referral_earnings || 0
      };
    },
    enabled: !!userData?.id
  });

  const generateReferralCode = useMutation({
    mutationFn: async () => {
      const code = 'REF' + Math.random().toString(36).substring(2, 11).toUpperCase();
      await base44.auth.updateMe({ referral_code: code });
      return code;
    },
    onSuccess: (code) => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success('Реферальный код создан!');
    }
  });

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Скопировано в буфер обмена');
  };

  const referralLink = currentUser?.referral_code 
    ? `https://financeapp.com?ref=${currentUser.referral_code}`
    : null;

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
            Реферальная программа
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Приглашайте друзей и получайте награды
          </p>
        </motion.div>

        {/* Main Benefits */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="h-full">
              <CardHeader className="text-center">
                <Gift className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <CardTitle className="text-lg">Подарок для друга</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-sm text-slate-600 dark:text-slate-400">
                Ваш друг получает <span className="font-semibold text-emerald-600">месяц подписки</span> бесплатно
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="h-full">
              <CardHeader className="text-center">
                <Gift className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <CardTitle className="text-lg">Подарок для вас</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-sm text-slate-600 dark:text-slate-400">
                Вы получаете <span className="font-semibold text-emerald-600">месяц подписки</span> бесплатно
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="h-full">
              <CardHeader className="text-center">
                <TrendingUp className="w-8 h-8 text-violet-600 mx-auto mb-2" />
                <CardTitle className="text-lg">Кешбек</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-sm text-slate-600 dark:text-slate-400">
                Получайте <span className="font-semibold text-emerald-600">5% кешбек</span> с оплат друга
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid md:grid-cols-2 gap-4 mb-8"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Приглашено друзей
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">
                {referralStats.totalReferred || 0}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                Активных рефералов
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                Заработано
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">
                ₽{(referralStats.totalEarnings || 0).toFixed(0)}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                От кешбека с платежей
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Referral Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Ваша реферальная ссылка</CardTitle>
              <CardDescription>
                Поделитесь этой ссылкой с друзьями
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!currentUser?.referral_code ? (
                <Button
                  onClick={() => generateReferralCode.mutate()}
                  disabled={generateReferralCode.isPending}
                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 h-12"
                >
                  {generateReferralCode.isPending ? 'Генерирование...' : 'Создать реферальный код'}
                </Button>
              ) : (
                <>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={referralLink}
                      className="bg-slate-50 dark:bg-slate-900 text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(referralLink)}
                      className="shrink-0"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>

                  {/* Share buttons */}
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const text = `Присоединяйся к Family Finances и получи месяц подписки в подарок! ${referralLink}`;
                        window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`, '_blank');
                      }}
                      className="gap-2"
                    >
                      <Share2 className="w-4 h-4" />
                      Telegram
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const text = `Присоединяйся к Family Finances и получи месяц подписки в подарок! ${referralLink}`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                      }}
                      className="gap-2"
                    >
                      <Share2 className="w-4 h-4" />
                      WhatsApp
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8"
        >
          <Card>
            <CardHeader>
              <CardTitle>Как это работает?</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                <li className="flex gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-400 font-semibold shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      Поделитесь реферальной ссылкой
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Отправьте ссылку друзьям через любой канал
                    </p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-400 font-semibold shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      Друг регистрируется по вашей ссылке
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Оба получают месяц подписки бесплатно
                    </p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-400 font-semibold shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      Когда друг продлевает подписку
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Вы получаете 5% кешбек с его платежа
                    </p>
                  </div>
                </li>
              </ol>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}