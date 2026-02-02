import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, ArrowLeftRight, CreditCard, Target, TrendingUp,
  ListTodo, PieChart, Settings, Users, FileText, Lightbulb, Baby, ChevronDown
} from 'lucide-react';

const MENU_CATEGORIES = [
  {
    id: 'finance',
    label: 'Финансы',
    icon: CreditCard,
    colorBg: 'bg-violet-100 dark:bg-violet-900/30',
    colorText: 'text-violet-600 dark:text-violet-400',
    hoverBg: 'hover:bg-violet-50 dark:hover:bg-violet-900/20',
    items: [
      { name: 'Dashboard', label: 'Главная', icon: LayoutDashboard },
      { name: 'Transactions', label: 'Операции', icon: ArrowLeftRight },
      { name: 'Accounts', label: 'Счета', icon: CreditCard },
      { name: 'Budgets', label: 'Бюджеты', icon: CreditCard },
      { name: 'Categories', label: 'Категории', icon: PieChart },
      { name: 'Analytics', label: 'Аналитика', icon: PieChart },
    ]
  },
  {
    id: 'goals',
    label: 'Цели & Инвестиции',
    icon: Target,
    colorBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    colorText: 'text-emerald-600 dark:text-emerald-400',
    hoverBg: 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
    items: [
      { name: 'Goals', label: 'Цели', icon: Target },
      { name: 'Investments', label: 'Инвестиции', icon: TrendingUp },
    ]
  },
  {
    id: 'planning',
    label: 'Планирование',
    icon: Lightbulb,
    colorBg: 'bg-amber-100 dark:bg-amber-900/30',
    colorText: 'text-amber-600 dark:text-amber-400',
    hoverBg: 'hover:bg-amber-50 dark:hover:bg-amber-900/20',
    items: [
      { name: 'FinancialPlanning', label: 'Финплан', icon: Lightbulb },
      { name: 'Tasks', label: 'Задачи', icon: ListTodo },
      { name: 'Notes', label: 'Заметки', icon: FileText },
    ]
  },
  {
    id: 'family',
    label: 'Семья',
    icon: Users,
    colorBg: 'bg-pink-100 dark:bg-pink-900/30',
    colorText: 'text-pink-600 dark:text-pink-400',
    hoverBg: 'hover:bg-pink-50 dark:hover:bg-pink-900/20',
    items: [
      { name: 'FamilyFinances', label: 'Финансы семьи', icon: Users },
      { name: 'ChildExpenses', label: 'Расходы на детей', icon: Baby },
    ]
  },
  {
    id: 'manage',
    label: 'Управление',
    icon: Settings,
    colorBg: 'bg-slate-100 dark:bg-slate-800/30',
    colorText: 'text-slate-600 dark:text-slate-400',
    hoverBg: 'hover:bg-slate-50 dark:hover:bg-slate-900/20',
    items: [
      { name: 'Settings', label: 'Настройки', icon: Settings },
    ]
  }
];

export default function NavigationMenu({ currentPageName, onNavigate }) {
  const [expandedCategory, setExpandedCategory] = useState(null);

  const handleCategoryClick = (category) => {
    setExpandedCategory(expandedCategory?.id === category.id ? null : category);
  };

  return (
    <div className="flex h-full">
      {/* Left: Main Categories */}
      <div className="w-64 border-r border-slate-200 dark:border-slate-800 p-4 space-y-2">
        {MENU_CATEGORIES.map((category, idx) => (
          <motion.button
            key={category.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => handleCategoryClick(category)}
            className={`w-full p-3 rounded-xl transition-all ${
              expandedCategory?.id === category.id 
                ? `${category.colorBg} border-2 ${category.colorText.replace('text-', 'border-')}`
                : 'border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${expandedCategory?.id === category.id ? 'bg-white/30' : category.colorBg}`}>
                <category.icon className={`w-5 h-5 ${category.colorText}`} />
              </div>
              <span className={`font-semibold text-sm ${category.colorText}`}>{category.label}</span>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Right: Submenu Items */}
      <div className="flex-1 p-6">
        <AnimatePresence mode="wait">
          {expandedCategory ? (
            <motion.div
              key={expandedCategory.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h3 className={`text-lg font-bold mb-4 ${expandedCategory.colorText}`}>
                {expandedCategory.label}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {expandedCategory.items.map((item, itemIdx) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: itemIdx * 0.05 }}
                  >
                    <Link
                      to={createPageUrl(item.name)}
                      onClick={onNavigate}
                      className={`flex items-center gap-3 p-4 rounded-xl transition-all ${expandedCategory.hoverBg} ${
                        currentPageName === item.name 
                          ? `${expandedCategory.colorBg} border-2 ${expandedCategory.colorText.replace('text-', 'border-')}`
                          : 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className={`p-2.5 rounded-lg ${expandedCategory.colorBg}`}>
                        <item.icon className={`w-5 h-5 ${expandedCategory.colorText}`} />
                      </div>
                      <span className={`font-medium ${expandedCategory.colorText}`}>{item.label}</span>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center h-full text-center"
            >
              <div>
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <LayoutDashboard className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500 dark:text-slate-400">
                  Выберите категорию слева
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}