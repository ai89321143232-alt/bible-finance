import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Star, ChevronRight, Award } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TITLES, FAMILY_TITLES, ACHIEVEMENTS, getTitleForPoints, getNextTitle, getFamilyTitleForPoints, getNextFamilyTitle } from '@/lib/gamification';
import AchievementsModal from '@/components/dashboard/AchievementsModal';
import { eventBus, EVENTS } from '@/lib/eventBus';

export default function GamificationWidget() {
  const queryClient = useQueryClient();
  const [showAchievements, setShowAchievements] = useState(false);
  const [toast, setToast] = useState(null);
  const [showPrayer, setShowPrayer] = useState(false);
  const [praying, setPraying] = useState(false);
  const [prayerContext, setPrayerContext] = useState(null); // null | 'family'

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
        familyTitleChanged: profile.familyTitleChanged,
        newFamilyTitle: profile.newFamilyTitle,
      });
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [profile]);

  // Reminder to pray on first daily entry
  useEffect(() => {
    if (!profile || !profile.profile) return;
    const p = profile.profile;
    const today = new Date().toISOString().slice(0, 10);
    if (p.last_daily_login === today && p.last_prayer_date !== today) {
      const timer = setTimeout(() => {
        setPrayerContext(null);
        setShowPrayer(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [profile]);

  const handlePray = async () => {
    setPraying(true);
    try {
      await base44.functions.invoke('gamificationDailyCheckin', {
        action: 'pray',
        context: prayerContext === 'family' ? 'family' : undefined,
      });
      eventBus.emit(EVENTS.GAMIFICATION_UPDATED);
      setShowPrayer(false);
    } catch (e) {
      // ignore
    } finally {
      setPraying(false);
    }
  };

  if (!profile || !profile.profile) return null;
  const p = profile.profile;
  const hasFamily = profile.hasFamily;
  const currentTitle = getTitleForPoints(p.total_points || 0);
  const nextTitle = getNextTitle(p.total_points || 0);
  const progressToNext = nextTitle
    ? Math.round(((p.total_points - currentTitle.min) / (nextTitle.min - currentTitle.min)) * 100)
    : 100;
  const unlockedCount = (p.achievements || []).length;
  const totalCount = Object.keys(ACHIEVEMENTS).length;
  const today = new Date().toISOString().slice(0, 10);
  const hasPrayedToday = p.last_prayer_date === today;

  // Family track
  const familyCurrentTitle = getFamilyTitleForPoints(p.family_points || 0);
  const familyNextTitle = getNextFamilyTitle(p.family_points || 0);
  const familyProgress = familyNextTitle
    ? Math.round(((p.family_points - familyCurrentTitle.min) / (familyNextTitle.min - familyCurrentTitle.min)) * 100)
    : 100;
  const hasFamilyPrayedToday = p.last_family_prayer_date === today;

  const activePrayerTitle = prayerContext === 'family' ? familyCurrentTitle : currentTitle;

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
                <span className="text-violet-200 text-xs">дней</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 text-yellow-300" />
                <span className="text-white text-sm font-semibold">{p.total_points || 0}</span>
                <span className="text-violet-200 text-xs">оч.</span>
              </div>
              <button
                onClick={() => { setPrayerContext(null); setShowPrayer(true); }}
                className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  hasPrayedToday
                    ? 'bg-white/10 text-violet-200'
                    : 'bg-amber-400 hover:bg-amber-300 text-amber-900 animate-pulse'
                }`}
              >
                🙏 {hasPrayedToday ? 'Благодарю' : 'Помолиться'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Family title track */}
      {hasFamily && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-6"
        >
          <div className="rounded-2xl border border-border bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 shadow-lg overflow-hidden">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl backdrop-blur-sm">
                    {familyCurrentTitle.icon}
                  </div>
                  <div>
                    <p className="text-emerald-200 text-xs font-medium">Семейный титул</p>
                    <h3 className="text-white font-bold text-base leading-tight">
                      {p.family_title || familyCurrentTitle.title}
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15">
                  <span className="text-white text-sm font-semibold">{p.family_points || 0}</span>
                  <span className="text-emerald-200 text-xs">оч.</span>
                </div>
              </div>

              {familyNextTitle ? (
                <div>
                  <div className="flex justify-between text-xs text-emerald-200 mb-1.5">
                    <span>{familyCurrentTitle.icon} {familyCurrentTitle.min} оч.</span>
                    <span>{familyNextTitle.icon} {familyNextTitle.min} оч.</span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${familyProgress}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full bg-white rounded-full"
                    />
                  </div>
                  <p className="text-emerald-200 text-xs mt-2 italic">
                    «{familyNextTitle.verse}»
                  </p>
                </div>
              ) : (
                <div className="text-center py-2">
                  <p className="text-white font-semibold text-sm">
                    👑 Высший семейный титул!
                  </p>
                  <p className="text-emerald-200 text-xs mt-1 italic">
                    «{familyCurrentTitle.verse}»
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end mt-4 pt-4 border-t border-white/20">
                <button
                  onClick={() => { setPrayerContext('family'); setShowPrayer(true); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    hasFamilyPrayedToday
                      ? 'bg-white/10 text-emerald-200'
                      : 'bg-amber-400 hover:bg-amber-300 text-amber-900 animate-pulse'
                  }`}
                >
                  🙏 {hasFamilyPrayedToday ? 'Благодарим' : 'Семейная молитва'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Daily prayer reminder */}
      <AnimatePresence>
        {showPrayer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setShowPrayer(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center"
            >
              <div className="text-4xl mb-3">🙏</div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                {prayerContext === 'family' ? 'Семейная молитва дня' : 'Благодарение дня'}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                {prayerContext === 'family'
                  ? 'Поблагодарите Бога за вашу семью, за дом и за ресурсы, которые Он вверил вашей семье.'
                  : 'Поблагодарите Бога за этот день, за жизнь и за ресурсы, которые Он вам вверил.'}
              </p>
              <div className={`rounded-xl p-4 mb-4 ${
                prayerContext === 'family'
                  ? 'bg-emerald-50 dark:bg-emerald-900/20'
                  : 'bg-violet-50 dark:bg-violet-900/20'
              }`}>
                <p className="text-sm text-slate-700 dark:text-slate-200 italic leading-relaxed">
                  «{activePrayerTitle.prayer}»
                </p>
              </div>
              <button
                onClick={handlePray}
                disabled={praying}
                className={`w-full py-3 rounded-xl text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 ${
                  prayerContext === 'family'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600'
                    : 'bg-gradient-to-r from-violet-600 to-indigo-600'
                }`}
              >
                {praying ? '...' : '🙏 Благодарю, Господи!'}
              </button>
              <button
                onClick={() => setShowPrayer(false)}
                className="w-full mt-2 py-2 text-slate-500 dark:text-slate-400 text-xs"
              >
                Позже
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              {toast.familyTitleChanged && toast.newFamilyTitle ? (
                <div className="text-center mb-2">
                  <p className="text-2xl mb-1">{toast.newFamilyTitle.icon}</p>
                  <p className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                    Новый семейный титул: {toast.newFamilyTitle.title}!
                  </p>
                </div>
              ) : null}
              {toast.points > 0 && (
                <p className="text-center text-slate-700 dark:text-slate-200 text-sm">
                  +{toast.points} оч.
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
        familyPoints={p.family_points || 0}
        hasFamily={hasFamily}
      />
    </>
  );
}