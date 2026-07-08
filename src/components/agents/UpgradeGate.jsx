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
      <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center mb-5">
        <Lock className="w-8 h-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">{title}</h2>
      <p className="text-muted-foreground text-sm max-w-md mb-6">
        AI-ассистенты доступны на тарифах <span className="text-foreground font-medium">Premium</span> и{' '}
        <span className="text-foreground font-medium">Family</span>. Оформите подписку, чтобы получить
        персональные финансовые советы и семейную координацию.
      </p>
      <Link to={createPageUrl('Subscription')}>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl gap-2">
          <Sparkles className="w-4 h-4" />
          Улучшить тариф
        </Button>
      </Link>
    </div>
  );
}