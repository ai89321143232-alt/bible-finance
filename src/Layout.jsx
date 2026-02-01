import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, ArrowLeftRight, Wallet, Target, 
  TrendingUp, Sparkles, ListTodo, PieChart, Settings, 
  CreditCard, Tag, Users, Database
} from 'lucide-react';
const NAV_ITEMS = [
  { name: 'Dashboard', icon: LayoutDashboard, label: 'Главная' },
  { name: 'Transactions', icon: ArrowLeftRight, label: 'Операции' },
  { name: 'Accounts', icon: CreditCard, label: 'Счета' },
  { name: 'Budgets', icon: Wallet, label: 'Бюджеты' },
  { name: 'Goals', icon: Target, label: 'Цели' },
  { name: 'Investments', icon: TrendingUp, label: 'Инвестиции' },
  { name: 'Tasks', icon: ListTodo, label: 'Задачи' },
  { name: 'Analytics', icon: PieChart, label: 'Аналитика' },
  { name: 'AIAssistant', icon: Sparkles, label: 'AI' },
  { name: 'FamilyFinances', icon: Users, label: 'Финансы семьи' },
  { name: 'Settings', icon: Settings, label: 'Настройки' },
];

export default function Layout({ children, currentPageName }) {
  const isActive = (name) => currentPageName === name;

  return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-40">
        {/* Logo */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <Link to={createPageUrl('Dashboard')} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white">
              FinanceApp
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.name}>
                <Link
                  to={createPageUrl(item.name)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive(item.name)
                      ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${
                    isActive(item.name) ? 'text-violet-600 dark:text-violet-400' : ''
                  }`} />
                  <span className="font-medium">{item.label}</span>
                  {item.name === 'AIAssistant' && (
                    <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-full">
                      AI
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <div className="p-4 rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20">
            <p className="text-sm font-medium text-violet-900 dark:text-violet-200">
              Разблокируйте Premium
            </p>
            <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">
              AI-ассистент и расширенная аналитика
            </p>
            <Link to={createPageUrl('Settings')}>
              <button className="mt-3 w-full py-2 px-4 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-medium hover:from-violet-700 hover:to-indigo-700 transition-all">
                Улучшить план
              </button>
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-40 safe-area-pb">
        <div className="flex justify-around items-center py-2 px-1">
          {NAV_ITEMS.slice(0, 5).map((item) => (
            <Link
              key={item.name}
              to={createPageUrl(item.name)}
              className={`flex flex-col items-center py-2 px-3 rounded-xl transition-all ${
                isActive(item.name)
                  ? 'text-violet-600 dark:text-violet-400'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <item.icon className={`w-5 h-5 ${
                isActive(item.name) ? 'text-violet-600' : ''
              }`} />
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </Link>
          ))}
          <Link
            to={createPageUrl('Settings')}
            className={`flex flex-col items-center py-2 px-3 rounded-xl transition-all ${
              isActive('Settings') || isActive('Analytics') || isActive('Tasks') || 
              isActive('AIAssistant') || isActive('Investments')
                ? 'text-violet-600 dark:text-violet-400'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-xs mt-1 font-medium">Ещё</span>
          </Link>
        </div>
      </nav>

      {/* Styles for safe area on iOS */}
      <style>{`
        .safe-area-pb {
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
        @supports (padding-bottom: env(safe-area-inset-bottom)) {
          .safe-area-pb {
            padding-bottom: calc(env(safe-area-inset-bottom) + 8px);
            }
            }
            `}</style>
            </div>
            );
            }