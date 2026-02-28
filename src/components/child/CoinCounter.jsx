import React from 'react';
import { motion } from 'framer-motion';

export default function CoinCounter({ coins, level }) {
  const coinsForNextLevel = level * 100;
  const coinsInCurrentLevel = coins % 100;
  const progress = Math.min((coinsInCurrentLevel / coinsForNextLevel) * 100, 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-yellow-400 to-amber-500 rounded-2xl p-4 shadow-lg shadow-yellow-400/30"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🪙</span>
          <div>
            <p className="text-yellow-900 text-xs font-semibold">Монетки</p>
            <p className="text-2xl font-bold text-white">{coins}</p>
          </div>
        </div>
        <div className="bg-white/30 rounded-xl px-3 py-2 text-center">
          <p className="text-yellow-900 text-xs font-semibold">Уровень</p>
          <p className="text-xl font-bold text-white">⭐ {level}</p>
        </div>
      </div>
      {/* Progress bar */}
      <div className="mt-2">
        <div className="flex justify-between text-xs text-yellow-900 mb-1">
          <span>До следующего уровня</span>
          <span>{coinsInCurrentLevel}/{coinsForNextLevel}</span>
        </div>
        <div className="w-full h-2.5 bg-white/30 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-white rounded-full"
          />
        </div>
      </div>
    </motion.div>
  );
}