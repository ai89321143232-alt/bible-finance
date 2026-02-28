import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AIInsights({ transactions, accounts, budgets, investments, formatCurrency }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadInsights();
  }, []);

  const getFromCache = () => {
    try {
      const cached = localStorage.getItem('ai_insights_cache');
      if (!cached) return null;
      
      const { data, date } = JSON.parse(cached);
      const today = new Date().toDateString();
      const cacheDate = new Date(date).toDateString();
      
      // Return cache only if it's from today
      if (today === cacheDate) {
        return data;
      }
      return null;
    } catch {
      return null;
    }
  };

  const saveToCache = (data) => {
    try {
      localStorage.setItem('ai_insights_cache', JSON.stringify({
        data,
        date: new Date().toISOString()
      }));
    } catch {
      console.error('Failed to cache insights');
    }
  };

  const loadInsights = async () => {
    const cached = getFromCache();
    if (cached) {
      setInsights(cached);
      setLastUpdated(new Date());
      return;
    }

    await generateInsights();
  };

  const generateInsights = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
      const totalInvested = investments.reduce((sum, inv) => 
        sum + (inv.quantity * inv.purchase_price), 0
      );

      // Group expenses by category
      const expensesByCategory = {};
      transactions
        .filter(t => t.type === 'expense')
        .forEach(t => {
          expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
        });

      const topExpenseCategory = Object.entries(expensesByCategory)
        .sort(([,a], [,b]) => b - a)[0];

      const prompt = `Проанализируй финансовые данные и дай короткие, практичные прогнозы и рекомендации:

Текущие данные:
- Общий баланс: ${formatCurrency(totalBalance)}
- Доходы: ${formatCurrency(totalIncome)}
- Расходы: ${formatCurrency(totalExpenses)}
- Сохранено в инвестициях: ${formatCurrency(totalInvested)}
${topExpenseCategory ? `- Самая большая категория расходов: ${topExpenseCategory[0]} (${formatCurrency(topExpenseCategory[1])})` : ''}
- Активные бюджеты: ${budgets.length}

На основе этих данных, дай:
1. ПРОГНОЗ: Предскажи, хватит ли денег до конца месяца при текущем темпе трат (1-2 предложения)
2. РЕКОМЕНДАЦИЯ: Один главный финансовый совет для улучшения (1-2 предложения)
3. СБЕРЕЖЕНИЯ: Где можно сэкономить (1-2 предложения)

Отвечай только русском языке, кратко и конкретно, без лишних деталей.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      const parsed = parseInsights(result);
      setInsights(parsed);
      saveToCache(parsed);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Не удалось загрузить insights');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const parseInsights = (text) => {
    const lines = text.split('\n').filter(l => l.trim());
    const sections = {
      forecast: '',
      recommendation: '',
      savings: ''
    };

    let currentSection = null;
    
    lines.forEach(line => {
      if (line.includes('ПРОГНОЗ')) currentSection = 'forecast';
      else if (line.includes('РЕКОМЕНДАЦИЯ')) currentSection = 'recommendation';
      else if (line.includes('СБЕРЕЖЕНИЯ')) currentSection = 'savings';
      else if (currentSection && line.trim()) {
        sections[currentSection] += (sections[currentSection] ? ' ' : '') + line.trim();
      }
    });

    return sections;
  };

  if (error) {
    return (
      <div className="rounded-xl border border-white/8 bg-[#141820] p-4 text-white/40 text-sm text-center">
        {error}
      </div>
    );
  }

  const insightBlocks = [
    insights?.forecast && { icon: <TrendingUp className="w-3.5 h-3.5" />, label: 'Прогноз', text: insights.forecast },
    insights?.recommendation && { icon: <Sparkles className="w-3.5 h-3.5" />, label: 'Рекомендация', text: insights.recommendation },
    insights?.savings && { icon: <AlertCircle className="w-3.5 h-3.5" />, label: 'Сбережения', text: insights.savings },
  ].filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="space-y-3"
    >
      {insightBlocks.length > 0 && (
        <div className="rounded-xl border border-white/8 bg-[#141820] divide-y divide-white/5">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/50 text-xs uppercase tracking-widest font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              AI Инсайты
            </div>
            <Button
              onClick={() => generateInsights()}
              disabled={loading}
              variant="ghost"
              size="sm"
              className="text-white/30 hover:text-white/70 hover:bg-white/5 h-7 px-2 text-xs"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Загрузка...' : 'Обновить'}
            </Button>
          </div>
          {insightBlocks.map((block, i) => (
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

      {!insights && !loading && (
        <div className="rounded-xl border border-white/8 bg-[#141820] p-4 text-center">
          <Button
            onClick={() => generateInsights()}
            disabled={loading}
            variant="ghost"
            className="text-white/50 hover:text-white hover:bg-white/5 text-sm"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {loading ? 'Генерация...' : 'Получить AI-рекомендации'}
          </Button>
        </div>
      )}
    </motion.div>
  );
}