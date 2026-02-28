import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

export default function ThemeSelector({ onComplete }) {
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    await base44.auth.updateMe({ theme_preference: selected });
    onComplete(selected);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-violet-100 via-pink-50 to-yellow-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg w-full mx-4 text-center"
      >
        <div className="text-5xl mb-4">👋</div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Добро пожаловать!</h1>
        <p className="text-slate-500 mb-10 text-lg">Выбери, как ты хочешь видеть приложение</p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          {/* Adult */}
          <motion.div
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setSelected('adult')}
            className={`cursor-pointer rounded-3xl p-6 border-4 transition-all ${
              selected === 'adult'
                ? 'border-violet-500 bg-violet-50 shadow-xl'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className="text-5xl mb-3">💼</div>
            <h2 className="text-xl font-bold text-slate-800 mb-1">Взрослый</h2>
            <p className="text-sm text-slate-500">Серьёзный финансовый трекер</p>
            {selected === 'adult' && (
              <div className="mt-3 text-violet-600 font-semibold text-sm">✓ Выбрано</div>
            )}
          </motion.div>

          {/* Child */}
          <motion.div
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setSelected('child')}
            className={`cursor-pointer rounded-3xl p-6 border-4 transition-all ${
              selected === 'child'
                ? 'border-yellow-400 bg-yellow-50 shadow-xl'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className="text-5xl mb-3">🎮</div>
            <h2 className="text-xl font-bold text-slate-800 mb-1">Ребёнок</h2>
            <p className="text-sm text-slate-500">Игровой режим с монетками!</p>
            {selected === 'child' && (
              <div className="mt-3 text-yellow-600 font-semibold text-sm">✓ Выбрано</div>
            )}
          </motion.div>
        </div>

        <Button
          onClick={handleSave}
          disabled={!selected || saving}
          className="w-full h-14 rounded-2xl text-lg font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg"
        >
          {saving ? 'Сохраняем...' : 'Начать! 🚀'}
        </Button>
      </motion.div>
    </div>
  );
}