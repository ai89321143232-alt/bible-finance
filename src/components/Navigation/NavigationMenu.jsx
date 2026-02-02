import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, ArrowLeftRight, CreditCard, Target, TrendingUp,
  ListTodo, PieChart, Settings, Users, FileText, Lightbulb, Baby
} from 'lucide-react';

const MENU_ITEMS = [
  { 
    name: 'Dashboard', 
    label: 'Главная', 
    icon: LayoutDashboard,
    gradient: 'from-violet-500 to-purple-600',
    bgGradient: 'from-violet-50 to-purple-50 dark:from-violet-950/50 dark:to-purple-950/50'
  },
  { 
    name: 'Transactions', 
    label: 'Операции', 
    icon: ArrowLeftRight,
    gradient: 'from-blue-500 to-cyan-600',
    bgGradient: 'from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50'
  },
  { 
    name: 'Accounts', 
    label: 'Счета', 
    icon: CreditCard,
    gradient: 'from-emerald-500 to-teal-600',
    bgGradient: 'from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50'
  },
  { 
    name: 'Budgets', 
    label: 'Бюджеты', 
    icon: PieChart,
    gradient: 'from-amber-500 to-orange-600',
    bgGradient: 'from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50'
  },
  { 
    name: 'Categories', 
    label: 'Категории', 
    icon: PieChart,
    gradient: 'from-pink-500 to-rose-600',
    bgGradient: 'from-pink-50 to-rose-50 dark:from-pink-950/50 dark:to-rose-950/50'
  },
  { 
    name: 'Analytics', 
    label: 'Аналитика', 
    icon: TrendingUp,
    gradient: 'from-indigo-500 to-blue-600',
    bgGradient: 'from-indigo-50 to-blue-50 dark:from-indigo-950/50 dark:to-blue-950/50'
  },
  { 
    name: 'Goals', 
    label: 'Цели', 
    icon: Target,
    gradient: 'from-green-500 to-emerald-600',
    bgGradient: 'from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50'
  },
  { 
    name: 'Investments', 
    label: 'Инвестиции', 
    icon: TrendingUp,
    gradient: 'from-purple-500 to-violet-600',
    bgGradient: 'from-purple-50 to-violet-50 dark:from-purple-950/50 dark:to-violet-950/50'
  },
  { 
    name: 'FinancialPlanning', 
    label: 'Финплан', 
    icon: Lightbulb,
    gradient: 'from-yellow-500 to-amber-600',
    bgGradient: 'from-yellow-50 to-amber-50 dark:from-yellow-950/50 dark:to-amber-950/50'
  },
  { 
    name: 'Tasks', 
    label: 'Задачи', 
    icon: ListTodo,
    gradient: 'from-cyan-500 to-blue-600',
    bgGradient: 'from-cyan-50 to-blue-50 dark:from-cyan-950/50 dark:to-blue-950/50'
  },
  { 
    name: 'Notes', 
    label: 'Заметки', 
    icon: FileText,
    gradient: 'from-slate-500 to-gray-600',
    bgGradient: 'from-slate-50 to-gray-50 dark:from-slate-950/50 dark:to-gray-950/50'
  },
  { 
    name: 'FamilyFinances', 
    label: 'Финансы семьи', 
    icon: Users,
    gradient: 'from-rose-500 to-pink-600',
    bgGradient: 'from-rose-50 to-pink-50 dark:from-rose-950/50 dark:to-pink-950/50'
  },
  { 
    name: 'ChildExpenses', 
    label: 'Расходы на детей', 
    icon: Baby,
    gradient: 'from-fuchsia-500 to-pink-600',
    bgGradient: 'from-fuchsia-50 to-pink-50 dark:from-fuchsia-950/50 dark:to-pink-950/50'
  },
  { 
    name: 'Settings', 
    label: 'Настройки', 
    icon: Settings,
    gradient: 'from-gray-500 to-slate-600',
    bgGradient: 'from-gray-50 to-slate-50 dark:from-gray-950/50 dark:to-slate-950/50'
  }
];

export default function NavigationMenu({ currentPageName, onNavigate, isMobile }) {
  return (
    <div className="p-4 space-y-2">
      {MENU_ITEMS.map((item, idx) => {
        const Icon = item.icon;
        const isActive = currentPageName === item.name;
        
        return (
          <motion.div
            key={item.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.03 }}
          >
            <Link
              to={createPageUrl(item.name)}
              onClick={onNavigate}
              className="block"
            >
              <motion.div
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={`
                  relative group flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer overflow-hidden
                  ${isActive 
                    ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg shadow-${item.gradient.split('-')[1]}-500/25` 
                    : `bg-gradient-to-r ${item.bgGradient} hover:shadow-md`
                  }
                `}
              >
                {/* Gradient overlay on hover */}
                {!isActive && (
                  <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
                )}
                
                {/* Icon with gradient background */}
                <div className={`
                  relative z-10 flex items-center justify-center w-9 h-9 rounded-lg transition-all
                  ${isActive 
                    ? 'bg-white/20' 
                    : `bg-gradient-to-br ${item.gradient} text-white group-hover:scale-110`
                  }
                `}>
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : ''}`} />
                </div>
                
                {/* Label */}
                <span className={`
                  relative z-10 font-semibold text-sm transition-colors
                  ${isActive 
                    ? 'text-white' 
                    : 'text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white'
                  }
                `}>
                  {item.label}
                </span>

                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId={isMobile ? "mobile-active-indicator" : "desktop-active-indicator"}
                    className="absolute right-2 w-1.5 h-1.5 rounded-full bg-white"
                  />
                )}
              </motion.div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}