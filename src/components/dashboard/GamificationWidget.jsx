import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Star, Award, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TITLES, FAMILY_TITLES, ACHIEVEMENTS, getTitleForPoints, getNextTitle, getFamilyTitleForPoints, getNextFamilyTitle } from '@/lib/gamification';
import AchievementsModal from '@/components/dashboard/AchievementsModal';
import { eventBus, EVENTS } from '@/lib/eventBus';

const PersonalTitleCard = ({ p, currentTitle, nextTitle, progressToNext, unlockedCount, totalCount, hasPrayedToday, onPray, onShowAchievements }) => (
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
          onClick={onShowAchievements}
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
          onClick={hasPrayedToday ? undefined : onPray}
          disabled={hasPrayedToday}
          className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[36px] ${
            hasPrayedToday
              ? 'bg-white/10 text-violet-200 cursor-default'
              : 'bg-amber-400 hover:bg-amber-300 text-amber-900 animate-pulse'
          }`}
        >
          🙏 {hasPrayedToday ? 'Благодарю' : 'Помолиться'}
        </button>
      </div>
    </div>
  </div>
);

const FamilyTitleCard = ({ p, familyCurrentTitle, familyNextTitle, familyProgress, hasFamilyPrayedToday, onPray }) => (
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
          onClick={hasFamilyPrayedToday ? undefined : onPray}
          disabled={hasFamilyPrayedToday}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[36px] ${
            hasFamilyPrayedToday
              ? 'bg-white/10 text-emerald-200 cursor-default'
              : 'bg-amber-400 hover:bg-amber-300 text-amber-900 animate-pulse'
          }`}
        >
          🙏 {hasFamilyPrayedToday ? 'Благодарим' : 'Семейная молитва'}
        </button>
      </div>
    </div>
  </div>
);

export default function GamificationWidget() {
  const queryClient = useQueryClient();
  const [showAchievements, setShowAchievements] = useState(false);
  const [toast, setToast] = useState(null);
  const [showPrayer, setShowPrayer] = useState(false);
  const [praying, setPraying] = useState(false);
  const [prayerContext, setPrayerContext] = useState(null); // null | 'family'
  const [activeIndex, setActiveIndex] = useState(0); // 0 = personal, 1 = family

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

  const fireConfetti = () => {
    const colors = ['#8b5cf6', '#6366f1', '#a855f7', '#10b981', '#14b8a6', '#f59e0b'];
    const end = Date.now() + 1500;
    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 70,
        origin: { x: 0 },
        colors,
        zIndex: 100,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 70,
        origin: { x: 1 },
        colors,
        zIndex: 100,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  };

  useEffect(() => {
    if (!profile) return;
    if (profile.awarded) {
      const hasTitleChange = profile.titleChanged || profile.familyTitleChanged;
      setToast({
        points: profile.points,
        achievements: profile.newAchievements || [],
        titleChanged: profile.titleChanged,
        newTitle: profile.newTitle,
        familyTitleChanged: profile.familyTitleChanged,
        newFamilyTitle: profile.newFamilyTitle,
        isTitleUp: hasTitleChange,
      });
      if (hasTitleChange) {
        setTimeout(fireConfetti, 100);
      }
      const timer = setTimeout(() => setToast(null), hasTitleChange ? 7000 : 5000);
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
        setPrayerContext(activeIndex === 1 ? 'family' : null);
        setShowPrayer(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [profile, activeIndex]);

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

  const handleDragEnd = (event, info) => {
    const threshold = 50;
    if (info.offset.x < -threshold && activeIndex === 0 && hasFamily) {
      setActiveIndex(1);
    } else if (info.offset.x > threshold && activeIndex === 1) {
      setActiveIndex(0);
    }
  };

  const cards = [
    {
      key: 'personal',
      node: (
        <PersonalTitleCard
          p={p}
          currentTitle={currentTitle}
          nextTitle={nextTitle}
          progressToNext={progressToNext}
          unlockedCount={unlockedCount}
          totalCount={totalCount}
          hasPrayedToday={hasPrayedToday}
          onPray={() => { setPrayerContext(null); setShowPrayer(true); }}
          onShowAchievements={() => setShowAchievements(true)}
        />
      ),
      dotColor: 'bg-violet-500',
    },
  ];

  if (hasFamily) {
    cards.push({
      key: 'family',
      node: (
        <FamilyTitleCard
          p={p}
          familyCurrentTitle={familyCurrentTitle}
          familyNextTitle={familyNextTitle}
          familyProgress={familyProgress}
          hasFamilyPrayedToday={hasFamilyPrayedToday}
          onPray={() => { setPrayerContext('family'); setShowPrayer(true); }}
        />
      ),
      dotColor: 'bg-emerald-500',
    });
  }

  const useCarousel = cards.length > 1;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-6"
      >
        {useCarousel ? (
          <div className="overflow-hidden">
            <motion.div
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              animate={{ x: `-${activeIndex * 100}%` }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="flex cursor-grab active:cursor-grabbing"
            >
              {cards.map((card) => (
                <div key={card.key} className="w-full shrink-0 px-0.5 min-h-[44px]">
                  {card.node}
                </div>
              ))}
            </motion.div>

            {/* Dot indicators */}
            <div className="flex items-center justify-center gap-2 mt-3">
              {cards.map((card, idx) => (
                <button
                  key={card.key}
                  onClick={() => setActiveIndex(idx)}
                  className={`transition-all rounded-full ${card.dotColor} ${
                    activeIndex === idx ? 'w-6 h-2.5' : 'w-2.5 h-2.5 opacity-40'
                  }`}
                  aria-label={`Титул ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        ) : (
          cards[0].node
        )}
      </motion.div>

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
            initial={{ opacity: 0, y: -30, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] max-w-sm w-full px-4"
          >
            {toast.isTitleUp ? (
              <div className={`relative rounded-2xl shadow-2xl overflow-hidden p-5 text-center ${
                toast.familyTitleChanged
                  ? 'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600'
                  : 'bg-gradient-to-br from-violet-500 via-indigo-500 to-purple-600'
              }`}>
                {/* Glow shimmer */}
                <motion.div
                  className="absolute inset-0 bg-white/20"
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.5 }}
                />
                <motion.div
                  animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.15, 1] }}
                  transition={{ duration: 0.6, repeat: 2 }}
                  className="text-5xl mb-2 relative"
                >
                  {toast.familyTitleChanged
                    ? (toast.newFamilyTitle?.icon || '👑')
                    : (toast.newTitle?.icon || '👑')}
                </motion.div>
                <div className="flex items-center justify-center gap-1.5 mb-1 relative">
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                  <p className="text-white/90 text-xs font-semibold uppercase tracking-wide">
                    {toast.familyTitleChanged ? 'Новый семейный титул!' : 'Новый титул!'}
                  </p>
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                </div>
                <p className="text-white font-bold text-lg relative">
                  {toast.familyTitleChanged
                    ? toast.newFamilyTitle?.title
                    : toast.newTitle?.title}
                </p>
                {toast.points > 0 && (
                  <p className="text-white/80 text-sm mt-2 relative">+{toast.points} оч. мудрости</p>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-violet-200 dark:border-violet-800 p-4">
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
            )}
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