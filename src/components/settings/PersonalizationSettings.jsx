import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, ArrowLeftRight, CreditCard, Target, TrendingUp,
  ListTodo, PieChart, Settings, Users, FileText, Lightbulb, Baby,
  BarChart2, Check, Eye, EyeOff, Sparkles, Wallet, Layout, GripVertical
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
import { ALL_TABS, DEFAULT_TAB_ORDER } from '@/components/bottomTabsConfig';

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
  { key: 'aiInsights',    label: 'AI-рекомендации',     icon: Sparkles },
];

const DEFAULT_BLOCK_ORDER = DASHBOARD_BLOCKS.map((b) => b.key);

const DEFAULT_DASHBOARD_BLOCKS = {
  balance: true,
  quickStats: true,
  spendingChart: true,
  transactions: true,
  budgets: true,
  goals: true,
  aiInsights: true,
};

export default function PersonalizationSettings({ open, onOpenChange, onSaved }) {
  const [hiddenMenuItems, setHiddenMenuItems] = useState([]);
  const [dashboardBlocks, setDashboardBlocks] = useState(DEFAULT_DASHBOARD_BLOCKS);
  const [blockOrder, setBlockOrder] = useState(DEFAULT_BLOCK_ORDER);
  const [bottomTabOrder, setBottomTabOrder] = useState(DEFAULT_TAB_ORDER);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) loadSettings();
  }, [open]);

  const loadSettings = async () => {
    const user = await base44.auth.me();
    setHiddenMenuItems(user.hidden_menu_items || user.data?.hidden_menu_items || []);
    setDashboardBlocks({
      ...DEFAULT_DASHBOARD_BLOCKS,
      ...(user.visible_dashboard_blocks || user.data?.visible_dashboard_blocks || {})
    });
    const savedBlockOrder = user.dashboard_block_order || user.data?.dashboard_block_order;
    if (savedBlockOrder) {
      // merge: saved order first, then any new blocks not in saved order
      const merged = [...savedBlockOrder, ...DEFAULT_BLOCK_ORDER.filter((k) => !savedBlockOrder.includes(k))];
      setBlockOrder(merged);
    }
    setBottomTabOrder(user.bottom_tab_order || user.data?.bottom_tab_order || DEFAULT_TAB_ORDER);
  };

  const toggleMenuItem = (name) => {
    setHiddenMenuItems(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const toggleDashboardBlock = (key) => {
    setDashboardBlocks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const onDragEndBlocks = (result) => {
    if (!result.destination) return;
    const reordered = Array.from(blockOrder);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setBlockOrder(reordered);
  };

  const onDragEndTabs = (result) => {
    if (!result.destination) return;
    const reordered = Array.from(bottomTabOrder);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setBottomTabOrder(reordered);
  };

  const toggleTab = (page) => {
    setBottomTabOrder(prev =>
      prev.includes(page) ? prev.filter((p) => p !== page) : [...prev, page]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe({
      hidden_menu_items: hiddenMenuItems,
      visible_dashboard_blocks: dashboardBlocks,
      dashboard_block_order: blockOrder,
      bottom_tab_order: bottomTabOrder,
    });
    setSaving(false);
    toast.success('Настройки сохранены');
    onOpenChange(false);
    window.dispatchEvent(new Event('personalization-saved'));
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

        {/* Блоки дашборда — drag-and-drop */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Блоки главной страницы
            </p>
            <span className="text-xs text-slate-400">Перетаскивайте для изменения порядка</span>
          </div>
          <DragDropContext onDragEnd={onDragEndBlocks}>
            <Droppable droppableId="dashboard-blocks">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1.5">
                  {blockOrder.map((key, index) => {
                    const block = DASHBOARD_BLOCKS.find((b) => b.key === key);
                    if (!block) return null;
                    const Icon = block.icon;
                    const isVisible = dashboardBlocks[key];
                    return (
                      <Draggable key={key} draggableId={key} index={index}>
                        {(dragProvided) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-colors ${
                              isVisible
                                ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                                : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50'
                            }`}
                          >
                            <span {...dragProvided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-slate-300 dark:text-slate-600">
                              <GripVertical className="w-4 h-4" />
                            </span>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              isVisible ? 'bg-indigo-100 dark:bg-indigo-900/30' : 'bg-slate-100 dark:bg-slate-800'
                            }`}>
                              <Icon className={`w-4 h-4 ${isVisible ? 'text-indigo-600' : 'text-slate-400'}`} />
                            </div>
                            <p className={`text-sm font-medium flex-1 ${isVisible ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                              {block.label}
                            </p>
                            <Switch
                              checked={!!isVisible}
                              onCheckedChange={() => toggleDashboardBlock(key)}
                            />
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>

        <Separator className="my-4" />

        {/* Нижнее меню — drag-and-drop */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Нижнее меню
            </p>
            <span className="text-xs text-slate-400">Перетаскивайте для изменения порядка</span>
          </div>
          <DragDropContext onDragEnd={onDragEndTabs}>
            <Droppable droppableId="bottom-tabs">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1.5">
                  {bottomTabOrder.map((page, index) => {
                    const tab = ALL_TABS.find((t) => t.page === page);
                    if (!tab || tab.isCenter) return null;
                    const Icon = tab.icon;
                    return (
                      <Draggable key={page} draggableId={page} index={index}>
                        {(dragProvided) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                          >
                            <span {...dragProvided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-slate-300 dark:text-slate-600">
                              <GripVertical className="w-4 h-4" />
                            </span>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-violet-100 dark:bg-violet-900/30">
                              <Icon className="w-4 h-4 text-violet-600" />
                            </div>
                            <p className="text-sm font-medium flex-1 text-slate-900 dark:text-white">
                              {tab.label}
                            </p>
                            <button
                              onClick={() => toggleTab(page)}
                              className="text-slate-400 hover:text-rose-500 transition-colors"
                            >
                              <EyeOff className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          {/* Hidden tabs — can be re-added */}
          {ALL_TABS.filter((t) => !t.isCenter && !bottomTabOrder.includes(t.page)).length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-slate-400 mb-2">Скрытые вкладки:</p>
              <div className="flex flex-wrap gap-2">
                {ALL_TABS.filter((t) => !t.isCenter && !bottomTabOrder.includes(t.page)).map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.page}
                      onClick={() => toggleTab(tab.page)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 hover:text-violet-600 hover:border-violet-400 transition-colors text-xs"
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {tab.label}
                      <Eye className="w-3 h-3" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <Separator className="my-4" />

        {/* Меню */}
        <div>
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