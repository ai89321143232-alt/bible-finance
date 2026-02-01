import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, ArrowLeftRight, CreditCard, Target, TrendingUp,
  ListTodo, PieChart, Settings, Users, FileText, Lightbulb, Baby
} from 'lucide-react';
import CategoryModal from './CategoryModal';

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
      { name: 'Tasks', label: 'Задачи', icon: ListTodo },
      { name: 'Notes', label: 'Заметки', icon: FileText },
      { name: 'Settings', label: 'Настройки', icon: Settings },
    ]
  }
];

export default function NavigationMenu({ currentPageName, onNavigate }) {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleCategoryClick = (category) => {
    if (isMobile) {
      setSelectedCategory(selectedCategory?.id === category.id ? null : category);
    } else {
      setSelectedCategory(category);
    }
  };

  return (
    <>
      <div className="p-6 space-y-3">
        {MENU_CATEGORIES.map((category, idx) => (
          <div key={category.id}>
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => handleCategoryClick(category)}
              className={`w-full p-4 rounded-xl transition-all border-2 border-slate-200 dark:border-slate-700 ${category.hoverBg}`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${category.colorBg}`}>
                  <category.icon className={`w-5 h-5 ${category.colorText}`} />
                </div>
                <span className={`font-semibold ${category.colorText}`}>{category.label}</span>
              </div>
            </motion.button>

            {/* Mobile: блоки в меню */}
            {isMobile && selectedCategory?.id === category.id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 p-3 space-y-2"
              >
                {category.items.map((item, itemIdx) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: itemIdx * 0.05 }}
                  >
                    <a
                      href={createPageUrl(item.name)}
                      onClick={onNavigate}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${category.hoverBg} ${category.colorBg}`}
                    >
                      <item.icon className={`w-4 h-4 ${category.colorText}`} />
                      <span className={`text-sm font-medium ${category.colorText}`}>{item.label}</span>
                    </a>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop: модальное окно */}
      {!isMobile && (
        <CategoryModal
          isOpen={selectedCategory !== null}
          category={selectedCategory}
          onClose={() => setSelectedCategory(null)}
        />
      )}
    </>
  );
}