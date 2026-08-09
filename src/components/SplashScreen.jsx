import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function PageLines({ side }) {
  // side: 'right' | 'left'
  const left = side === 'left' ? 6 : 6;
  return (
    <div className="absolute inset-0 p-2 flex flex-col gap-1.5">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="h-0.5 rounded-full bg-stone-300"
          style={{ width: i % 2 ? '70%' : '90%', marginLeft: side === 'left' ? left : 0 }}
        />
      ))}
    </div>
  );
}

function AnimatedBook() {
  // Книга лежит горизонтально (вид сверху с наклоном), страницы перелистываются по очереди
  const pageCount = 5;
  const pages = Array.from({ length: pageCount });

  return (
    <div className="relative w-40 h-24" style={{ perspective: '1000px' }}>
      {/* Тень под книгой */}
      <div className="absolute -bottom-2 left-4 right-4 h-2 bg-black/40 blur-md rounded-full" />

      {/* Книга анфас (вид прямо) */}
      <div
        className="absolute inset-0"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Базовый разворот (открытая книга) */}
        <div className="absolute inset-0 flex rounded-md overflow-hidden shadow-2xl ring-1 ring-stone-300">
          {/* Левая страница */}
          <div className="relative flex-1 bg-gradient-to-br from-stone-50 to-stone-200 border-r border-stone-300">
            <PageLines side="left" />
          </div>
          {/* Правая страница */}
          <div className="relative flex-1 bg-gradient-to-bl from-stone-50 to-stone-200">
            <PageLines side="right" />
          </div>
        </div>

        {/* Корешок (центральная линия) */}
        <div className="absolute left-1/2 top-0 bottom-0 w-1 -translate-x-1/2 bg-gradient-to-r from-transparent via-stone-400 to-transparent" />

        {/* Перелистываемые страницы */}
        {pages.map((_, i) => {
          const start = 0.08 + i * 0.14;
          const end = start + 0.1;
          return (
            <motion.div
              key={i}
              className="absolute top-0 right-0 h-full bg-white rounded-r-md shadow-md ring-1 ring-stone-200"
              style={{
                width: '50%',
                transformOrigin: 'left center',
                transformStyle: 'preserve-3d',
                backfaceVisibility: 'hidden',
              }}
              initial={{ rotateY: 0 }}
              animate={{ rotateY: [0, 0, -180, -180, 0] }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: 'easeInOut',
                times: [0, start, end, 0.92, 1],
              }}
            >
              <PageLines side="right" />
              {/* Номер страницы */}
              <span className="absolute bottom-1 right-2 text-[8px] text-stone-400 font-serif">
                {i + 1}
              </span>
            </motion.div>
          );
        })}
      </div>
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