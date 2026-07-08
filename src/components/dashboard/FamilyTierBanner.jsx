import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Users, X, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// ============================================================
// FamilyTierBanner — ненавязчивая рекомендация подключить семейный тариф.
// Показывается, если пользователь НЕ подключён к семье (или на free-тарифе)
// и ещё не скрыл напоминание. Кнопка "×" сохраняет отказ в профиль навсегда.
// ============================================================
export default function FamilyTierBanner({ user, hasFamily }) {
  const [dismissed, setDismissed] = useState(false);

  const alreadyDismissed = user?.family_tier_hint_dismissed === true;
  const subscription = user?.subscription || user?.subscription_tier;
  const isFamilyTier = subscription === 'family';

  // Показываем только тем, кто не в семье или на бесплатном тарифе
  const shouldShow = user && !alreadyDismissed && !dismissed && (!hasFamily || !isFamilyTier);

  const handleDismiss = async () => {
    setDismissed(true);
    try {
      await base44.auth.updateMe({ family_tier_hint_dismissed: true });
    } catch (e) {
      // тихо игнорируем — баннер уже скрыт локально
    }
  };

  if (!shouldShow) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        className="mb-4"
      >
        <div className="relative rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-indigo-500/10 p-4 pr-10">
          <button
            onClick={handleDismiss}
            aria-label="Скрыть напоминание"
            className="absolute top-3 right-3 w-6 h-6 rounded-md flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <Link to={createPageUrl('Subscription')} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-violet-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm">Семейный тариф</p>
              <p className="text-white/50 text-xs mt-0.5">
                Ведите общий бюджет с близкими, делитесь целями и счетами
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-white/30 flex-shrink-0" />
          </Link>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}