import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, ArrowLeftRight, CreditCard, Target, TrendingUp,
  ListTodo, PieChart, Settings, Users, FileText, Lightbulb, Baby,
  ChevronRight
} from 'lucide-react';

const MENU_CATEGORIES = [
  {
    id: 'finance',
    label: 'Финансы',
    icon: '💰',
    color: 'from-violet-500 to-indigo-500',
    items: [
      { name: 'Dashboard', label: 'Главная', icon: LayoutDashboard },
      { name: 'Transactions', label: 'Операции', icon: ArrowLeftRight },
      { name: 'Accounts', label: 'Счета', icon: CreditCard },
      { name: 'Budgets', label: 'Бюджеты', icon: CreditCard },
    ]
  },
  {
    id: 'goals',
    label: 'Цели & Инвестиции',
    icon: '🎯',
    color: 'from-emerald-500 to-teal-500',
    items: [
      { name: 'Goals', label: 'Цели', icon: Target },
      { name: 'Investments', label: 'Инвестиции', icon: TrendingUp },
    ]
  },
  {
    id: 'planning',
    label: 'Планирование',
    icon: '💡',
    color: 'from-amber-500 to-orange-500',
    items: [
      { name: 'FinancialPlanning', label: 'Финплан', icon: Lightbulb },
      { name: 'Analytics', label: 'Аналитика', icon: PieChart },
    ]
  },
  {
    id: 'family',
    label: 'Семья',
    icon: '👨‍👩‍👧‍👦',
    color: 'from-pink-500 to-rose-500',
    items: [
      { name: 'FamilyFinances', label: 'Финансы семьи', icon: Users },
      { name: 'ChildExpenses', label: 'Расходы на детей', icon: Baby },
    ]
  },
  {
    id: 'manage',
    label: 'Управление',
    icon: '⚙️',
    color: 'from-slate-500 to-gray-500',
    items: [
      { name: 'Tasks', label: 'Задачи', icon: ListTodo },
      { name: 'Notes', label: 'Заметки', icon: FileText },
      { name: 'Settings', label: 'Настройки', icon: Settings },
    ]
  }
];

export default function NavigationMenu({ currentPageName, onNavigate }) {
  const [expandedCategory, setExpandedCategory] = useState(null);

  return (
    <div className="p-6 space-y-4">
      {MENU_CATEGORIES.map((category, idx) => (
        <motion.div
          key={category.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
        >
          <button
            onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
            className={`w-full p-4 rounded-xl transition-all border-0 text-left group
              ${expandedCategory === category.id
                ? `bg-gradient-to-r ${category.color} text-white shadow-lg`
                : 'bg-white dark:bg-slate-800 hover:shadow-md dark:hover:bg-slate-700/80'
              }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{category.icon}</span>
                <span className="font-semibold">{category.label}</span>
              </div>
              <ChevronRight 
                className={`w-5 h-5 transition-transform ${
                  expandedCategory === category.id ? 'rotate-90' : ''
                }`}
              />
            </div>
          </button>

          {expandedCategory === category.id && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 space-y-2 ml-4"
            >
              {category.items.map((item) => (
                <Link
                  key={item.name}
                  to={createPageUrl(item.name)}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all
                    ${currentPageName === item.name
                      ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              ))}
            </motion.div>
          )}
        </motion.div>
      ))}
    </div>
  );
}