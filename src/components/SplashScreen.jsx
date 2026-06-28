import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SplashScreen({ onFinish }) {
  const [phase, setPhase] = useState('in'); // 'in' | 'hold' | 'out' | 'done'

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 600);
    const t2 = setTimeout(() => setPhase('out'), 2400);
    const t3 = setTimeout(() => { setPhase('done'); onFinish(); }, 3000);
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
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: 'backOut' }}
              className="mb-6"
            >
              <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center shadow-2xl shadow-white/10">
                <span className="text-black font-black text-4xl">F</span>
              </div>
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
              className="text-white/50 text-base font-medium"
            >
              Ваши финансы — это Ваши финансы!
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