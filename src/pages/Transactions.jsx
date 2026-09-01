import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { useLanguage } from '@/lib/LanguageContext';
import { useFormatCurrency } from '@/lib/formatCurrency';
import {
  Plus, Search, ChevronLeft, ChevronRight, Calendar, Download, Upload
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
import QuickAddTransaction from '@/components/transactions/QuickAddTransaction';
import ExportRangeModal from '@/components/transactions/ExportRangeModal';
import TransactionImport from '@/components/transactions/TransactionImport';
import SwipeableTransaction from '@/components/transactions/SwipeableTransaction';
import PullToRefresh from '@/components/PullToRefresh';
import MobileSelect from '@/components/mobile/MobileSelect';
import { useActiveWorkspaceId, filterByWorkspace } from '@/components/workspace/WorkspaceContext';
import { TransactionService } from '@/services';
import FamilyVisibilityToggle from '@/components/shared/FamilyVisibilityToggle';
import { useScopeMode } from '@/hooks/useScopeMode';

const CATEGORY_ICONS = {
  'Еда': '🍔', 'Транспорт': '🚗', 'Жильё': '🏠', 'Развлечения': '🎮',
  'Здоровье': '💊', 'Одежда': '👕', 'Подписки': '📱', 'Образование': '📚',
  'Зарплата': '💰', 'Фриланс': '💻', 'Инвестиции': '📈', 'Подарки': '🎁', 'Другое': '📦',
  'Food': '🍔', 'Transport': '🚗', 'Housing': '🏠', 'Entertainment': '🎮',
  'Health': '💊', 'Clothing': '👕', 'Subscriptions': '📱', 'Education': '📚',
  'Salary': '💰', 'Freelance': '💻', 'Investments': '📈', 'Gifts': '🎁', 'Other': '📦'
};

export default function Transactions() {
  const queryClient = useQueryClient();
  const { t, language } = useLanguage();
  const dateLocale = language === 'en' ? enUS : ru;
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTransaction, setEditTransaction] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('category') || 'all';
  });
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [deleteId, setDeleteId] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [user, setUser] = useState(null);
  const [openSwipeId, setOpenSwipeId] = useState(null);
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const [ownerFilter, setOwnerFilter] = useState('all');
  const activeWorkspaceId = useActiveWorkspaceId();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Семья определяется через Family (owner_id/members), а не только user.family_id —
  // это поле не всегда актуально у владельца семьи.
  const { data: family } = useQuery({
    queryKey: ['my-family', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const families = await base44.entities.Family.list();
      return families.find(f =>
        f.owner_id === user?.id ||
        f.members?.some(m => m.user_id === user?.id)
      ) ?? null;
    },
    enabled: !!user,
    staleTime: 60000
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', user?.id, family?.id, activeWorkspaceId],
    queryFn: async () => {
      if (!user) return [];
      const all = await base44.entities.Transaction.list('-date', 100);
      const mine = all.filter(t =>
        t.created_by_id === user.id ||
        t.user_id === user.id ||
        (family?.id && t.family_id === family.id)
      );
      return filterByWorkspace(mine, activeWorkspaceId);
    },
    enabled: !!user,
    staleTime: 0
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', user?.id, family?.id, activeWorkspaceId],
    queryFn: async () => {
      if (!user) return [];
      const all = await base44.entities.Account.list();
      const mine = all.filter(a =>
        a.created_by_id === user.id ||
        (family?.id && a.family_id === family.id)
      );
      return filterByWorkspace(mine, activeWorkspaceId);
    },
    enabled: !!user
  });

  const { filterTransactions: filterScopeTx } = useScopeMode();
  const scopedTransactions = filterScopeTx(transactions, accounts);

  const deleteMutation = useMutation({
    mutationFn: (id) => TransactionService.remove(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['transactions'] });
      const prevTransactions = queryClient.getQueryData(['transactions']);
      queryClient.setQueryData(['transactions'], (old) => old ? old.filter(t => t.id !== id) : []);
      setDeleteId(null);
      return { prevTransactions };
    },
    onError: (_err, _id, context) => {
      if (context?.prevTransactions) queryClient.setQueryData(['transactions'], context.prevTransactions);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });

  const formatCurrency = useFormatCurrency();

  const isFamilyTier = family?.subscription_tier === 'family' || family?.subscription_tier === 'premium';
  const familyMemberIds = (family?.members || []).map(m => m.user_id).filter(id => id && id !== user?.id);
  const displayedTransactions = scopedTransactions.filter(t => {
    if (showOnlyMine && isFamilyTier) {
      return t.created_by_id === user?.id || t.user_id === user?.id;
    }
    if (ownerFilter === 'mine') return t.created_by_id === user?.id || t.user_id === user?.id;
    if (ownerFilter === 'family') return t.family_id && family?.id && t.family_id === family.id && (t.created_by_id === user?.id || t.user_id === user?.id);
    if (ownerFilter === 'others') return familyMemberIds.includes(t.created_by_id || t.user_id);
    return true;
  });

  const filteredTransactions = displayedTransactions.filter(t => {
    const date = new Date(t.date);
    const inMonth = date >= startOfMonth(currentMonth) && date <= endOfMonth(currentMonth);
    const matchesSearch = !searchQuery || t.category?.toLowerCase().includes(searchQuery.toLowerCase()) || t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesCategory = filterCategory === 'all' || t.category === filterCategory;
    return inMonth && matchesSearch && matchesType && matchesCategory;
  });

  const groupedTransactions = filteredTransactions.reduce((groups, t) => {
    const d = new Date(t.date);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(t);
    return groups;
  }, {});

  const sortedDates = Object.keys(groupedTransactions).sort((a, b) => new Date(b) - new Date(a));
  const allCategories = [...new Set(displayedTransactions.map(t => t.category).filter(Boolean))];
  const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['accounts'] }),
    ]);
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-24 sm:pb-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{t('transactions.title')}</h1>
          <div className="flex items-center gap-2">
            {family && (
              <FamilyVisibilityToggle showOnlyMine={showOnlyMine} onToggle={() => setShowOnlyMine(v => !v)} />
            )}
            <Button onClick={() => setShowImportModal(true)} variant="outline" className="rounded-xl hidden sm:flex">
              <Upload className="w-4 h-4 mr-2" />{t('transactions.import')}
            </Button>
            <Button onClick={() => setShowExportModal(true)} variant="outline" className="rounded-xl hidden sm:flex">
              <Download className="w-4 h-4 mr-2" />{t('transactions.export')}
            </Button>
            <Button onClick={() => setShowAddModal(true)} className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/25 rounded-xl">
              <Plus className="w-5 h-5 mr-2" />{t('common.add')}
            </Button>
          </div>
        </motion.div>

        <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="rounded-xl text-slate-700 dark:text-white">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="text-center">
                <h2 className="font-semibold text-lg text-slate-900 dark:text-white capitalize">{format(currentMonth, 'LLLL yyyy', { locale: dateLocale })}</h2>
                <div className="flex items-center justify-center gap-4 mt-1">
                  <span className="text-sm text-emerald-600">+{formatCurrency(totalIncome)}</span>
                  <span className="text-sm text-rose-600">-{formatCurrency(totalExpense)}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="rounded-xl text-slate-700 dark:text-white">
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder={t('transactions.search_placeholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 rounded-xl border-slate-200 dark:border-slate-700" />
          </div>
          <MobileSelect value={filterType} onValueChange={setFilterType} placeholder={t('transactions.filter_type')} title={t('transactions.filter_type_title')} triggerClassName="w-32 rounded-xl text-slate-900 dark:text-white">
            <option value="all">{t('transactions.all_types')}</option>
            <option value="expense">{t('balance.expenses')}</option>
            <option value="income">{t('balance.income')}</option>
          </MobileSelect>
          <MobileSelect value={filterCategory} onValueChange={setFilterCategory} placeholder={t('transactions.filter_category')} title={t('transactions.filter_category')} triggerClassName="w-40 rounded-xl text-slate-900 dark:text-white">
            <option value="all">{t('transactions.all_categories')}</option>
            {allCategories.map(cat => (
              <option key={cat} value={cat}>{CATEGORY_ICONS[cat]} {cat}</option>
            ))}
          </MobileSelect>
          {family && (
            <MobileSelect value={ownerFilter} onValueChange={setOwnerFilter} placeholder={t('transactions.filter_owner')} title={t('transactions.filter_owner_title')} triggerClassName="w-36 rounded-xl text-slate-900 dark:text-white">
              <option value="all">{t('transactions.all_operations')}</option>
              <option value="mine">{t('transactions.only_mine')}</option>
              <option value="family">{t('transactions.family')}</option>
              <option value="others">{t('transactions.other_members')}</option>
            </MobileSelect>
          )}
        </div>

        <div className="space-y-6" onClick={() => setOpenSwipeId(null)}>
          {sortedDates.length > 0 ? (
            sortedDates.map((dateKey) => (
              <motion.div key={dateKey} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3 px-1">
                  {format(new Date(dateKey + 'T00:00:00'), 'd MMMM, EEEE', { locale: dateLocale })}
                </h3>
                <Card className="glass-card border border-slate-200 dark:border-slate-700 shadow-none overflow-hidden">
                  <CardContent className="p-0">
                    {groupedTransactions[dateKey].map((transaction, index) => (
                      <SwipeableTransaction key={transaction.id} transaction={transaction} index={index}
                        onDelete={setDeleteId} onEdit={(t) => { setEditTransaction(t); setShowAddModal(true); }}
                        formatCurrency={formatCurrency} showActions={false} family={family} currentUser={user}
                        isOpen={openSwipeId === transaction.id}
                        onOpenChange={(open) => setOpenSwipeId(open ? transaction.id : null)} />
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 dark:text-slate-400 mb-2">{t('transactions.no_transactions_period')}</p>
              <Button onClick={() => setShowAddModal(true)} variant="outline" className="rounded-xl">
                <Plus className="w-4 h-4 mr-2" />{t('transactions.add_transaction')}
              </Button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <QuickAddTransaction transaction={editTransaction}
            onClose={() => { setShowAddModal(false); setEditTransaction(null); }} accounts={accounts} />
        )}
        {showExportModal && user && (
          <ExportRangeModal user={user} activeWorkspaceId={activeWorkspaceId} onClose={() => setShowExportModal(false)} />
        )}
        <TransactionImport
          open={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImported={() => queryClient.invalidateQueries(['transactions'])}
        />
      </AnimatePresence>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('transactions.delete_title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('transactions.delete_desc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteId)} className="bg-rose-600 hover:bg-rose-700 rounded-xl">{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </PullToRefresh>
  );
}