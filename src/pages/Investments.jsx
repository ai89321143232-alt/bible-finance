import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { InvestmentService } from '@/services';
import CreatorTag from '@/components/shared/CreatorTag';
import { motion } from 'framer-motion';
import { format, differenceInDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Plus, TrendingUp, TrendingDown, Edit2, Trash2, Check, 
  PieChart, BarChart2, Bitcoin, Building2, Landmark, Gem, Lock, Wallet
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const INVESTMENT_TYPES = [
  { value: 'stocks', label: 'Акции', icon: '📈', color: '#8B5CF6' },
  { value: 'crypto', label: 'Криптовалюта', icon: '₿', color: '#F59E0B' },
  { value: 'etf', label: 'ETF', icon: '📊', color: '#3B82F6' },
  { value: 'bonds', label: 'Облигации', icon: '📜', color: '#10B981' },
  { value: 'deposit', label: 'Вклад', icon: '🏦', color: '#6366F1' },
  { value: 'real_estate', label: 'Недвижимость', icon: '🏠', color: '#EC4899' },
  { value: 'precious_metals', label: 'Драг. металлы', icon: '🥇', color: '#EAB308' },
  { value: 'other', label: 'Другое', icon: '💼', color: '#64748B' },
];

const INITIAL_FORM = {
  name: '', type: 'stocks', ticker: '', quantity: '', purchase_price: '',
  current_price: '', broker: '', interest_rate: '', maturity_date: null,
  allows_top_up: false
};

export default function Investments() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editInvestment, setEditInvestment] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [topUpInvestment, setTopUpInvestment] = useState(null);
  const [topUpAmount, setTopUpAmount] = useState('');

  const [formData, setFormData] = useState({ ...INITIAL_FORM });

  const { data: investments = [], isLoading } = useQuery({
    queryKey: ['investments'],
    queryFn: () => InvestmentService.list()
  });

  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: family } = useQuery({
    queryKey: ['my-family', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return null;
      const families = await base44.entities.Family.list();
      return families.find(f =>
        f.owner_id === currentUser?.id ||
        f.members?.some(m => m.user_id === currentUser?.id)
      ) ?? null;
    },
    enabled: !!currentUser,
    staleTime: 60000
  });

  const createMutation = useMutation({
    mutationFn: (data) => InvestmentService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => InvestmentService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => InvestmentService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      setDeleteId(null);
    }
  });

  const topUpMutation = useMutation({
    mutationFn: ({ id, data }) => InvestmentService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      setTopUpInvestment(null);
      setTopUpAmount('');
    }
  });

  const resetForm = () => {
    setFormData({ ...INITIAL_FORM });
    setShowAddModal(false);
    setEditInvestment(null);
  };

  const handleEdit = (investment) => {
    setEditInvestment(investment);
    setFormData({
      name: investment.name,
      type: investment.type,
      ticker: investment.ticker || '',
      quantity: investment.quantity.toString(),
      purchase_price: investment.purchase_price.toString(),
      current_price: (investment.current_price || investment.purchase_price).toString(),
      broker: investment.broker || '',
      interest_rate: investment.interest_rate?.toString() || '',
      maturity_date: investment.maturity_date ? new Date(investment.maturity_date) : null,
      allows_top_up: investment.allows_top_up || false
    });
    setShowAddModal(true);
  };

  const handleSubmit = async () => {
    const payload = {
      ...formData,
      quantity: parseFloat(formData.quantity),
      purchase_price: parseFloat(formData.purchase_price),
      current_price: parseFloat(formData.current_price) || parseFloat(formData.purchase_price),
      interest_rate: formData.type === 'deposit' ? parseFloat(formData.interest_rate) || 0 : undefined,
      maturity_date: formData.type === 'deposit' && formData.maturity_date
        ? format(formData.maturity_date, 'yyyy-MM-dd') : null,
      allows_top_up: formData.type === 'deposit' ? formData.allows_top_up : false
    };
    if (editInvestment) {
      await updateMutation.mutateAsync({ id: editInvestment.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    resetForm();
  };

  const handleTopUp = async () => {
    if (!topUpInvestment || !topUpAmount) return;
    const amount = parseFloat(topUpAmount);
    if (amount <= 0) return;
    // Пополнение вклада: увеличиваем количество по текущей цене
    const currentPrice = topUpInvestment.current_price || topUpInvestment.purchase_price;
    const addedQty = amount / currentPrice;
    const newQuantity = topUpInvestment.quantity + addedQty;
    // Обновляем среднюю цену покупки
    const newPurchasePrice = (topUpInvestment.quantity * topUpInvestment.purchase_price + amount) / newQuantity;
    await topUpMutation.mutateAsync({
      id: topUpInvestment.id,
      data: {
        quantity: newQuantity,
        purchase_price: newPurchasePrice,
        current_price: currentPrice
      }
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU', { 
      style: 'currency', 
      currency: 'RUB',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const totalValue = investments.reduce((sum, inv) => 
    sum + (inv.quantity * (inv.current_price || inv.purchase_price)), 0
  );
  const totalCost = investments.reduce((sum, inv) => 
    sum + (inv.quantity * inv.purchase_price), 0
  );
  const totalProfit = totalValue - totalCost;
  const profitPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  const portfolioByType = investments.reduce((acc, inv) => {
    const type = inv.type;
    const value = inv.quantity * (inv.current_price || inv.purchase_price);
    const typeInfo = INVESTMENT_TYPES.find(t => t.value === type) || INVESTMENT_TYPES[7];
    if (!acc[type]) {
      acc[type] = { name: typeInfo.label, value: 0, color: typeInfo.color, icon: typeInfo.icon };
    }
    acc[type].value += value;
    return acc;
  }, {});

  const chartData = Object.values(portfolioByType);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-24 sm:pb-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6 relative z-10"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Инвестиции
          </h1>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/25 rounded-xl"
          >
            <Plus className="w-5 h-5 mr-2" />
            Добавить
          </Button>
        </motion.div>

        {/* Portfolio Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
            <CardContent className="p-6 relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-violet-500/20 to-transparent rounded-full blur-3xl pointer-events-none" />
              
              <div className="relative grid sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-slate-400 text-sm mb-1">Стоимость портфеля</p>
                  <p className="text-4xl font-bold text-white mb-4">{formatCurrency(totalValue)}</p>
                  
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-1 px-3 py-1.5 rounded-xl ${
                      totalProfit >= 0 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {totalProfit >= 0 
                        ? <TrendingUp className="w-4 h-4" />
                        : <TrendingDown className="w-4 h-4" />
                      }
                      <span className="font-semibold">
                        {totalProfit >= 0 ? '+' : ''}{formatCurrency(totalProfit)}
                      </span>
                      <span className="text-sm opacity-70">
                        ({profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                </div>

                {chartData.length > 0 && (
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => formatCurrency(value)}
                          contentStyle={{ 
                            backgroundColor: '#1e293b', 
                            border: 'none', 
                            borderRadius: '12px',
                            color: 'white'
                          }}
                        />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {chartData.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-4">
                  {chartData.map((item) => (
                    <div 
                      key={item.name}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5"
                    >
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-slate-300">{item.icon} {item.name}</span>
                      <span className="text-sm text-slate-500">
                        {((item.value / totalValue) * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Investments List */}
        {investments.length > 0 ? (
          <div className="space-y-4">
            {investments.map((investment, index) => {
              const typeInfo = INVESTMENT_TYPES.find(t => t.value === investment.type) || INVESTMENT_TYPES[7];
              const currentPrice = investment.current_price || investment.purchase_price;
              const value = investment.quantity * currentPrice;
              const cost = investment.quantity * investment.purchase_price;
              const profit = value - cost;
              const profitPct = cost > 0 ? (profit / cost) * 100 : 0;
              const isEditable = investment.created_by_id === currentUser?.id;
              const isDeposit = investment.type === 'deposit';
              const daysToMaturity = investment.maturity_date ? differenceInDays(new Date(investment.maturity_date), new Date()) : null;

              return (
                <motion.div
                  key={investment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className={`border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:shadow-md transition-all group ${isEditable ? 'cursor-pointer' : ''}`}
                    onClick={() => isEditable && handleEdit(investment)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div 
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm"
                            style={{ backgroundColor: `${typeInfo.color}20` }}
                          >
                            {typeInfo.icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-slate-900 dark:text-white">
                                {investment.name}
                              </h3>
                              {!isEditable && (
                                <Lock className="w-4 h-4 text-slate-400" />
                              )}
                              {investment.ticker && (
                                <span className="text-xs font-mono px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-500">
                                  {investment.ticker}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {investment.quantity.toFixed(isDeposit ? 2 : 0)} {isDeposit ? '₽' : 'шт.'} × {formatCurrency(currentPrice)}
                            </p>
                            <CreatorTag creatorId={investment.created_by_id} family={family} currentUser={currentUser} className="mt-0.5" />
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-semibold text-lg text-slate-900 dark:text-white">
                              {formatCurrency(value)}
                            </p>
                            <div className={`flex items-center justify-end gap-1 text-sm ${
                              profit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                              {profit >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
                              <span className="text-xs opacity-70">
                                ({profitPct >= 0 ? '+' : ''}{profitPct.toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                          {isEditable && (
                            <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(investment);
                                }}
                                className="h-8 w-8"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteId(investment.id);
                                }}
                                className="h-8 w-8 text-rose-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Deposit-specific info */}
                      {isDeposit && (investment.interest_rate || investment.maturity_date || investment.allows_top_up) && (
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center gap-2">
                          {investment.interest_rate != null && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                              <TrendingUp className="w-3 h-3" /> {investment.interest_rate}% годовых
                            </span>
                          )}
                          {investment.maturity_date && (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
                              daysToMaturity !== null && daysToMaturity <= 0
                                ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400'
                                : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                            }`}>
                              {daysToMaturity !== null && daysToMaturity <= 0
                                ? 'Срок истёк'
                                : `Срок: ${format(new Date(investment.maturity_date), 'dd.MM.yyyy')}`}
                            </span>
                          )}
                          {investment.allows_top_up && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 text-xs font-medium">
                              <Wallet className="w-3 h-3" /> Пополняемый
                            </span>
                          )}
                          {isEditable && investment.allows_top_up && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTopUpInvestment(investment);
                                setTopUpAmount('');
                              }}
                              className="ml-auto h-7 rounded-lg text-xs border-violet-200 text-violet-700 dark:text-violet-400"
                            >
                              <Plus className="w-3 h-3 mr-1" />Пополнить вклад
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Нет инвестиций
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              Добавьте первый актив в портфель
            </p>
            <Button
              onClick={() => setShowAddModal(true)}
              className="rounded-xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              Добавить актив
            </Button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={showAddModal} onOpenChange={() => resetForm()}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editInvestment ? 'Редактировать актив' : 'Новый актив'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
              <Label>Название</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Например: Apple Inc."
                className="rounded-xl mt-1"
              />
            </div>
            <div>
              <Label>Тип актива</Label>
              <Select 
                value={formData.type} 
                onValueChange={(v) => setFormData({ ...formData, type: v })}
              >
                <SelectTrigger className="rounded-xl mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVESTMENT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formData.type !== 'deposit' && (
              <div>
                <Label>Тикер (опционально)</Label>
                <Input
                  value={formData.ticker}
                  onChange={(e) => setFormData({ ...formData, ticker: e.target.value.toUpperCase() })}
                  placeholder="AAPL"
                  className="rounded-xl mt-1 font-mono"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{formData.type === 'deposit' ? 'Сумма вклада' : 'Количество'}</Label>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="0"
                    className="rounded-xl pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {formData.type === 'deposit' ? '₽' : 'шт.'}
                  </span>
                </div>
              </div>
              <div>
                <Label>{formData.type === 'deposit' ? 'Стартовая сумма' : 'Цена покупки'}</Label>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                    placeholder="0"
                    className="rounded-xl pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">₽</span>
                </div>
              </div>
            </div>

            {/* Deposit-specific fields */}
            {formData.type === 'deposit' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Процентная ставка (% годовых)</Label>
                    <div className="relative mt-1">
                      <Input
                        type="number"
                        value={formData.interest_rate}
                        onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
                        placeholder="8.5"
                        className="rounded-xl pr-8"
                        step="0.1"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                    </div>
                  </div>
                  <div>
                    <Label>Срок вывода</Label>
                    <Input
                      type="date"
                      value={formData.maturity_date ? format(formData.maturity_date, 'yyyy-MM-dd') : ''}
                      onChange={(e) => setFormData({ ...formData, maturity_date: e.target.value ? new Date(e.target.value) : null })}
                      className="rounded-xl mt-1"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <input
                    type="checkbox"
                    checked={formData.allows_top_up}
                    onChange={(e) => setFormData({ ...formData, allows_top_up: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Разрешить пополнение вклада</span>
                </label>
              </>
            )}

            <div>
              <Label>{formData.type === 'deposit' ? 'Текущая сумма (с процентами)' : 'Текущая цена'}</Label>
              <div className="relative mt-1">
                <Input
                  type="number"
                  value={formData.current_price}
                  onChange={(e) => setFormData({ ...formData, current_price: e.target.value })}
                  placeholder="0"
                  className="rounded-xl pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">₽</span>
              </div>
            </div>
            <div>
              <Label>{formData.type === 'deposit' ? 'Банк' : 'Брокер'} (опционально)</Label>
              <Input
                value={formData.broker}
                onChange={(e) => setFormData({ ...formData, broker: e.target.value })}
                placeholder={formData.type === 'deposit' ? 'Например: Сбер' : 'Например: Тинькофф'}
                className="rounded-xl mt-1"
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name || !formData.quantity || !formData.purchase_price || createMutation.isPending || updateMutation.isPending}
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600"
            >
              <Check className="w-4 h-4 mr-2" />
              {editInvestment ? 'Сохранить' : 'Добавить'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Top-up Deposit Modal */}
      <Dialog open={!!topUpInvestment} onOpenChange={() => { setTopUpInvestment(null); setTopUpAmount(''); }}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Пополнить вклад</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {topUpInvestment && (
              <p className="text-slate-500 text-sm">
                {topUpInvestment.name} · Текущая сумма: {formatCurrency(topUpInvestment.quantity * (topUpInvestment.current_price || topUpInvestment.purchase_price))}
              </p>
            )}
            <div>
              <Label>Сумма пополнения</Label>
              <div className="relative mt-1">
                <Input
                  type="number"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  placeholder="0"
                  className="rounded-xl pr-8 text-xl font-semibold h-14"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">₽</span>
              </div>
            </div>
            <Button
              onClick={handleTopUp}
              disabled={!topUpAmount || topUpMutation.isPending}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600"
            >
              <Wallet className="w-4 h-4 mr-2" />Пополнить
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить актив?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteId)}
              className="bg-rose-600 hover:bg-rose-700 rounded-xl"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}