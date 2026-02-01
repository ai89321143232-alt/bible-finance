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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardContent className="p-6 text-center text-red-600">
            {error}
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="space-y-4"
    >
      {/* Forecast Card */}
      {insights?.forecast && (
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Прогноз
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {insights.forecast}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recommendation Card */}
      {insights?.recommendation && (
        <Card className="border-0 shadow-sm bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-600" />
              Рекомендация
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {insights.recommendation}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Savings Card */}
      {insights?.savings && (
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-emerald-600" />
              Возможности сбережений
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {insights.savings}
            </p>
            <Button
              onClick={() => generateInsights()}
              disabled={loading}
              variant="ghost"
              size="sm"
              className="text-xs h-7"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Загрузка...' : 'Обновить'}
            </Button>
          </CardContent>
        </Card>
      )}

      {!insights && !loading && (
        <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardContent className="p-6 text-center">
            <Button
              onClick={() => generateInsights()}
              disabled={loading}
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {loading ? 'Генерация insights...' : 'Получить финансовые рекомендации'}
            </Button>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}