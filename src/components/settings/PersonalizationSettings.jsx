// ============================================================
// components/settings/PersonalizationSettings.jsx
// ============================================================
// Модальное окно персонализации: настройка видимости пунктов меню
// и блоков дашборда. Сохраняет в user.data через base44.auth.updateMe()
//
// Props:
//   open         → boolean, открыт ли диалог
//   onOpenChange → коллбэк закрытия
//   onSaved      → коллбэк после сохранения (для reload)
// ============================================================

import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, ArrowLeftRight, CreditCard, Target, TrendingUp,
  ListTodo, PieChart, Settings, Users, FileText, Lightbulb, Baby,
  BarChart2, Check, Eye, EyeOff, Sparkles, Wallet, Layout
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from 'sonner';

// Все пункты меню с метаданными
const ALL_MENU_ITEMS = [
  { name: 'Dashboard',         label: 'Главная',          icon: LayoutDashboard, required: true },
  { name: 'Transactions',      label: 'Операции',         icon: ArrowLeftRight,  required: true },
  { name: 'Accounts',          label: 'Счета',            icon: CreditCard },
  { name: 'Budgets',           label: 'Бюджеты',          icon: PieChart },
  { name: 'Categories',        label: 'Категории',        icon: BarChart2 },
  { name: 'Analytics',         label: 'Аналитика',        icon: TrendingUp },
  { name: 'Goals',             label: 'Цели',             icon: Target },
  { name: 'Investments',       label: 'Инвестиции',       icon: TrendingUp },
  { name: 'FinancialPlanning', label: 'Финплан',          icon: Lightbulb },
  { name: 'Tasks',             label: 'Задачи',           icon: ListTodo },
  { name: 'Notes',             label: 'Заметки',          icon: FileText },
  { name: 'FamilyFinances',    label: 'Финансы семьи',    icon: Users },
  { name: 'ChildExpenses',     label: 'Расходы на детей', icon: Baby },
  { name: 'Settings',          label: 'Настройки',        icon: Settings, required: true },
];

// Блоки дашборда
const DASHBOARD_BLOCKS = [
  { key: 'balance',       label: 'Карточка баланса',    icon: Wallet },
  { key: 'quickStats',    label: 'Быстрая статистика',  icon: BarChart2 },
  { key: 'spendingChart', label: 'График расходов',     icon: TrendingUp },
  { key: 'transactions',  label: 'Последние операции',  icon: ArrowLeftRight },
  { key: 'budgets',       label: 'Обзор бюджетов',      icon: PieChart },
  { key: 'goals',         label: 'Прогресс целей',      icon: Target },
];

const DEFAULT_HIDDEN_MENU = [];
const DEFAULT_DASHBOARD_BLOCKS = {
  balance: true,
  quickStats: true,
  spendingChart: true,
  transactions: true,
  budgets: true,
  goals: true,
};

export default function PersonalizationSettings({ open, onOpenChange, onSaved }) {
  const [hiddenMenuItems, setHiddenMenuItems] = useState([]);
  const [dashboardBlocks, setDashboardBlocks] = useState(DEFAULT_DASHBOARD_BLOCKS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) loadSettings();
  }, [open]);

  const loadSettings = async () => {
    const user = await base44.auth.me();
    setHiddenMenuItems(user.data?.hidden_menu_items || []);
    setDashboardBlocks({
      ...DEFAULT_DASHBOARD_BLOCKS,
      ...(user.data?.visible_dashboard_blocks || {})
    });
  };

  const toggleMenuItem = (name) => {
    setHiddenMenuItems(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const toggleDashboardBlock = (key) => {
    setDashboardBlocks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe({
      hidden_menu_items: hiddenMenuItems,
      visible_dashboard_blocks: dashboardBlocks,
    });
    setSaving(false);
    toast.success('Настройки сохранены');
    onOpenChange(false);
    onSaved?.();
  };

  const visibleCount = ALL_MENU_ITEMS.filter(i => !hiddenMenuItems.includes(i.name)).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layout className="w-5 h-5 text-violet-600" />
            Персонализация
          </DialogTitle>
        </DialogHeader>

        {/* Меню */}
        <div className="mt-2">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Пункты меню
            </p>
            <span className="text-xs text-slate-400">
              Показано: {visibleCount} из {ALL_MENU_ITEMS.length}
            </span>
          </div>
          <div className="rounded-xl border border-slate-100 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden">
            {ALL_MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              const isVisible = !hiddenMenuItems.includes(item.name);
              return (
                <div
                  key={item.name}
                  className={`flex items-center justify-between px-4 py-3 transition-colors ${
                    item.required ? 'opacity-50' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isVisible ? 'bg-violet-100 dark:bg-violet-900/30' : 'bg-slate-100 dark:bg-slate-800'
                    }`}>
                      <Icon className={`w-4 h-4 ${isVisible ? 'text-violet-600' : 'text-slate-400'}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${isVisible ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                        {item.label}
                      </p>
                      {item.required && (
                        <p className="text-xs text-slate-400">Обязательный</p>
                      )}
                    </div>
                  </div>
                  <Switch
                    checked={isVisible}
                    onCheckedChange={() => !item.required && toggleMenuItem(item.name)}
                    disabled={item.required}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <Separator className="my-4" />

        {/* Блоки дашборда */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Блоки главной страницы
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden">
            {DASHBOARD_BLOCKS.map((block) => {
              const Icon = block.icon;
              const isVisible = dashboardBlocks[block.key];
              return (
                <div
                  key={block.key}
                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isVisible ? 'bg-indigo-100 dark:bg-indigo-900/30' : 'bg-slate-100 dark:bg-slate-800'
                    }`}>
                      <Icon className={`w-4 h-4 ${isVisible ? 'text-indigo-600' : 'text-slate-400'}`} />
                    </div>
                    <p className={`text-sm font-medium ${isVisible ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                      {block.label}
                    </p>
                  </div>
                  <Switch
                    checked={!!isVisible}
                    onCheckedChange={() => toggleDashboardBlock(block.key)}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full mt-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
        >
          <Check className="w-4 h-4 mr-2" />
          {saving ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}