import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
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

export default function NavigationMenu({ currentPageName, onNavigate }) {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-50 safe-area-pb">
        <div className="flex items-center justify-around px-2 py-2">
          {MENU_CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => {
                setSelectedCategory(category);
                setShowMobileMenu(true);
              }}
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className={`p-2 rounded-lg ${category.colorBg}`}>
                <category.icon className={`w-5 h-5 ${category.colorText}`} />
              </div>
              <span className={`text-xs font-medium ${category.colorText}`}>
                {category.label.split(' ')[0]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Submenu Modal */}
      <AnimatePresence>
        {showMobileMenu && selectedCategory && (
          <div 
            className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            onClick={() => setShowMobileMenu(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-0 top-auto bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl max-h-[70vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
                <h2 className={`text-lg font-bold ${selectedCategory.colorText}`}>
                  {selectedCategory.label}
                </h2>
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="p-6 grid grid-cols-2 gap-3">
                {selectedCategory.items.map((item, idx) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Link
                      to={createPageUrl(item.name)}
                      onClick={() => {
                        onNavigate();
                        setShowMobileMenu(false);
                      }}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all ${
                        currentPageName === item.name 
                          ? `${selectedCategory.colorBg} border-2 ${selectedCategory.colorText.replace('text-', 'border-')}`
                          : 'bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className={`p-3 rounded-lg ${selectedCategory.colorBg}`}>
                        <item.icon className={`w-6 h-6 ${selectedCategory.colorText}`} />
                      </div>
                      <span className={`text-sm font-medium text-center ${selectedCategory.colorText}`}>
                        {item.label}
                      </span>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}