import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Star, ChevronRight, Award } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TITLES, ACHIEVEMENTS, getTitleForPoints, getNextTitle } from '@/lib/gamification';
import AchievementsModal from '@/components/dashboard/AchievementsModal';
import { eventBus, EVENTS } from '@/lib/eventBus';

export default function GamificationWidget() {
  const queryClient = useQueryClient();
  const [showAchievements, setShowAchievements] = useState(false);
  const [toast, setToast] = useState(null);

  const { data: profile } = useQuery({
    queryKey: ['gamification'],
    queryFn: async () => {
      const res = await base44.functions.invoke('gamificationDailyCheckin', { action: 'daily_login' });
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const off = eventBus.on(EVENTS.GAMIFICATION_UPDATED, () => {
      queryClient.invalidateQueries({ queryKey: ['gamification'] });
    });
    return off;
  }, [queryClient]);

  useEffect(() => {
    if (!profile) return;
    if (profile.awarded) {
      setToast({
        points: profile.points,
        achievements: profile.newAchievements || [],
        titleChanged: profile.titleChanged,
        newTitle: profile.newTitle,
      });
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [profile]);

  if (!profile || !profile.profile) return null;
  const p = profile.profile;
  const currentTitle = getTitleForPoints(p.total_points || 0);
  const nextTitle = getNextTitle(p.total_points || 0);
  const progressToNext = nextTitle
    ? Math.round(((p.total_points - currentTitle.min) / (nextTitle.min - currentTitle.min)) * 100)
    : 100;
  const unlockedCount = (p.achievements || []).length;
  const totalCount = Object.keys(ACHIEVEMENTS).length;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-6"
      >
        <div className="rounded-2xl border border-border bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 shadow-lg overflow-hidden">
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl backdrop-blur-sm">
                  {currentTitle.icon}
                </div>
                <div>
                  <p className="text-violet-200 text-xs font-medium">Духовный титул</p>
                  <h3 className="text-white font-bold text-base leading-tight">
                    {p.current_title || currentTitle.title}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setShowAchievements(true)}
                className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-colors text-white text-xs font-medium flex items-center gap-1.5"
              >
                <Award className="w-3.5 h-3.5" />
                {unlockedCount}/{totalCount}
              </button>
            </div>

            {nextTitle ? (
              <div>
                <div className="flex justify-between text-xs text-violet-200 mb-1.5">
                  <span>{currentTitle.icon} {currentTitle.min} оч.</span>
                  <span>{nextTitle.icon} {nextTitle.min} оч.</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressToNext}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full bg-white rounded-full"
                  />
                </div>
                <p className="text-violet-200 text-xs mt-2 italic">
                  «{nextTitle.verse}»
                </p>
              </div>
            ) : (
              <div className="text-center py-2">
                <p className="text-white font-semibold text-sm">
                  👑 Высший титул достигнут!
                </p>
                <p className="text-violet-200 text-xs mt-1 italic">
                  «{currentTitle.verse}»
                </p>
              </div>
            )}

            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/20">
              <div className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-orange-300" />
                <span className="text-white text-sm font-semibold">{p.streak_days || 0}</span>
                <span className="text-violet-200 text-xs">дней подряд</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 text-yellow-300" />
                <span className="text-white text-sm font-semibold">{p.total_points || 0}</span>
                <span className="text-violet-200 text-xs">оч. мудрости</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-sm w-full px-4"
          >
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-violet-200 dark:border-violet-800 p-4">
              {toast.titleChanged && toast.newTitle ? (
                <div className="text-center mb-2">
                  <p className="text-2xl mb-1">{toast.newTitle.icon}</p>
                  <p className="text-violet-600 dark:text-violet-400 font-bold text-sm">
                    Новый титул: {toast.newTitle.title}!
                  </p>
                </div>
              ) : null}
              {toast.points > 0 && (
                <p className="text-center text-slate-700 dark:text-slate-200 text-sm">
                  +{toast.points} оч. мудрости
                </p>
              )}
              {toast.achievements && toast.achievements.length > 0 && (
                <div className="mt-2 space-y-1">
                  {toast.achievements.map(code => {
                    const a = ACHIEVEMENTS[code];
                    if (!a) return null;
                    return (
                      <div key={code} className="flex items-center gap-2 bg-violet-50 dark:bg-violet-900/20 rounded-lg p-2">
                        <span className="text-lg">{a.icon}</span>
                        <div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-white">{a.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{a.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AchievementsModal
        open={showAchievements}
        onClose={() => setShowAchievements(false)}
        achievements={p.achievements || []}
        totalPoints={p.total_points || 0}
        streakDays={p.streak_days || 0}
        maxStreak={p.max_streak || 0}
      />
    </>
  );
}