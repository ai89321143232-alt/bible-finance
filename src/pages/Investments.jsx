import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { InvestmentService, InvestmentCashFlowService } from '@/services';
import CreatorTag from '@/components/shared/CreatorTag';
import InvestmentPayoutDialog from '@/components/investments/InvestmentPayoutDialog';
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
import { getInvestmentValue, getInvestmentCost } from '@/lib/investmentValue';
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
import { INVESTMENT_CATEGORY } from '@/lib/investmentConstants';
import FamilyVisibilityToggle from '@/components/shared/FamilyVisibilityToggle';
import { useScopeMode } from '@/hooks/useScopeMode';

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
  allows_top_up: false, coupon_per_unit: '', dividend_yield: '', payout_frequency: '',
  next_payout_date: '', nominal_value: '', linked_goal_ids: [],
  account_id: '', deduct_from_account: false
};

export default function Investments() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editInvestment, setEditInvestment] = useState(null);
  const [deleteInvestment, setDeleteInvestment] = useState(null);
  const [deleteMode, setDeleteMode] = useState('delete');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferAccountId, setTransferAccountId] = useState('');
  const [topUpInvestment, setTopUpInvestment] = useState(null);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const [payoutInvestment, setPayoutInvestment] = useState(null);
  const [payoutForm, setPayoutForm] = useState({ type: 'dividend', amount: '', date: new Date().toISOString().slice(0, 10), destination: 'income', linked_goal_id: '', account_id: '' });

  const [formData, setFormData] = useState({ ...INITIAL_FORM });
  const { scopeMode } = useScopeMode();

  const { data: investments = [], isLoading } = useQuery({
    queryKey: ['investments'],
    queryFn: () => InvestmentService.list()
  });

  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'], queryFn: () => base44.entities.Account.list(), enabled: !!currentUser
  });
  const { data: goals = [] } = useQuery({
    queryKey: ['investment-goals'], queryFn: () => base44.entities.Goal.list(), enabled: !!currentUser
  });
  const { data: cashFlows = [] } = useQuery({
    queryKey: ['investment-cash-flows'], queryFn: () => InvestmentCashFlowService.list(), enabled: !!currentUser
  });

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
    mutationFn: (data) => {
      const { account_id, deduct_from_account, ...investmentData } = data;
      return InvestmentService.createWithTransaction(investmentData, {
        account_id,
        create_transaction: deduct_from_account && !!account_id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
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
    mutationFn: ({ id, transfer }) => transfer
      ? InvestmentService.removeWithTransfer(id, transfer)
      : InvestmentService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      closeDeleteDialog();
    }
  });

  const payoutMutation = useMutation({
    mutationFn: (data) => InvestmentCashFlowService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investment-cash-flows'] });
      queryClient.invalidateQueries({ queryKey: ['investment-goals'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setPayoutInvestment(null);
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
      allows_top_up: investment.allows_top_up || false,
      coupon_per_unit: investment.coupon_per_unit?.toString() || '', dividend_yield: investment.dividend_yield?.toString() || '',
      payout_frequency: investment.payout_frequency || '', next_payout_date: investment.next_payout_date || '',
      nominal_value: investment.nominal_value?.toString() || '', linked_goal_ids: investment.linked_goal_ids || []
    });
    setShowAddModal(true);
  };

  const handleSubmit = async () => {
    const payload = {
      name: formData.name,
      type: formData.type,
      ticker: formData.ticker || undefined,
      quantity: parseFloat(formData.quantity),
      purchase_price: parseFloat(formData.purchase_price),
      current_price: parseFloat(formData.current_price) || parseFloat(formData.purchase_price),
      broker: formData.broker || undefined,
      interest_rate: formData.type === 'deposit' ? parseFloat(formData.interest_rate) || 0 : undefined,
      maturity_date: formData.type === 'deposit' && formData.maturity_date
        ? format(formData.maturity_date, 'yyyy-MM-dd') : null,
      allows_top_up: formData.type === 'deposit' ? formData.allows_top_up : false,
      coupon_per_unit: parseFloat(formData.coupon_per_unit) || undefined,
      dividend_yield: parseFloat(formData.dividend_yield) || undefined,
      payout_frequency: formData.payout_frequency || undefined, next_payout_date: formData.next_payout_date || undefined,
      nominal_value: parseFloat(formData.nominal_value) || undefined, linked_goal_ids: formData.linked_goal_ids,
      account_id: formData.account_id || undefined,
      deduct_from_account: formData.deduct_from_account,
      scope: editInvestment?.scope || (scopeMode === 'all' ? 'personal' : scopeMode)
    };
    if (editInvestment) {
      await updateMutation.mutateAsync({ id: editInvestment.id, data: {
        name: payload.name, type: payload.type, ticker: payload.ticker,
        quantity: payload.quantity, purchase_price: payload.purchase_price,
        current_price: payload.current_price, broker: payload.broker,
        interest_rate: payload.interest_rate, maturity_date: payload.maturity_date,
        allows_top_up: payload.allows_top_up, coupon_per_unit: payload.coupon_per_unit,
        dividend_yield: payload.dividend_yield, payout_frequency: payload.payout_frequency,
        next_payout_date: payload.next_payout_date, nominal_value: payload.nominal_value,
        linked_goal_ids: payload.linked_goal_ids
      }});
    } else {
      await createMutation.mutateAsync(payload);
    }
    resetForm();
  };

  const openDeleteDialog = (investment) => {
    setDeleteInvestment(investment);
    setDeleteMode('delete');
    setTransferAmount(getInvestmentValue(investment).toString());
    setTransferAccountId('');
  };

  const closeDeleteDialog = () => {
    setDeleteInvestment(null);
    setDeleteMode('delete');
    setTransferAmount('');
    setTransferAccountId('');
  };

  const handleDelete = () => {
    if (!deleteInvestment) return;
    const transfer = deleteMode === 'transfer'
      ? { account_id: transferAccountId, amount: parseFloat(transferAmount) }
      : null;
    deleteMutation.mutate({ id: deleteInvestment.id, transfer });
  };

  const handlePayoutSave = () => {
    payoutMutation.mutate({ ...payoutForm, investment_id: payoutInvestment.id, investment_name: payoutInvestment.name,
      amount: parseFloat(payoutForm.amount), date: new Date(`${payoutForm.date}T12:00:00`).toISOString(),
      reinvested: payoutForm.destination === 'reinvest', currency: payoutInvestment.currency || 'RUB',
      linked_goal_id: payoutForm.destination === 'goal' ? payoutForm.linked_goal_id : undefined,
      account_id: payoutForm.destination === 'goal' ? payoutForm.account_id : undefined,
      scope: payoutInvestment.scope || 'personal' });
  };

  const handleTopUp = async () => {
    if (!topUpInvestment || !topUpAmount) return;
    const amount = parseFloat(topUpAmount);
    if (amount <= 0) return;
    const isDeposit = topUpInvestment.type === 'deposit';
    const currentPrice = topUpInvestment.current_price || topUpInvestment.purchase_price;
    if (isDeposit) {
      // Для вкладов: current_price = текущая сумма, purchase_price = стартовая сумма
      const newCurrent = (topUpInvestment.current_price || topUpInvestment.purchase_price) + amount;
      const newPurchase = topUpInvestment.purchase_price + amount;
      await topUpMutation.mutateAsync({
        id: topUpInvestment.id,
        data: {
          quantity: newPurchase,
          purchase_price: newPurchase,
          current_price: newCurrent
        }
      });
    } else {
      // Для обычных активов: пересчёт количества и средней цены
      const addedQty = amount / currentPrice;
      const newQuantity = topUpInvestment.quantity + addedQty;
      const newPurchasePrice = (topUpInvestment.quantity * topUpInvestment.purchase_price + amount) / newQuantity;
      await topUpMutation.mutateAsync({
        id: topUpInvestment.id,
        data: {
          quantity: newQuantity,
          purchase_price: newPurchasePrice,
          current_price: currentPrice
        }
      });
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU', { 
      style: 'currency', 
      currency: 'RUB',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const scopedInvestments = scopeMode === 'all' ? investments : investments.filter((inv) => (inv.scope || 'personal') === scopeMode);
  const transferAccounts = scopeMode === 'all'
    ? accounts
    : accounts.filter((account) => (account.scope || 'personal') === scopeMode);
  const displayedInvestments = (showOnlyMine && currentUser)
    ? scopedInvestments.filter(inv => inv.created_by_id === currentUser.id || inv.user_id === currentUser.id)
    : scopedInvestments;

  const totalValue = displayedInvestments.reduce((sum, inv) => 
    sum + getInvestmentValue(inv), 0
  );
  const totalCost = displayedInvestments.reduce((sum, inv) => 
    sum + getInvestmentCost(inv), 0
  );
  const totalProfit = totalValue - totalCost;
  const profitPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  const portfolioByType = displayedInvestments.reduce((acc, inv) => {
    const type = inv.type;
    const value = getInvestmentValue(inv);
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
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Инвестиции
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{displayedInvestments.length} {displayedInvestments.length === 1 ? 'актив' : 'активов'}</p>
          </div>
          <div className="flex items-center gap-2">
            {family && (
              <FamilyVisibilityToggle showOnlyMine={showOnlyMine} onToggle={() => setShowOnlyMine(v => !v)} />
            )}
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/25 rounded-xl"
            >
              <Plus className="w-5 h-5 mr-2" />
              Добавить
            </Button>
          </div>
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
        {displayedInvestments.length > 0 ? (
          <div className="space-y-4">
            {displayedInvestments.map((investment, index) => {
              const typeInfo = INVESTMENT_TYPES.find(t => t.value === investment.type) || INVESTMENT_TYPES[7];
              const isDepositItem = investment.type === 'deposit';
              const currentPrice = investment.current_price || investment.purchase_price;
              const value = getInvestmentValue(investment);
              const cost = getInvestmentCost(investment);
              const profit = value - cost;
              const profitPct = cost > 0 ? (profit / cost) * 100 : 0;
              const isEditable = investment.created_by_id === currentUser?.id || investment.user_id === currentUser?.id;
              const isDeposit = investment.type === 'deposit';
              const daysToMaturity = investment.maturity_date ? differenceInDays(new Date(investment.maturity_date), new Date()) : null;
              const payoutsPerYear = { monthly: 12, quarterly: 4, semiannual: 2, annual: 1 }[investment.payout_frequency] || 1;
              const forecastPayout = investment.coupon_per_unit
                ? investment.coupon_per_unit * (investment.type === 'deposit' ? 1 : investment.quantity || 0)
                : investment.dividend_yield ? (value * investment.dividend_yield / 100 / payoutsPerYear) : 0;

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
                              {isDepositItem
                                ? `Вклад: ${formatCurrency(investment.purchase_price)}`
                                : `${investment.quantity.toFixed(0)} шт. × ${formatCurrency(currentPrice)}`
                              }
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
                                  openDeleteDialog(investment);
                                }}
                                className="h-8 w-8 text-rose-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      {(investment.coupon_per_unit || investment.dividend_yield || investment.next_payout_date) && (
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center gap-2 text-xs">
                          {investment.coupon_per_unit != null && <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">Выплата: {formatCurrency(investment.coupon_per_unit)} / ед.</span>}
                          {investment.dividend_yield != null && <span className="px-2.5 py-1 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400">Доходность: {investment.dividend_yield}% годовых</span>}
                          {investment.next_payout_date && <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">Следующая: {format(new Date(investment.next_payout_date), 'dd.MM.yyyy')}{forecastPayout > 0 ? ` · ~${formatCurrency(forecastPayout)}` : ''}</span>}
                        </div>
                      )}
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                        <span>Выплат: {cashFlows.filter((flow) => flow.investment_id === investment.id).length}</span>
                        {isEditable && <Button variant="outline" size="sm" className="rounded-lg" onClick={(e) => { e.stopPropagation(); setPayoutInvestment(investment); setPayoutForm({ type: investment.type === 'bonds' ? 'coupon' : investment.type === 'deposit' ? 'interest' : 'dividend', amount: '', date: new Date().toISOString().slice(0, 10), destination: 'income', linked_goal_id: investment.linked_goal_ids?.[0] || '', account_id: '' }); }}>Добавить поступление</Button>}
                      </div>
                      {cashFlows.filter((flow) => flow.investment_id === investment.id).slice(0, 3).map((flow) => <div key={flow.id} className="mt-1 flex justify-between text-xs text-slate-500"><span>{flow.type === 'coupon' ? 'Купон' : flow.type === 'interest' ? 'Проценты' : flow.type === 'rent' ? 'Аренда' : 'Дивиденды'} · {format(new Date(flow.date), 'dd.MM.yyyy')}</span><span className="font-medium text-emerald-600">+{formatCurrency(flow.amount)}</span></div>)}

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
              <Input value={formData.broker} onChange={(e) => setFormData({ ...formData, broker: e.target.value })} placeholder={formData.type === 'deposit' ? 'Например: Сбер' : 'Например: Тинькофф'} className="rounded-xl mt-1" />
            </div>
            <div className="space-y-3 rounded-xl border border-violet-100 bg-violet-50/50 p-3 dark:border-violet-900/30 dark:bg-violet-900/10">
              <p className="text-sm font-medium">Параметры выплаты</p>
              <div className="grid grid-cols-2 gap-3"><div><Label>Купон / ед.</Label><Input className="mt-1 rounded-xl" type="number" value={formData.coupon_per_unit} onChange={(e) => setFormData({ ...formData, coupon_per_unit: e.target.value })} /></div><div><Label>Доходность, %</Label><Input className="mt-1 rounded-xl" type="number" value={formData.dividend_yield} onChange={(e) => setFormData({ ...formData, dividend_yield: e.target.value })} /></div></div>
              {formData.type === 'bonds' && <div><Label>Номинал</Label><Input className="mt-1 rounded-xl" type="number" value={formData.nominal_value} onChange={(e) => setFormData({ ...formData, nominal_value: e.target.value })} /></div>}
              <div className="grid grid-cols-2 gap-3"><div><Label>Периодичность</Label><Select value={formData.payout_frequency} onValueChange={(v) => setFormData({ ...formData, payout_frequency: v })}><SelectTrigger className="mt-1 rounded-xl"><SelectValue placeholder="Не указана" /></SelectTrigger><SelectContent><SelectItem value="monthly">Ежемесячно</SelectItem><SelectItem value="quarterly">Ежеквартально</SelectItem><SelectItem value="semiannual">Раз в полгода</SelectItem><SelectItem value="annual">Раз в год</SelectItem></SelectContent></Select></div><div><Label>Следующая дата</Label><Input className="mt-1 rounded-xl" type="date" value={formData.next_payout_date} onChange={(e) => setFormData({ ...formData, next_payout_date: e.target.value })} /></div></div>
            </div>
            {goals.length > 0 && <div><Label>Цели, для которых работает актив</Label><div className="mt-2 space-y-2">{goals.map((goal) => (<label className="flex items-center gap-2 text-sm" key={goal.id}><input type="checkbox" checked={formData.linked_goal_ids.includes(goal.id)} onChange={(e) => setFormData({ ...formData, linked_goal_ids: e.target.checked ? [...formData.linked_goal_ids, goal.id] : formData.linked_goal_ids.filter((id) => id !== goal.id) })} />{goal.title}</label>))}</div></div>}
            {/* Account selection for deducting purchase cost */}
            {!editInvestment && accounts.length > 0 && (
              <div className="space-y-2 p-3 rounded-xl bg-violet-50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-900/20">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.deduct_from_account}
                    onChange={(e) => setFormData({ ...formData, deduct_from_account: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    Списать стоимость покупки со счёта
                  </span>
                </label>
                {formData.deduct_from_account && (
                  <div>
                    <Label>Счёт списания</Label>
                    <Select
                      value={formData.account_id}
                      onValueChange={(v) => setFormData({ ...formData, account_id: v })}
                    >
                      <SelectTrigger className="rounded-xl mt-1">
                        <SelectValue placeholder="Выберите счёт" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map(acc => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.name} · {formatCurrency(acc.balance || 0)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-400 mt-1">
                      Будет создана транзакция-расход в категории «{INVESTMENT_CATEGORY}», которая не влияет на статистику повседневных трат.
                    </p>
                  </div>
                )}
              </div>
            )}
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

      <InvestmentPayoutDialog investment={payoutInvestment} open={!!payoutInvestment} onOpenChange={(open) => !open && setPayoutInvestment(null)} values={payoutForm} onChange={setPayoutForm} goals={goals.filter((goal) => (goal.scope || 'personal') === (payoutInvestment?.scope || 'personal'))} accounts={transferAccounts} onSave={handlePayoutSave} saving={payoutMutation.isPending} />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteInvestment} onOpenChange={(open) => !open && closeDeleteDialog()}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить актив?</AlertDialogTitle>
            <AlertDialogDescription>
              Выберите, удалить актив без следа или вернуть средства на счёт.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant={deleteMode === 'delete' ? 'default' : 'outline'} onClick={() => setDeleteMode('delete')} className="rounded-xl">Удалить бесследно</Button>
            <Button type="button" variant={deleteMode === 'transfer' ? 'default' : 'outline'} onClick={() => setDeleteMode('transfer')} className="rounded-xl">Перенести на счёт</Button>
          </div>
          {deleteMode === 'transfer' && (
            <div className="space-y-3">
              <div>
                <Label>Сумма возврата</Label>
                <Input type="number" min="0" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} className="rounded-xl mt-1" />
              </div>
              <div>
                <Label>Счёт получателя</Label>
                <Select value={transferAccountId} onValueChange={setTransferAccountId}>
                  <SelectTrigger className="rounded-xl mt-1"><SelectValue placeholder="Выберите счёт" /></SelectTrigger>
                  <SelectContent>
                    {transferAccounts.map((account) => <SelectItem key={account.id} value={account.id}>{account.name} · {formatCurrency(account.balance || 0)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending || (deleteMode === 'transfer' && (!transferAccountId || parseFloat(transferAmount) <= 0))}
              className={deleteMode === 'transfer' ? 'bg-emerald-600 hover:bg-emerald-700 rounded-xl' : 'bg-rose-600 hover:bg-rose-700 rounded-xl'}
            >
              {deleteMode === 'transfer' ? 'Перенести и удалить' : 'Удалить бесследно'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}