import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Wallet, Settings } from 'lucide-react';
import NavigationMenu from '@/components/Navigation/NavigationMenu';

export default function Layout({ children, currentPageName }) {
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-40 overflow-y-auto">
        {/* Logo */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900">
          <Link to={createPageUrl('Dashboard')} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white">
              FinanceApp
            </span>
          </Link>
        </div>

        {/* Navigation Menu */}
        <NavigationMenu 
          currentPageName={currentPageName}
          onNavigate={() => {}}
        />

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 mt-auto sticky bottom-0 bg-white dark:bg-slate-900">
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

      {/* Mobile Menu Button & Navigation */}
      <button
        onClick={() => setShowMobileMenu(!showMobileMenu)}
        className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg z-40"
      >
        ☰
      </button>

      {showMobileMenu && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setShowMobileMenu(false)}>
          <div className="absolute bottom-20 right-6 bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-80 max-h-[60vh] overflow-y-auto">
            <NavigationMenu 
              currentPageName={currentPageName}
              onNavigate={() => setShowMobileMenu(false)}
            />
          </div>
        </div>
      )}

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