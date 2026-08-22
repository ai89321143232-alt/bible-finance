import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, AlertCircle, RefreshCw, Target } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AIInsights({ transactions, accounts, budgets, investments, formatCurrency }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (transactions?.length > 0 || accounts?.length > 0) {
      loadInsights();
    }
  }, []);

  const getFromCache = () => {
    try {
      const cached = localStorage.getItem('ai_insights_cache');
      if (!cached) return null;
      const { data, date } = JSON.parse(cached);
      const today = new Date().toDateString();
      if (today === new Date(date).toDateString()) return data;
      return null;
    } catch { return null; }
  };

  const saveToCache = (data) => {
    try {
      localStorage.setItem('ai_insights_cache', JSON.stringify({ data, date: new Date().toISOString() }));
    } catch {}
  };

  const loadInsights = async () => {
    const cached = getFromCache();
    if (cached) { setInsights(cached); return; }
    await generateInsights();
  };

  const generateInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

      // Analyze budget deviations
      const budgetDeviations = budgets
        .filter(b => b.limit_amount > 0)
        .map(b => {
          const progress = (b.spent_amount / b.limit_amount) * 100;
          return { name: b.name, progress: Math.round(progress), spent: b.spent_amount, limit: b.limit_amount, isOver: progress > 100 };
        })
        .filter(b => b.progress >= 70);

      // Analyze expense categories
      const expensesByCategory = {};
      transactions.filter(t => t.type === 'expense').forEach(t => {
        expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
      });
      const topCategories = Object.entries(expensesByCategory).sort(([,a],[,b]) => b - a).slice(0, 3);

      const budgetAlerts = budgetDeviations.map(b =>
        `- Бюджет "${b.name}": потрачено ${b.progress}% (${formatCurrency(b.spent || 0)} из ${formatCurrency(b.limit || 0)})${b.isOver ? ' — ПРЕВЫШЕН!' : ''}`
      ).join('\n');

      const prompt = `Ты финансовый советник. Проанализируй данные и дай конкретные краткие советы на русском языке.

Финансовое состояние:
- Баланс: ${formatCurrency(totalBalance)}
- Доходы (этот период): ${formatCurrency(totalIncome)}
- Расходы (этот период): ${formatCurrency(totalExpenses)}
- Сохранение: ${totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0}% дохода

Топ категории расходов:
${topCategories.map(([cat, amt]) => `- ${cat}: ${formatCurrency(amt)}`).join('\n') || '- нет данных'}

Состояние бюджетов (отклонения):
${budgetAlerts || '- Все бюджеты в норме'}

Инвестиции: ${investments?.length || 0} позиций

Дай ответ строго в формате:
ПРОГНОЗ: [1-2 предложения о том, хватит ли денег до конца месяца]
РЕКОМЕНДАЦИЯ: [конкретный совет по самой большой проблеме]
ОТКЛОНЕНИЯ: [что делать с превышенными или рискованными бюджетами, если есть — иначе похвали за дисциплину]`;

      const result = await base44.integrations.Core.InvokeLLM({ prompt, add_context_from_internet: false });
      const parsed = parseInsights(result);
      setInsights(parsed);
      saveToCache(parsed);
    } catch (err) {
      setError('Не удалось загрузить инсайты');
    } finally {
      setLoading(false);
    }
  };

  const parseInsights = (text) => {
    const sections = { forecast: '', recommendation: '', deviations: '' };
    const lines = text.split('\n').filter(l => l.trim());
    let currentSection = null;
    lines.forEach(line => {
      if (line.includes('ПРОГНОЗ')) { currentSection = 'forecast'; sections.forecast = line.replace(/^ПРОГНОЗ:\s*/i, '').trim(); }
      else if (line.includes('РЕКОМЕНДАЦИЯ')) { currentSection = 'recommendation'; sections.recommendation = line.replace(/^РЕКОМЕНДАЦИЯ:\s*/i, '').trim(); }
      else if (line.includes('ОТКЛОНЕНИЯ')) { currentSection = 'deviations'; sections.deviations = line.replace(/^ОТКЛОНЕНИЯ:\s*/i, '').trim(); }
      else if (currentSection && line.trim()) {
        sections[currentSection] += (sections[currentSection] ? ' ' : '') + line.trim();
      }
    });
    return sections;
  };

  const insightBlocks = [
    insights?.forecast && { icon: <TrendingUp className="w-3.5 h-3.5" />, label: 'Прогноз', text: insights.forecast, color: 'text-cyan-400' },
    insights?.recommendation && { icon: <Sparkles className="w-3.5 h-3.5" />, label: 'Рекомендация', text: insights.recommendation, color: 'text-violet-400' },
    insights?.deviations && { icon: <AlertCircle className="w-3.5 h-3.5" />, label: 'Отклонения', text: insights.deviations, color: 'text-amber-400' },
  ].filter(Boolean);

  if (error) {
    return (
      <div className="glass-card rounded-xl p-4 text-muted-foreground text-sm text-center">{error}</div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-3">
      {insightBlocks.length > 0 && (
        <div className="glass-card rounded-xl divide-y divide-border/50">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-widest font-medium">
              <Sparkles className="w-3.5 h-3.5" /> AI Инсайты
            </div>
            <Button onClick={() => { localStorage.removeItem('ai_insights_cache'); generateInsights(); }} disabled={loading}
              variant="ghost" size="sm" className="text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 h-7 px-2 text-xs">
              <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Загрузка...' : 'Обновить'}
            </Button>
          </div>
          {insightBlocks.map((block, i) => (
            <div key={i} className="px-4 py-3.5">
              <div className={`flex items-center gap-1.5 text-xs mb-1.5 ${block.color}`}>
                {block.icon}
                <span className="uppercase tracking-wide font-medium">{block.label}</span>
              </div>
              <p className="text-foreground/80 text-sm leading-relaxed">{block.text}</p>
            </div>
          ))}
        </div>
      )}

      {!insights && !loading && (
        <div className="glass-card rounded-xl p-4 text-center">
          <Button onClick={() => generateInsights()} variant="ghost"
            className="text-muted-foreground hover:text-foreground hover:bg-muted/50 text-sm">
            <Sparkles className="w-4 h-4 mr-2" /> Получить AI-рекомендации
          </Button>
        </div>
      )}

      {loading && !insights && (
        <div className="glass-card rounded-xl p-4 text-center text-muted-foreground text-sm">
          <RefreshCw className="w-4 h-4 animate-spin inline mr-2" /> Анализирую данные...
        </div>
      )}
    </motion.div>
  );
}