import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CoinCounter from './CoinCounter';
import CoinAnimation from './CoinAnimation';
import QuickAddTransaction from '@/components/transactions/QuickAddTransaction';
import DailyQuests from './DailyQuests';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const DAILY_LOGIN_COINS = 20;
const TRANSACTION_COINS = 10;
const MAX_DAILY_TX_REWARDS = 5;

const LEVEL_TITLES = [
  '', 'Копилка 🐷', 'Монетник 🪙', 'Казначей 💰', 'Финансист 📊', 'Миллионер 💎'
];

export default function ChildDashboard({ user, accounts, onTransactionAdded }) {
  const queryClient = useQueryClient();
  const [gameProfile, setGameProfile] = useState(null);
  const [coinAnim, setCoinAnim] = useState(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddType, setQuickAddType] = useState('expense');

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', user?.family_id],
    queryFn: () => base44.entities.Transaction.list('-date', 10),
    enabled: !!user
  });

  useEffect(() => {
    if (user) loadAndUpdateGameProfile();
  }, [user]);

  const loadAndUpdateGameProfile = async () => {
    const { data } = await base44.functions.invoke('childGameReward', { action: 'daily_login' });
    setGameProfile(data.profile);
    if (data.awarded) {
      setCoinAnim({ coins: data.coins, message: 'Ежедневная награда!' });
    }
  };

  const awardTransactionCoins = async () => {
    if (!gameProfile) return;

    const { data } = await base44.functions.invoke('childGameReward', { action: 'transaction' });
    setGameProfile(data.profile);
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    if (data.awarded) {
      setCoinAnim({ coins: data.coins, message: 'За запись расхода!' });
    }
    if (onTransactionAdded) onTransactionAdded();
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(amount);

  const totalBalance = accounts?.reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0;

  const level = gameProfile?.level || 1;
  const levelTitle = LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length - 1)];

  const CHILD_CATEGORIES = [
    { label: 'Еда 🍕', type: 'expense' },
    { label: 'Игры 🎮', type: 'expense' },
    { label: 'Карманные 💵', type: 'income' },
    { label: 'Подарок 🎁', type: 'income' }
  ];

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-yellow-50 via-pink-50 to-violet-50"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)',
      }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-500 to-pink-500 px-4 pt-8 pb-6 rounded-b-3xl shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/80 text-sm">Привет,</p>
            <h1 className="text-2xl font-black text-white">{user?.full_name?.split(' ')[0] || 'Друг'} 👋</h1>
            <p className="text-white/70 text-xs mt-0.5">{levelTitle}</p>
          </div>
          <div className="text-right">
            <p className="text-white/70 text-xs">Мой кошелёк</p>
            <p className="text-2xl font-black text-white">{formatCurrency(totalBalance)}</p>
          </div>
        </div>

        {gameProfile && (
          <CoinCounter coins={gameProfile.total_coins || 0} level={level} />
        )}
      </div>

      <div className="px-4 pt-6 space-y-5">
        {/* Quick Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.03 }}
            onClick={() => { setQuickAddType('expense'); setShowQuickAdd(true); }}
            className="bg-gradient-to-br from-rose-400 to-pink-500 text-white rounded-3xl p-5 text-left shadow-lg shadow-rose-400/30"
          >
            <div className="text-3xl mb-2">🛒</div>
            <div className="font-bold text-lg">Трата</div>
            <div className="text-white/80 text-xs">+10 монеток</div>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.03 }}
            onClick={() => { setQuickAddType('income'); setShowQuickAdd(true); }}
            className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white rounded-3xl p-5 text-left shadow-lg shadow-emerald-400/30"
          >
            <div className="text-3xl mb-2">💵</div>
            <div className="font-bold text-lg">Доход</div>
            <div className="text-white/80 text-xs">+10 монеток</div>
          </motion.button>
        </div>

        {/* Achievements streak */}
        {gameProfile?.streak_days > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-orange-400 to-yellow-400 rounded-2xl p-4 flex items-center gap-3 shadow-md"
          >
            <div className="text-4xl">🔥</div>
            <div>
              <p className="font-black text-white text-lg">{gameProfile.streak_days} дней подряд!</p>
              <p className="text-white/80 text-xs">Продолжай заходить каждый день</p>
            </div>
          </motion.div>
        )}

        {/* Recent transactions */}
        <div className="bg-white rounded-3xl p-4 shadow-sm">
          <h2 className="font-black text-slate-800 text-lg mb-3">📋 Мои записи</h2>
          {transactions.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-2">📭</div>
              <p className="text-slate-500 text-sm">Пока нет записей</p>
              <p className="text-slate-400 text-xs mt-1">Добавь первую трату и получи монетки!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.slice(0, 5).map((tx, i) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                      tx.type === 'income' ? 'bg-emerald-100' : 'bg-rose-100'
                    }`}>
                      {tx.type === 'income' ? '💵' : '🛒'}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700 text-sm">{tx.category}</p>
                      <p className="text-xs text-slate-400">{tx.date}</p>
                    </div>
                  </div>
                  <p className={`font-bold ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Penalty warning */}
        {gameProfile && gameProfile.last_daily_login && (
          (() => {
            const lastLogin = new Date(gameProfile.last_daily_login);
            lastLogin.setHours(0,0,0,0);
            const today = new Date();
            today.setHours(0,0,0,0);
            const diff = Math.floor((today - lastLogin) / (1000*60*60*24));
            if (diff > 1) {
              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gradient-to-r from-red-400 to-rose-500 rounded-2xl p-4 flex items-center gap-3 shadow-md"
                >
                  <div className="text-4xl">😬</div>
                  <div>
                    <p className="font-black text-white text-lg">Штраф -{(diff-1)*10} монеток!</p>
                    <p className="text-white/80 text-xs">Пропустил {diff-1} {diff-1 === 1 ? 'день' : 'дня'}. Не пропускай!</p>
                  </div>
                </motion.div>
              );
            }
            return null;
          })()
        )}

        {/* Daily Quests */}
        <DailyQuests gameProfile={gameProfile} />
      </div>

      {/* Coin animation overlay */}
      <AnimatePresence>
        {coinAnim && (
          <CoinAnimation
            coins={coinAnim.coins}
            message={coinAnim.message}
            onComplete={() => setCoinAnim(null)}
          />
        )}
      </AnimatePresence>

      {/* Quick Add */}
      <AnimatePresence>
        {showQuickAdd && (
          <QuickAddTransaction
            onClose={() => {
              setShowQuickAdd(false);
              awardTransactionCoins();
            }}
            accounts={accounts}
            defaultType={quickAddType}
          />
        )}
      </AnimatePresence>
    </div>
  );
}