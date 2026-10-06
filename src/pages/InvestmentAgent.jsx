import React from 'react';
import AgentChat from '@/components/agents/AgentChat';
import { ShieldAlert } from 'lucide-react';

const SUGGESTIONS = [
  'Какие инвестиционные стратегии подходят для долгосрочного роста?',
  'Смоделируй исходы для моего сценария «Подушка безопасности»',
  'Сравни консервативный и агрессивный портфель на 5 лет',
  'Как инфляция влияет на мои инвестиции?',
];

export default function InvestmentAgent() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-28 lg:pb-8">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-foreground">Инвестиционный стратег</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Объясняет стратегии и моделирует варианты исходов по вашему сценарию.
        </p>
      </div>

      <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
        <ShieldAlert className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Прогнозы носят иллюстративный характер и не являются финансовой рекомендацией.
          Реальные результаты могут отличаться.
        </p>
      </div>

      <AgentChat
        agentName="investment_strategist"
        accentColor="bg-emerald-600"
        suggestions={SUGGESTIONS}
      />
    </div>
  );
}