import React, { useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Sparkles } from 'lucide-react';
import { ACHIEVEMENTS } from '@/lib/gamification';

// Декоративные монетки, разлетающиеся из центра
const COINS = Array.from({ length: 10 }).map((_, i) => ({
  id: i,
  angle: (i / 10) * Math.PI * 2,
  distance: 60 + (i % 3) * 22,
  delay: i * 0.04,
  size: 16 + (i % 4) * 6,
  gold: i % 2 === 0,
}));

function AnimatedPoints({ value }) {
  const mv = useMotionValue(0);
  const [display, setDisplay] = React.useState(0);

  useEffect(() => {
    const controls = animate(mv, value, { duration: 1.1, ease: 'easeOut' });
    const unsub = mv.on('change', (v) => setDisplay(Math.round(v)));
    return () => { controls.stop(); unsub(); };
  }, [value, mv]);

  return <>{display}</>;
}

export default function RewardPopup({ toast, onClose }) {
  const isFamily = toast?.familyTitleChanged;
  const titleChanged = toast?.titleChanged || toast?.familyTitleChanged;
  const newTitle = isFamily ? toast?.newFamilyTitle : toast?.newTitle;

  const ringGradient = isFamily
    ? 'from-emerald-400 via-teal-300 to-amber-300'
    : 'from-violet-500 via-fuchsia-400 to-amber-300';

  const ringShadow = isFamily
    ? '0 0 40px 6px rgba(16,185,129,0.45)'
    : '0 0 40px 6px rgba(139,92,246,0.45)';

  const accentColor = isFamily ? '#34d399' : '#a78bfa';

  // Взрыв золотых/фиолетовых монет при появлении
  useEffect(() => {
    if (!toast) return;
    const colors = ['#FFD700', '#F59E0B', '#8b5cf6', '#7B68EE', '#fbbf24'];
    const end = Date.now() + 900;
    const frame = () => {
      confetti({
        particleCount: 6,
        spread: 360,
        startVelocity: 28,
        ticks: 70,
        gravity: 0.9,
        decay: 0.92,
        scalar: 1.1,
        shapes: ['circle'],
        colors,
        origin: { x: 0.5, y: 0.42 },
        zIndex: 110,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [toast]);

  const achievementItems = useMemo(() => {
    return (toast?.achievements || [])
      .map((code) => ACHIEVEMENTS[code])
      .filter(Boolean);
  }, [toast?.achievements]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.85, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 16, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl text-center"
            style={{ background: 'linear-gradient(160deg, #1A1A1A 0%, #2E1F35 100%)' }}
          >
            {/* Светящаяся подсветка фона */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(circle at 50% 38%, ${isFamily ? 'rgba(16,185,129,0.18)' : 'rgba(139,92,246,0.22)'} 0%, transparent 60%)`,
              }}
            />

            {/* Кнопка закрытия (мин-тап 44px) */}
            <button
              onClick={onClose}
              aria-label="Закрыть"
              className="absolute top-3 right-3 w-11 h-11 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors z-20"
            >
              ✕
            </button>

            <div className="relative px-6 pt-7 pb-5">
              {/* Центральный круг с иконкой титула + взрыв монет */}
              <div className="relative mx-auto mb-4" style={{ width: 128, height: 128 }}>
                {/* Свечение */}
                <div
                  className="absolute inset-0 rounded-full blur-xl"
                  style={{ background: isFamily ? 'rgba(16,185,129,0.5)' : 'rgba(139,92,246,0.55)' }}
                />
                {/* Кольцо с градиентом */}
                <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${ringGradient} p-[3px]`}>
                  <div className="w-full h-full rounded-full flex items-center justify-center" style={{ background: '#1A1A1A' }}>
                    <motion.span
                      animate={titleChanged ? { rotate: [0, 12, -12, 0], scale: [1, 1.12, 1] } : {}}
                      transition={{ duration: 0.7, repeat: titleChanged ? 2 : 0 }}
                      className="text-4xl"
                    >
                      {titleChanged ? (newTitle?.icon || '👑') : '🙏'}
                    </motion.span>
                  </div>
                </div>

                {/* Разлетающиеся монетки */}
                {COINS.map((c) => {
                  const x = Math.cos(c.angle) * c.distance;
                  const y = Math.sin(c.angle) * c.distance;
                  return (
                    <motion.span
                      key={c.id}
                      initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                      animate={{ x, y, scale: 1, opacity: [0, 1, 0] }}
                      transition={{ duration: 1.1, delay: c.delay, ease: 'easeOut' }}
                      className="absolute top-1/2 left-1/2 -ml-2 -mt-2 rounded-full"
                      style={{
                        width: c.size,
                        height: c.size,
                        background: c.gold
                          ? 'linear-gradient(135deg, #FFD700, #F59E0B)'
                          : 'linear-gradient(135deg, #8b5cf6, #7B68EE)',
                        boxShadow: c.gold ? '0 0 8px #FFD700' : '0 0 8px #8b5cf6',
                      }}
                    />
                  );
                })}
              </div>

              {/* Бейдж нового титула */}
              {titleChanged ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="flex items-center justify-center gap-1.5 mb-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <p className="text-amber-300 text-[11px] font-bold uppercase tracking-wider">
                    {isFamily ? 'Новый семейный титул!' : 'Новый титул!'}
                  </p>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                </motion.div>
              ) : null}

              {/* Название титула */}
              {titleChanged ? (
                <p className="text-white font-bold text-lg mb-1">
                  {newTitle?.title}
                </p>
              ) : null}

              {/* Начисленные очки (счётчик от 0) */}
              {toast?.points > 0 ? (
                <p
                  className="font-extrabold text-2xl mb-1"
                  style={{ color: '#FFD700', textShadow: '0 2px 12px rgba(255,215,0,0.4)' }}
                >
                  +<AnimatedPoints value={toast.points} /> оч. мудрости
                </p>
              ) : null}

              {/* Достижения */}
              {achievementItems.length > 0 ? (
                <div className="mt-3 space-y-1.5">
                  {achievementItems.map((a) => (
                    <motion.div
                      key={a.title}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.35 }}
                      className="flex items-center gap-2.5 rounded-xl p-2 text-left"
                      style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${accentColor}33` }}
                    >
                      <span className="text-xl shrink-0">{a.icon}</span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-white leading-tight">{a.title}</p>
                        <p className="text-[11px] text-white/60 leading-snug">{a.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}