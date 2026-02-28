import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, AlertCircle, RefreshCw, AlertTriangle } from 'lucide-react';
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

  const getCacheKey = () => {
    // Cache key includes budget overages so it refreshes when budgets change
    const overBudgets = (budgets || []).filter(b => b.spent_amount > b.limit_amount).length;
    return `ai_insights_${new Date().toDateString()}_over${overBudgets}`;
  };

  const getFromCache = () => {
    try {
      const key = getCacheKey();
      const cached = localStorage.getItem(key);
      if (!cached) return null;
      return JSON.parse(cached);
    } catch {
      return null;
    }
  };

  const saveToCache = (data) => {
    try {
      // Clear old cache keys
      Object.keys(localStorage).filter(k => k.startsWith('ai_insights_')).forEach(k => localStorage.removeItem(k));
      localStorage.setItem(getCacheKey(), JSON.stringify(data));
    } catch {}
  };

  const loadInsights = async () => {
    const cached = getFromCache();
    if (cached) {
      setInsights(cached);
      return;
    }
    await generateInsights();
  };

  const generateInsights = async () => {
    setLoading(true);
    setError(null);

    try {
      const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
      const totalInvested = investments.reduce((sum, inv) => sum + (inv.quantity * inv.purchase_price), 0);

      const expensesByCategory = {};
      transactions.filter(t => t.type === 'expense').forEach(t => {
        expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
      });

      const topExpenseCategory = Object.entries(expensesByCategory).sort(([,a], [,b]) => b - a)[0];

      // Find overbudget budgets for targeted advice
      const overBudgets = (budgets || []).filter(b => b.spent_amount > b.limit_amount);
      const nearLimitBudgets = (budgets || []).filter(b => {
        const pct = b.limit_amount > 0 ? (b.spent_amount / b.limit_amount) * 100 : 0;
        return pct >= (b.notify_at_percent || 80) && pct < 100;
      });

      const budgetWarnings = overBudgets.map(b =>
        `ПРЕВЫШЕН бюджет "${b.name}": потрачено ${formatCurrency(b.spent_amount)} из лимита ${formatCurrency(b.limit_amount)}`
      ).join('\n');

      const budgetAlerts = nearLimitBudgets.map(b =>
        `Близко к лимиту "${b.name}": потрачено ${Math.round((b.spent_amount / b.limit_amount) * 100)}% из лимита ${formatCurrency(b.limit_amount)}`
      ).join('\n');

      const prompt = `Ты финансовый советник. Проанализируй данные и дай КОНКРЕТНЫЕ практичные советы на русском языке.

Финансовые данные:
- Общий баланс: ${formatCurrency(totalBalance)}
- Доходы за период: ${formatCurrency(totalIncome)}
- Расходы за период: ${formatCurrency(totalExpenses)}
- Сбережения: ${formatCurrency(totalIncome - totalExpenses)}
- Инвестиции: ${formatCurrency(totalInvested)}
${topExpenseCategory ? `- Топ категория расходов: ${topExpenseCategory[0]} (${formatCurrency(topExpenseCategory[1])})` : ''}
- Всего бюджетов: ${(budgets || []).length}
${budgetWarnings ? `\nПРЕВЫШЕНИЯ БЮДЖЕТОВ:\n${budgetWarnings}` : ''}
${budgetAlerts ? `\nПРЕДУПРЕЖДЕНИЯ ПО БЮДЖЕТАМ:\n${budgetAlerts}` : ''}

Дай ответ строго в формате:
ПРОГНОЗ: [1-2 предложения о финансовой ситуации и прогнозе на конец месяца]
РЕКОМЕНДАЦИЯ: [1-2 конкретных совета по улучшению финансов, учитывая превышения бюджетов если есть]
СБЕРЕЖЕНИЯ: [1-2 предложения где можно сэкономить или что оптимизировать]`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      const parsed = parseInsights(result);
      // Add budget alerts to parsed insights
      parsed.budgetAlerts = overBudgets.length > 0 ? overBudgets : null;
      setInsights(parsed);
      saveToCache(parsed);
    } catch (err) {
      setError('Не удалось загрузить AI советы');
    } finally {
      setLoading(false);
    }
  };

  const parseInsights = (text) => {
    const sections = { forecast: '', recommendation: '', savings: '' };
    let currentSection = null;
    text.split('\n').filter(l => l.trim()).forEach(line => {
      if (line.includes('ПРОГНОЗ')) currentSection = 'forecast';
      else if (line.includes('РЕКОМЕНДАЦИЯ')) currentSection = 'recommendation';
      else if (line.includes('СБЕРЕЖЕНИЯ')) currentSection = 'savings';
      else if (currentSection && line.trim()) {
        const clean = line.replace(/^[\d\.\-\*]+\s*/, '').trim();
        sections[currentSection] += (sections[currentSection] ? ' ' : '') + clean;
      }
    });
    return sections;
  };

  const overBudgets = (budgets || []).filter(b => b.limit_amount > 0 && b.spent_amount > b.limit_amount);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-3">
      
      {/* Budget Overrun Alerts */}
      {overBudgets.length > 0 && (
        <div className="rounded-xl border border-rose-500/25 bg-rose-500/8 divide-y divide-rose-500/15">
          <div className="px-4 py-2.5 flex items-center gap-2 text-rose-400 text-xs uppercase tracking-widest font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            Превышения бюджетов
          </div>
          {overBudgets.map(b => {
            const pct = Math.round((b.spent_amount / b.limit_amount) * 100);
            return (
              <div key={b.id} className="px-4 py-2.5 flex items-center justify-between">
                <span className="text-white/70 text-sm">{b.name}</span>
                <span className="text-rose-400 text-sm font-semibold">{pct}% от лимита</span>
              </div>
            );
          })}
        </div>
      )}

      {/* AI Insights block */}
      {insights && (
        <div className="rounded-xl border border-white/8 bg-[#141820] divide-y divide-white/5">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/50 text-xs uppercase tracking-widest font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              AI Советы
            </div>
            <Button onClick={() => generateInsights()} disabled={loading} variant="ghost" size="sm"
              className="text-white/30 hover:text-white/70 hover:bg-white/5 h-7 px-2 text-xs">
              <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Загрузка...' : 'Обновить'}
            </Button>
          </div>
          {[
            insights?.forecast && { icon: <TrendingUp className="w-3.5 h-3.5" />, label: 'Прогноз', text: insights.forecast },
            insights?.recommendation && { icon: <Sparkles className="w-3.5 h-3.5" />, label: 'Рекомендация', text: insights.recommendation },
            insights?.savings && { icon: <AlertCircle className="w-3.5 h-3.5" />, label: 'Оптимизация', text: insights.savings },
          ].filter(Boolean).map((block, i) => (
            <div key={i} className="px-4 py-3.5">
              <div className="flex items-center gap-1.5 text-white/40 text-xs mb-1.5">
                {block.icon}
                <span className="uppercase tracking-wide font-medium">{block.label}</span>
              </div>
              <p className="text-white/75 text-sm leading-relaxed">{block.text}</p>
            </div>
          ))}
        </div>
      )}

      {!insights && !loading && !error && (
        <div className="rounded-xl border border-white/8 bg-[#141820] p-4 text-center">
          <Button onClick={() => generateInsights()} variant="ghost" className="text-white/50 hover:text-white hover:bg-white/5 text-sm">
            <Sparkles className="w-4 h-4 mr-2" /> Получить AI-советы
          </Button>
        </div>
      )}

      {loading && (
        <div className="rounded-xl border border-white/8 bg-[#141820] p-4 text-center text-white/40 text-sm">
          <Sparkles className="w-4 h-4 inline mr-2 animate-pulse" /> Анализирую данные...
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-white/8 bg-[#141820] p-4 text-white/40 text-sm text-center">
          {error} <Button onClick={() => generateInsights()} variant="ghost" size="sm" className="ml-2 text-xs text-white/50 h-6">Повторить</Button>
        </div>
      )}
    </motion.div>
  );
}