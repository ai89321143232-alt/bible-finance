import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function AnimatedBook() {
  // Книга с открывающимися страницами, анимация зациклена на 5 секунд
  return (
    <div className="relative w-40 h-32 flex items-center justify-center">
      <svg viewBox="0 0 200 160" className="w-full h-full">
        {/* Тень книги */}
        <ellipse cx="100" cy="150" rx="70" ry="6" fill="rgba(0,0,0,0.3)" />

        {/* Нижняя обложка книги */}
        <rect x="30" y="100" width="140" height="14" rx="3" fill="#5b21b6" />
        <rect x="30" y="100" width="140" height="14" rx="3" fill="url(#coverGrad)" opacity="0.6" />

        {/* Корешок книги */}
        <rect x="96" y="40" width="8" height="74" fill="#4c1d95" />

        {/* Левая страница (открывается) */}
        <motion.g
          style={{ originX: '100px', originY: '100px' }}
          initial={{ rotateY: 0 }}
          animate={{ rotateY: [0, -160, -160, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <rect x="32" y="42" width="66" height="60" rx="2" fill="#fafaf9" stroke="#e7e5e4" strokeWidth="1" />
          {/* Строки текста */}
          {[48, 56, 64, 72, 80, 88].map((y, i) => (
            <line key={i} x1="38" y1={y} x2={i % 2 ? 86 : 82} y2={y} stroke="#d6d3d1" strokeWidth="1.2" strokeLinecap="round" />
          ))}
        </motion.g>

        {/* Правая страница (открывается) */}
        <motion.g
          style={{ originX: '100px', originY: '100px' }}
          initial={{ rotateY: 0 }}
          animate={{ rotateY: [0, 160, 160, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <rect x="102" y="42" width="66" height="60" rx="2" fill="#fafaf9" stroke="#e7e5e4" strokeWidth="1" />
          {[48, 56, 64, 72, 80, 88].map((y, i) => (
            <line key={i} x1="108" y1={y} x2={i % 2 ? 156 : 160} y2={y} stroke="#d6d3d1" strokeWidth="1.2" strokeLinecap="round" />
          ))}
        </motion.g>

        {/* Светящийся символ на корешке */}
        <motion.circle
          cx="100" cy="76" r="4"
          fill="#fbbf24"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Градиенты */}
        <defs>
          <linearGradient id="coverGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#4c1d95" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export default function SplashScreen({ onFinish }) {
  const [phase, setPhase] = useState('in'); // 'in' | 'hold' | 'out' | 'done'

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 1000);
    const t2 = setTimeout(() => setPhase('out'), 4400);
    const t3 = setTimeout(() => { setPhase('done'); onFinish(); }, 5000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <AnimatePresence>
      {phase !== 'done' && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          animate={{ opacity: phase === 'out' ? 0 : 1 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0a0d13] overflow-hidden"
        >
          {/* Animated background blobs */}
          <motion.div
            className="absolute w-96 h-96 rounded-full bg-violet-600/20 blur-3xl"
            animate={{ scale: [1, 1.3, 1], x: [0, 40, 0], y: [0, -30, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            style={{ top: '10%', left: '10%' }}
          />
          <motion.div
            className="absolute w-80 h-80 rounded-full bg-cyan-500/15 blur-3xl"
            animate={{ scale: [1, 1.2, 1], x: [0, -30, 0], y: [0, 40, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            style={{ bottom: '10%', right: '10%' }}
          />
          <motion.div
            className="absolute w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl"
            animate={{ scale: [1, 1.4, 1] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            style={{ top: '40%', right: '20%' }}
          />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center text-center px-8">
            {/* Logo — Animated book */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: 'backOut' }}
              className="mb-6"
            >
              <AnimatedBook />
            </motion.div>

            {/* App name */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-3xl font-bold text-white mb-2 tracking-tight"
            >
              Библия Финансов
            </motion.h1>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="text-white/70 text-base font-medium whitespace-nowrap"
            >
              Верный в малом — Верен и в большем!
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="text-white/50 text-sm font-medium mt-1"
            >
              Инструмент верного управителя!
            </motion.p>

            {/* Animated bar */}
            <motion.div
              className="mt-10 w-48 h-0.5 rounded-full bg-white/10 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 via-cyan-400 to-emerald-400"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ delay: 0.7, duration: 1.6, ease: 'easeInOut' }}
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}