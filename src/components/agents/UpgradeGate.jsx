import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ============================================================
// components/agents/UpgradeGate.jsx — ЗАГЛУШКА ДЛЯ ПЛАТНЫХ ФУНКЦИЙ
// ============================================================
// Показывается пользователям на бесплатном тарифе вместо AI-агентов.
// ============================================================
export default function UpgradeGate({ title }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-5">
        <Lock className="w-8 h-8 text-white/50" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
      <p className="text-white/50 text-sm max-w-md mb-6">
        AI-ассистенты доступны на тарифах <span className="text-white font-medium">Premium</span> и{' '}
        <span className="text-white font-medium">Family</span>. Оформите подписку, чтобы получить
        персональные финансовые советы и семейную координацию.
      </p>
      <Link to={createPageUrl('Subscription')}>
        <Button className="bg-white text-black hover:bg-white/90 rounded-xl gap-2">
          <Sparkles className="w-4 h-4" />
          Улучшить тариф
        </Button>
      </Link>
    </div>
  );
}