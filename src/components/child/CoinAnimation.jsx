import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CoinAnimation({ coins, message, onComplete }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 400);
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  const coinCount = Math.min(coins, 8);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center"
        >
          {/* Coins flying up */}
          {Array.from({ length: coinCount }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                y: 0, x: (Math.random() - 0.5) * 100, opacity: 1, scale: 0.5
              }}
              animate={{ 
                y: -200 - Math.random() * 100, 
                x: (Math.random() - 0.5) * 200,
                opacity: 0,
                scale: 1.2
              }}
              transition={{ 
                duration: 1.2 + Math.random() * 0.5, 
                delay: i * 0.08,
                ease: 'easeOut'
              }}
              className="absolute text-3xl"
            >
              🪙
            </motion.div>
          ))}

          {/* Center notification */}
          <motion.div
            initial={{ scale: 0, y: 0 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', damping: 12 }}
            className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white rounded-3xl px-8 py-5 shadow-2xl text-center"
          >
            <div className="text-4xl mb-1">🪙</div>
            <div className="text-3xl font-black">+{coins}</div>
            <div className="text-sm font-semibold opacity-90 mt-1">{message}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}