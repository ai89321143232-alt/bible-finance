import React from 'react';
import { motion } from 'framer-motion';
import { Flame, Star, Trophy } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ACHIEVEMENTS, TITLES, FAMILY_TITLES, getTitleForPoints, getFamilyTitleForPoints } from '@/lib/gamification';

export default function AchievementsModal({
  open,
  onClose,
  achievements,
  totalPoints,
  streakDays,
  maxStreak,
  familyPoints,
  hasFamily,
}) {
  const currentTitle = getTitleForPoints(totalPoints);
  const familyCurrentTitle = getFamilyTitleForPoints(familyPoints || 0);
  const unlocked = new Set(achievements);
  const allKeys = Object.keys(ACHIEVEMENTS);
  const unlockedCount = unlocked.size;

  const renderTitleTrack = (titles, points, currentT, label, accentColor) => (
    <div className="mb-4">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">{label}</p>
      <div className="space-y-2">
        {titles.map((t, i) => {
          const isUnlocked = points >= t.min;
          const isCurrent = currentT.title === t.title;
          const rangeMin = t.min;
          const rangeMax = i < titles.length - 1 ? titles[i + 1].min : t.min;
          const rangeSize = rangeMax - rangeMin || 1;
          const fillPct = isUnlocked
            ? Math.min(100, Math.round(((points - rangeMin) / rangeSize) * 100))
            : 0;

          return (
            <div
              key={i}
              className={`p-2.5 rounded-lg transition-colors ${
                isCurrent
                  ? accentColor === 'emerald'
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700'
                    : 'bg-violet-100 dark:bg-violet-900/30 border border-violet-300 dark:border-violet-700'
                  : isUnlocked
                  ? 'bg-slate-50 dark:bg-slate-800/50 border border-transparent'
                  : 'opacity-50 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-lg">{t.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{t.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t.min} оч.</p>
                </div>
                {isCurrent && (
                  <span className={`text-xs font-bold ${accentColor === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : 'text-violet-600 dark:text-violet-400'}`}>★ Вы здесь</span>
                )}
                {isUnlocked && !isCurrent && (
                  <span className="text-xs text-green-500">✓</span>
                )}
              </div>
              <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${fillPct}%` }}
                  transition={{ duration: 0.5 }}
                  className={`h-full rounded-full ${
                    isCurrent
                      ? accentColor === 'emerald' ? 'bg-emerald-500' : 'bg-violet-500'
                      : isUnlocked
                      ? 'bg-green-400'
                      : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="rounded-2xl max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-violet-600" />
            Достижения
          </DialogTitle>
        </DialogHeader>

        {/* Summary */}
        <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">{currentTitle.icon}</span>
            <div>
              <p className="text-violet-200 text-xs">Текущий титул</p>
              <p className="text-white font-bold">{currentTitle.title}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white/15 rounded-lg p-2">
              <Star className="w-4 h-4 text-yellow-300 mx-auto mb-1" />
              <p className="text-white font-bold text-sm">{totalPoints}</p>
              <p className="text-violet-200 text-xs">очков</p>
            </div>
            <div className="bg-white/15 rounded-lg p-2">
              <Flame className="w-4 h-4 text-orange-300 mx-auto mb-1" />
              <p className="text-white font-bold text-sm">{streakDays}</p>
              <p className="text-violet-200 text-xs">серия</p>
            </div>
            <div className="bg-white/15 rounded-lg p-2">
              <Trophy className="w-4 h-4 text-yellow-300 mx-auto mb-1" />
              <p className="text-white font-bold text-sm">{unlockedCount}/{allKeys.length}</p>
              <p className="text-violet-200 text-xs">наград</p>
            </div>
          </div>
        </div>

        {/* Personal title track */}
        {renderTitleTrack(TITLES, totalPoints, currentTitle, 'Путь личных титулов', 'violet')}

        {/* Family title track */}
        {hasFamily && renderTitleTrack(FAMILY_TITLES, familyPoints || 0, familyCurrentTitle, 'Путь семейных титулов', 'emerald')}

        {/* Achievements grid */}
        <div className="flex-1 overflow-y-auto">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Награды</p>
          <div className="grid grid-cols-2 gap-2">
            {allKeys.map(key => {
              const a = ACHIEVEMENTS[key];
              const isUnlocked = unlocked.has(key);
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`p-3 rounded-xl text-center ${
                    isUnlocked
                      ? 'bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-800'
                      : 'bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 opacity-50'
                  }`}
                >
                  <span className={`text-2xl block mb-1 ${isUnlocked ? '' : 'grayscale'}`}>
                    {isUnlocked ? a.icon : '🔒'}
                  </span>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">{a.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{a.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}