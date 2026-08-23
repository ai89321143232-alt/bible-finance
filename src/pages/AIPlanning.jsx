import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, CalendarClock, Wallet, Repeat, Snowflake, Target,
  ShoppingCart, FileText, Scale, Layers, Sparkles, RefreshCw,
  X, Save, Loader2
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';

const TABS = [
  { id: 'cashflow', label: 'Кассовый разрыв', icon: CalendarClock, desc: 'Прогноз движения средств по дням', color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-500', text: 'text-blue-500' },
  { id: 'daily_limit', label: 'Дневной лимит', icon: Wallet, desc: 'Сколько можно потратить сегодня', color: 'from-violet-500 to-purple-500', bg: 'bg-violet-500', text: 'text-violet-500' },
  { id: 'subscriptions', label: 'Подписки и переплаты', icon: Repeat, desc: 'Дубликаты и забытые подписки', color: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-500', text: 'text-emerald-500' },
  { id: 'debt_strategy', label: 'Стратегия долгов', icon: Snowflake, desc: 'Снежный ком vs лавина', color: 'from-sky-500 to-indigo-500', bg: 'bg-sky-500', text: 'text-sky-500' },
  { id: 'goal_acceleration', label: 'Ускорение целей', icon: Target, desc: 'Прогноз достижения целей', color: 'from-rose-500 to-pink-500', bg: 'bg-rose-500', text: 'text-rose-500' },
  { id: 'pre_purchase', label: 'Проверка траты', icon: ShoppingCart, desc: 'Оценка крупной покупки', color: 'from-amber-500 to-orange-500', bg: 'bg-amber-500', text: 'text-amber-500' },
  { id: 'monthly_report', label: 'Месячный отчёт', icon: FileText, desc: 'Расширенный ИИ-отчёт', color: 'from-slate-500 to-gray-600', bg: 'bg-slate-500', text: 'text-slate-500' },
  { id: 'balance_allocation', label: 'Баланс долг/накоп', icon: Scale, desc: 'Распределение свободных средств', color: 'from-fuchsia-500 to-pink-500', bg: 'bg-fuchsia-500', text: 'text-fuchsia-500' },
  { id: 'spending_clusters', label: 'Карта трат', icon: Layers, desc: 'Сегментация расходов', color: 'from-teal-500 to-green-500', bg: 'bg-teal-500', text: 'text-teal-500' },
];

function SectionCard({ title, children }) {
  return (
    <div className="glass-card rounded-xl p-4">
      {title && <h4 className="text-sm font-semibold text-foreground mb-2">{title}</h4>}
      {children}
    </div>
  );
}

function ResultRenderer({ type, data }) {
  if (!data) return null;

  if (type === 'cashflow') {
    return (
      <div className="space-y-3">
        {data.summary && <p className="text-sm text-muted-foreground">{data.summary}</p>}
        {data.break_day && (
          <SectionCard title="⚠️ Возможный кассовый разрыв">
            <p className="text-sm text-destructive font-medium">{data.break_day}</p>
            <p className="text-xs text-muted-foreground mt-1">Минимальный баланс: {data.min_balance?.toLocaleString()} ₽</p>
          </SectionCard>
        )}
        {data.daily_table?.length > 0 && (
          <SectionCard title="Прогноз по дням">
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {data.daily_table.slice(0, 30).map((d, i) => (
                <div key={i} className="flex justify-between text-xs py-1 border-b border-border/30">
                  <span className="text-muted-foreground">{d.date?.slice(5)}</span>
                  <span className={d.balance < 0 ? 'text-destructive font-medium' : 'text-foreground'}>
                    {d.balance?.toLocaleString()} ₽
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>
        )}
        {data.suggestions?.length > 0 && (
          <SectionCard title="Что оптимизировать">
            {data.suggestions.map((s, i) => (
              <p key={i} className="text-sm py-1">• {s.action} — экономия {s.savings?.toLocaleString()} ₽</p>
            ))}
          </SectionCard>
        )}
      </div>
    );
  }

  if (type === 'daily_limit') {
    return (
      <div className="space-y-3">
        <div className="glass-card rounded-xl p-5 text-center bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Можно потратить сегодня</p>
          <p className="text-3xl font-bold text-primary">{data.daily_limit?.toLocaleString()} ₽</p>
          <p className="text-xs text-muted-foreground mt-2">Уже потрачено: {data.already_spent_today?.toLocaleString()} ₽</p>
          <p className="text-xs text-muted-foreground">Остаток: <span className="font-medium text-foreground">{data.remaining_today?.toLocaleString()} ₽</span></p>
        </div>
        {data.summary && <p className="text-sm text-muted-foreground">{data.summary}</p>}
        {data.tips?.length > 0 && (
          <SectionCard title="Советы">
            {data.tips.map((t, i) => <p key={i} className="text-sm py-1">• {t}</p>)}
          </SectionCard>
        )}
      </div>
    );
  }

  if (type === 'subscriptions') {
    return (
      <div className="space-y-3">
        {data.summary && <p className="text-sm text-muted-foreground">{data.summary}</p>}
        {data.total_monthly_savings > 0 && (
          <div className="glass-card rounded-xl p-4 text-center bg-gradient-to-br from-emerald-500/10 to-teal-500/10">
            <p className="text-xs text-muted-foreground">Потенциальная ежемесячная экономия</p>
            <p className="text-2xl font-bold text-emerald-500">{data.total_monthly_savings?.toLocaleString()} ₽</p>
          </div>
        )}
        {data.duplicates?.length > 0 && (
          <SectionCard title="Дубликаты подписок">
            {data.duplicates.map((d, i) => (
              <div key={i} className="py-1.5 border-b border-border/30 last:border-0">
                <p className="text-sm font-medium text-foreground">{d.name}</p>
                <p className="text-xs text-muted-foreground">{d.reason}</p>
                {d.monthly_savings > 0 && <p className="text-xs text-emerald-500">экономия {d.monthly_savings?.toLocaleString()} ₽/мес</p>}
              </div>
            ))}
          </SectionCard>
        )}
        {data.unused?.length > 0 && (
          <SectionCard title="Неиспользуемые">
            {data.unused.map((d, i) => (
              <div key={i} className="py-1.5 border-b border-border/30 last:border-0">
                <p className="text-sm font-medium text-foreground">{d.name}</p>
                <p className="text-xs text-muted-foreground">{d.reason}</p>
              </div>
            ))}
          </SectionCard>
        )}
        {data.optimize?.length > 0 && (
          <SectionCard title="Где оптимизировать">
            {data.optimize.map((d, i) => (
              <div key={i} className="py-1.5 border-b border-border/30 last:border-0">
                <p className="text-sm font-medium text-foreground">{d.name}</p>
                <p className="text-xs text-muted-foreground">{d.suggestion}</p>
              </div>
            ))}
          </SectionCard>
        )}
      </div>
    );
  }

  if (type === 'debt_strategy') {
    return (
      <div className="space-y-3">
        {data.summary && <p className="text-sm text-muted-foreground">{data.summary}</p>}
        <SectionCard title={`Рекомендованная: ${data.recommended === 'avalanche' ? 'Лавина' : 'Снежный ком'}`}>
          {data[data.recommended]?.order?.map((d, i) => (
            <div key={i} className="flex justify-between text-sm py-1.5 border-b border-border/30 last:border-0">
              <span className="text-foreground">{i + 1}. {d.name}</span>
              <span className="text-muted-foreground text-xs">{d.payoff_date}</span>
            </div>
          ))}
        </SectionCard>
        {data.savings_vs_minimal > 0 && (
          <p className="text-sm text-emerald-500">Экономия на процентах: {data.savings_vs_minimal?.toLocaleString()} ₽</p>
        )}
      </div>
    );
  }

  if (type === 'goal_acceleration') {
    return (
      <div className="space-y-3">
        {data.summary && <p className="text-sm text-muted-foreground">{data.summary}</p>}
        <div className="grid grid-cols-2 gap-2">
          <SectionCard title="При текущей скорости"><p className="text-sm font-medium">{data.current_pace_date}</p></SectionCard>
          <SectionCard title="С ускорением"><p className="text-sm font-medium text-emerald-500">{data.accelerated_date}</p></SectionCard>
        </div>
        <SectionCard title="Рекомендация">
          <p className="text-sm">Добавлять <span className="font-bold text-primary">{data.required_monthly?.toLocaleString()} ₽/мес</span> для дедлайна</p>
          <p className="text-sm mt-1">Рекомендованный взнос: <span className="font-medium">{data.recommended_contribution?.toLocaleString()} ₽/мес</span></p>
          {data.months_saved > 0 && <p className="text-sm text-emerald-500 mt-1">Экономия {data.months_saved} мес.</p>}
        </SectionCard>
      </div>
    );
  }

  if (type === 'pre_purchase') {
    const verdictColor = data.verdict === 'approve' ? 'text-emerald-500' : data.verdict === 'postpone' ? 'text-amber-500' : 'text-destructive';
    const verdictLabel = data.verdict === 'approve' ? 'Одобрить' : data.verdict === 'postpone' ? 'Отложить' : 'Отказать';
    return (
      <div className="space-y-3">
        <div className="glass-card rounded-xl p-5 text-center">
          <p className={`text-2xl font-bold ${verdictColor}`}>{verdictLabel}</p>
          <p className="text-xs text-muted-foreground mt-1">В бюджет: {data.fits_budget ? 'Да' : 'Нет'}</p>
        </div>
        {data.budget_impact && <SectionCard title="Влияние на бюджет"><p className="text-sm">{data.budget_impact}</p></SectionCard>}
        {data.goal_impact && <SectionCard title="Влияние на цели"><p className="text-sm">{data.goal_impact}</p></SectionCard>}
        {data.similar_recent && <SectionCard title="Похожие траты"><p className="text-sm">{data.similar_recent}</p></SectionCard>}
        {data.recommendation && <SectionCard title="Рекомендация"><p className="text-sm">{data.recommendation}</p></SectionCard>}
      </div>
    );
  }

  if (type === 'monthly_report') {
    const s = data.summary || {};
    return (
      <div className="space-y-3">
        <SectionCard title="Сводка">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div><p className="text-xs text-muted-foreground">Доход</p><p className="text-sm font-medium text-emerald-500">{s.income?.toLocaleString()}</p></div>
            <div><p className="text-xs text-muted-foreground">Расход</p><p className="text-sm font-medium text-destructive">{s.expenses?.toLocaleString()}</p></div>
            <div><p className="text-xs text-muted-foreground">Остаток</p><p className="text-sm font-medium">{s.balance?.toLocaleString()}</p></div>
          </div>
        </SectionCard>
        {data.top_growth?.length > 0 && (
          <SectionCard title="Рост категорий">
            {data.top_growth.map((c, i) => <p key={i} className="text-sm py-0.5">{c.category}: {c.amount?.toLocaleString()} ₽ (+{c.change_percent}%)</p>)}
          </SectionCard>
        )}
        {data.top_decline?.length > 0 && (
          <SectionCard title="Снижение категорий">
            {data.top_decline.map((c, i) => <p key={i} className="text-sm py-0.5">{c.category}: {c.amount?.toLocaleString()} ₽ ({c.change_percent}%)</p>)}
          </SectionCard>
        )}
        {data.recommendations?.length > 0 && (
          <SectionCard title="Рекомендации">{data.recommendations.map((r, i) => <p key={i} className="text-sm py-0.5">• {r}</p>)}</SectionCard>
        )}
        {data.next_month_forecast && <SectionCard title="Прогноз на следующий месяц"><p className="text-sm">{data.next_month_forecast}</p></SectionCard>}
        {data.records?.length > 0 && <SectionCard title="Рекорды">{data.records.map((r, i) => <p key={i} className="text-sm py-0.5">🏆 {r}</p>)}</SectionCard>}
        {data.bible_wisdom && (
          <div className="glass-card rounded-xl p-4 bg-gradient-to-br from-amber-500/10 to-yellow-500/10">
            <p className="text-sm italic text-amber-600 dark:text-amber-400">📖 {data.bible_wisdom}</p>
          </div>
        )}
      </div>
    );
  }

  if (type === 'balance_allocation') {
    return (
      <div className="space-y-3">
        {data.summary && <p className="text-sm text-muted-foreground">{data.summary}</p>}
        <SectionCard title={`Приоритет: ${data.priority === 'debt_first' ? 'Сначала долги' : data.priority === 'savings_first' ? 'Сначала накопления' : 'Баланс'}`}>
          <p className="text-sm">{data.rationale}</p>
        </SectionCard>
        {data.debt_allocation?.length > 0 && (
          <SectionCard title="На долги">
            {data.debt_allocation.map((d, i) => (
              <div key={i} className="flex justify-between text-sm py-1 border-b border-border/30 last:border-0">
                <span className="text-foreground">{d.name}</span>
                <span className="font-medium text-destructive">{d.amount?.toLocaleString()} ₽</span>
              </div>
            ))}
          </SectionCard>
        )}
        {data.savings_allocation?.length > 0 && (
          <SectionCard title="На накопления">
            {data.savings_allocation.map((d, i) => (
              <div key={i} className="flex justify-between text-sm py-1 border-b border-border/30 last:border-0">
                <span className="text-foreground">{d.name}</span>
                <span className="font-medium text-emerald-500">{d.amount?.toLocaleString()} ₽</span>
              </div>
            ))}
          </SectionCard>
        )}
      </div>
    );
  }

  if (type === 'spending_clusters') {
    return (
      <div className="space-y-3">
        {data.summary && <p className="text-sm text-muted-foreground">{data.summary}</p>}
        {data.clusters?.map((c, i) => (
          <SectionCard key={i} title={c.name}>
            <p className="text-xs text-muted-foreground mb-1">Доля: {c.share_percent}%</p>
            {c.top_categories?.length > 0 && <p className="text-xs text-muted-foreground">Категории: {c.top_categories.join(', ')}</p>}
            <p className="text-sm mt-1">💡 {c.advice}</p>
          </SectionCard>
        ))}
      </div>
    );
  }

  return <pre className="text-xs text-muted-foreground overflow-auto">{JSON.stringify(data, null, 2)}</pre>;
}

export default function AIPlanning() {
  const [activeTab, setActiveTab] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [prePurchase, setPrePurchase] = useState({ amount: '', category: '', description: '' });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const analyze = async (type, payload) => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await base44.functions.invoke('aiFinancialPlanner', { analysisType: type, payload: payload || {} });
      setData(res.data || res);
    } catch (err) {
      setError(err.message || 'Ошибка анализа');
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openTool = (tab) => {
    setActiveTab(tab.id);
    setData(null);
    setError(null);
    setModalOpen(true);
    if (tab.id !== 'pre_purchase') {
      analyze(tab.id);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const handlePrePurchase = (e) => {
    e.preventDefault();
    if (!prePurchase.amount) return;
    analyze('pre_purchase', { amount: Number(prePurchase.amount), category: prePurchase.category || 'Другое', description: prePurchase.description });
  };

  const buildNoteText = () => {
    if (!data) return '';
    const tab = TABS.find(t => t.id === activeTab);
    const date = new Date().toLocaleDateString('ru-RU');
    let text = `📊 ${tab?.label || 'Анализ'} — ${date}\n\n`;
    if (data.summary) text += `${data.summary}\n\n`;
    text += JSON.stringify(data, null, 2);
    return text;
  };

  const handleSaveNote = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const tab = TABS.find(t => t.id === activeTab);
      await base44.entities.Note.create({
        title: `${tab?.label || 'ИИ-анализ'} — ${new Date().toLocaleDateString('ru-RU')}`,
        content: buildNoteText(),
        category: 'financial',
        source: 'ai_planner'
      });
      toast({ title: 'Сохранено', description: 'Анализ сохранён в заметках' });
    } catch (err) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const activeTabObj = TABS.find(t => t.id === activeTab);

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">ИИ Планировщик финансов</h1>
          <p className="text-xs text-muted-foreground">9 умных инструментов для аналитики и планирования</p>
        </div>
      </div>

      {/* Tool cards grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {TABS.map((tab, idx) => {
          const Icon = tab.icon;
          return (
            <motion.button
              key={tab.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              onClick={() => openTool(tab)}
              className="glass-card rounded-2xl p-3.5 text-left transition-all hover:scale-[1.02] active:scale-[0.97] min-h-[110px] flex flex-col gap-2"
            >
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${tab.color} flex items-center justify-center shadow-sm`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground leading-tight">{tab.label}</p>
                <p className="text-[10px] leading-snug mt-0.5 text-muted-foreground line-clamp-2">{tab.desc}</p>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Analysis Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md max-h-[88vh] overflow-y-auto p-0 gap-0">
          {activeTabObj && (
            <>
              <DialogHeader className="p-4 pb-3 sticky top-0 bg-background/95 backdrop-blur z-10 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${activeTabObj.color} flex items-center justify-center shrink-0`}>
                    <activeTabObj.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <DialogTitle className="text-base">{activeTabObj.label}</DialogTitle>
                    <DialogDescription className="text-xs">{activeTabObj.desc}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="p-4 space-y-3">
                {/* Pre-purchase form */}
                {activeTab === 'pre_purchase' && (
                  <form onSubmit={handlePrePurchase} className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="number" placeholder="Сумма ₽" value={prePurchase.amount} onChange={e => setPrePurchase(p => ({ ...p, amount: e.target.value }))} required />
                      <Input placeholder="Категория" value={prePurchase.category} onChange={e => setPrePurchase(p => ({ ...p, category: e.target.value }))} />
                    </div>
                    <Input placeholder="Описание покупки" value={prePurchase.description} onChange={e => setPrePurchase(p => ({ ...p, description: e.target.value }))} />
                    <Button type="submit" disabled={loading || !prePurchase.amount} className="w-full">
                      {loading ? 'Анализирую...' : 'Проверить трату'}
                    </Button>
                  </form>
                )}

                {/* Loading */}
                {loading && (
                  <div className="py-10 text-center">
                    <Loader2 className="w-7 h-7 mx-auto text-primary animate-spin mb-2" />
                    <p className="text-sm text-muted-foreground">Анализирую ваши данные...</p>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="glass-card rounded-xl p-4 text-center text-destructive text-sm">{error}</div>
                )}

                {/* Result */}
                <AnimatePresence mode="wait">
                  {data && !loading && (
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ResultRenderer type={activeTab} data={data} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <DialogFooter className="p-3 sticky bottom-0 bg-background/95 backdrop-blur border-t border-border gap-2 flex-row">
                {activeTab !== 'pre_purchase' && (
                  <Button variant="outline" size="sm" onClick={() => analyze(activeTab)} disabled={loading} className="flex-1">
                    <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                    Обновить
                  </Button>
                )}
                <Button size="sm" onClick={handleSaveNote} disabled={!data || saving || loading} className="flex-1">
                  {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                  В заметки
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}