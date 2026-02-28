import React from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

const QUESTS = [
  {
    id: 'daily_login',
    icon: '🌅',
    title: 'Ежедневный вход',
    description: 'Зайди в приложение сегодня',
    reward: 20,
    check: (profile) => profile?.last_daily_login === format(new Date(), 'yyyy-MM-dd')
  },
  {
    id: 'record_expense',
    icon: '📝',
    title: 'Запиши трату',
    description: 'Добавь хотя бы 1 расход сегодня',
    reward: 10,
    check: (profile) => {
      const today = format(new Date(), 'yyyy-MM-dd');
      return profile?.last_transaction_date === today && (profile?.daily_transactions_count || 0) >= 1;
    }
  },
  {
    id: 'record_3',
    icon: '📊',
    title: 'Финансовый аналитик',
    description: 'Добавь 3 записи сегодня',
    reward: 30,
    check: (profile) => {
      const today = format(new Date(), 'yyyy-MM-dd');
      return profile?.last_transaction_date === today && (profile?.daily_transactions_count || 0) >= 3;
    }
  },
  {
    id: 'streak_3',
    icon: '🔥',
    title: '3 дня подряд',
    description: 'Заходи 3 дня без перерыва',
    reward: 50,
    check: (profile) => (profile?.streak_days || 0) >= 3
  },
  {
    id: 'streak_7',
    icon: '⚡',
    title: 'Неделя без пропусков',
    description: '7 дней подряд в приложении',
    reward: 100,
    check: (profile) => (profile?.streak_days || 0) >= 7
  },
  {
    id: 'coins_100',
    icon: '💰',
    title: 'Копилка',
    description: 'Накопи 100 монеток',
    reward: 0,
    check: (profile) => (profile?.total_coins || 0) >= 100
  }
];

export default function DailyQuests({ gameProfile }) {
  const dailyQuests = QUESTS.filter(q => ['daily_login', 'record_expense', 'record_3'].includes(q.id));
  const achievementQuests = QUESTS.filter(q => !['daily_login', 'record_expense', 'record_3'].includes(q.id));

  const completedDaily = dailyQuests.filter(q => q.check(gameProfile)).length;

  return (
    <div className="bg-white rounded-3xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-black text-slate-800 text-lg">🎯 Задания</h2>
        <span className="text-xs font-bold text-violet-600 bg-violet-100 px-2 py-1 rounded-full">
          {completedDaily}/{dailyQuests.length} сегодня
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Ежедневные</p>
        {dailyQuests.map((quest, i) => {
          const done = quest.check(gameProfile);
          return (
            <motion.div
              key={quest.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`flex items-center justify-between p-3 rounded-2xl ${
                done ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{quest.icon}</span>
                <div>
                  <p className={`font-bold text-sm ${done ? 'text-emerald-700 line-through' : 'text-slate-700'}`}>
                    {quest.title}
                  </p>
                  <p className="text-xs text-slate-400">{quest.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {done ? (
                  <span className="text-emerald-500 text-lg">✅</span>
                ) : (
                  <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                    +{quest.reward}🪙
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Достижения</p>
        {achievementQuests.map((quest, i) => {
          const done = quest.check(gameProfile);
          return (
            <motion.div
              key={quest.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`flex items-center justify-between p-3 rounded-2xl ${
                done ? 'bg-violet-50 border border-violet-200' : 'bg-slate-50 opacity-70'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{done ? quest.icon : '🔒'}</span>
                <div>
                  <p className={`font-bold text-sm ${done ? 'text-violet-700' : 'text-slate-500'}`}>
                    {quest.title}
                  </p>
                  <p className="text-xs text-slate-400">{quest.description}</p>
                </div>
              </div>
              {done ? (
                <span className="text-violet-500 text-lg">🏆</span>
              ) : quest.reward > 0 ? (
                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  +{quest.reward}🪙
                </span>
              ) : null}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}