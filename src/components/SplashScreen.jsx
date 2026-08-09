import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function RatInWheel() {
  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      <svg viewBox="0 0 200 200" className="w-full h-full">
        {/* Wheel */}
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          style={{ originX: '100px', originY: '100px' }}
        >
          <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="4" />
          <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeDasharray="8 12" />
          <line x1="100" y1="20" x2="100" y2="180" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
          <line x1="20" y1="100" x2="180" y2="100" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
          <line x1="43" y1="43" x2="157" y2="157" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
          <line x1="157" y1="43" x2="43" y2="157" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
          <circle cx="100" cy="100" r="6" fill="rgba(255,255,255,0.4)" />
        </motion.g>

        {/* Rat body (bouncing slightly to simulate running) */}
        <motion.g
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 0.25, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* Tail */}
          <motion.path
            d="M 70 120 Q 55 115 50 105 Q 48 100 52 98"
            fill="none"
            stroke="#c4b5a0"
            strokeWidth="3"
            strokeLinecap="round"
            animate={{ d: ["M 70 120 Q 55 115 50 105 Q 48 100 52 98", "M 70 120 Q 52 118 48 108 Q 46 103 50 100", "M 70 120 Q 55 115 50 105 Q 48 100 52 98"] }}
            transition={{ duration: 0.25, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Body */}
          <ellipse cx="100" cy="120" rx="32" ry="22" fill="#8b7355" />
          {/* Belly */}
          <ellipse cx="100" cy="128" rx="24" ry="14" fill="#c4a882" />
          {/* Head */}
          <ellipse cx="128" cy="112" rx="18" ry="15" fill="#9b8466" />
          {/* Ears */}
          <ellipse cx="122" cy="98" rx="7" ry="9" fill="#7a6b54" />
          <ellipse cx="136" cy="98" rx="7" ry="9" fill="#7a6b54" />
          <ellipse cx="122" cy="99" rx="3" ry="5" fill="#d4a0a0" />
          <ellipse cx="136" cy="99" rx="3" ry="5" fill="#d4a0a0" />
          {/* Eye */}
          <circle cx="134" cy="110" r="2.5" fill="#1a1a1a" />
          {/* Nose */}
          <circle cx="146" cy="114" r="2" fill="#e0a0a0" />
          {/* Whiskers */}
          <line x1="146" y1="116" x2="158" y2="114" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
          <line x1="146" y1="118" x2="158" y2="120" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />

          {/* Front legs (running animation) */}
          <motion.ellipse
            cx="108" cy="140" rx="4" ry="8"
            fill="#7a6b54"
            animate={{ cy: [140, 136, 140], cx: [108, 110, 108] }}
            transition={{ duration: 0.25, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.ellipse
            cx="118" cy="142" rx="4" ry="8"
            fill="#6b5d48"
            animate={{ cy: [142, 138, 142], cx: [118, 116, 118] }}
            transition={{ duration: 0.25, repeat: Infinity, ease: 'easeInOut', delay: 0.12 }}
          />
          {/* Back legs */}
          <motion.ellipse
            cx="82" cy="140" rx="4" ry="8"
            fill="#7a6b54"
            animate={{ cy: [140, 136, 140], cx: [82, 84, 82] }}
            transition={{ duration: 0.25, repeat: Infinity, ease: 'easeInOut', delay: 0.12 }}
          />
          <motion.ellipse
            cx="92" cy="142" rx="4" ry="8"
            fill="#6b5d48"
            animate={{ cy: [142, 138, 142], cx: [92, 90, 92] }}
            transition={{ duration: 0.25, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.g>
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
            {/* Logo — Rat running in a wheel */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: 'backOut' }}
              className="mb-6"
            >
              <RatInWheel />
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
              Верный в малом — Верен в Большом!
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