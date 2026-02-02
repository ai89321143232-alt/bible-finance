import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, ArrowLeftRight, CreditCard, Target, TrendingUp,
  ListTodo, PieChart, Settings, Users, FileText, Lightbulb, Baby
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

export default function Menu() {
  const [selectedCategory, setSelectedCategory] = useState(MENU_CATEGORIES[0]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Меню
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Выберите категорию и перейдите к нужному разделу
          </p>
        </motion.div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {MENU_CATEGORIES.map((category, idx) => (
            <motion.button
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => setSelectedCategory(category)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all whitespace-nowrap ${
                selectedCategory.id === category.id
                  ? `${category.colorBg} border-2 ${category.colorText.replace('text-', 'border-')}`
                  : 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className={`p-2 rounded-lg ${selectedCategory.id === category.id ? 'bg-white/30' : category.colorBg}`}>
                <category.icon className={`w-5 h-5 ${category.colorText}`} />
              </div>
              <span className={`font-semibold ${category.colorText}`}>
                {category.label}
              </span>
            </motion.button>
          ))}
        </div>

        {/* Menu Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {selectedCategory.items.map((item, idx) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Link
                to={createPageUrl(item.name)}
                className={`flex items-center gap-4 p-6 rounded-2xl transition-all border-2 ${selectedCategory.hoverBg} bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-${selectedCategory.colorText.split('-')[1]}-${selectedCategory.colorText.split('-')[2]}`}
              >
                <div className={`p-4 rounded-xl ${selectedCategory.colorBg}`}>
                  <item.icon className={`w-8 h-8 ${selectedCategory.colorText}`} />
                </div>
                <div>
                  <h3 className={`font-semibold text-lg ${selectedCategory.colorText}`}>
                    {item.label}
                  </h3>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}