import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getSubscriptionStatus } from '@/components/SubscriptionManager';
import AgentChat from '@/components/agents/AgentChat';
import UpgradeGate from '@/components/agents/UpgradeGate';
import { Wallet, Users } from 'lucide-react';

// ============================================================
// pages/AIAdvisors.jsx — AI-АССИСТЕНТЫ
// ============================================================
// Два агента: «Аналитик бюджета» и «Семейный координатор».
// Доступ только для тарифов premium и family (или активного пробного периода).
// ============================================================
const ADVISORS = [
  {
    id: 'budget_analyst',
    agentName: 'budget_analyst',
    label: 'Аналитик бюджета',
    icon: Wallet,
    accent: 'bg-violet-600',
    suggestions: [
      'Проанализируй мои траты за этот месяц',
      'В каких категориях я превышаю бюджет?',
      'Как мне сэкономить в этом месяце?'
    ]
  },
  {
    id: 'family_coordinator',
    agentName: 'family_coordinator',
    label: 'Семейный координатор',
    icon: Users,
    accent: 'bg-emerald-600',
    suggestions: [
      'Какой прогресс по нашим общим целям?',
      'Кто сколько внёс в семейную цель?',
      'Сколько осталось накопить до цели?'
    ]
  }
];

export default function AIAdvisors() {
  const { user } = useAuth();
  const [active, setActive] = useState('budget_analyst');

  const status = getSubscriptionStatus(user);
  const hasAccess = status.plan === 'premium' || status.plan === 'family';

  if (!hasAccess) {
    return <UpgradeGate title="AI-ассистенты" />;
  }

  const advisor = ADVISORS.find((a) => a.id === active);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-24 lg:pb-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-white">AI-ассистенты</h1>
        <p className="text-white/40 text-sm mt-1">
          Персональные финансовые советы и семейная координация
        </p>
      </div>

      {/* Advisor switcher */}
      <div className="flex gap-2 mb-5">
        {ADVISORS.map((a) => {
          const Icon = a.icon;
          const isActive = a.id === active;
          return (
            <button
              key={a.id}
              onClick={() => setActive(a.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors border ${
                isActive
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'bg-white/[0.03] border-white/8 text-white/50 hover:text-white/80'
              }`}
            >
              <Icon className="w-4 h-4" />
              {a.label}
            </button>
          );
        })}
      </div>

      <AgentChat
        key={advisor.id}
        agentName={advisor.agentName}
        accentColor={advisor.accent}
        suggestions={advisor.suggestions}
      />
    </div>
  );
}