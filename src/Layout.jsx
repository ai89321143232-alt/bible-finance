import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Menu, X } from 'lucide-react';
import NavigationMenu from '@/components/Navigation/NavigationMenu';

export default function Layout({ children, currentPageName }) {
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-40 overflow-y-auto">
        {/* Logo */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <Link to={createPageUrl('Dashboard')} className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25 group-hover:shadow-violet-500/40 transition-all">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              FinanceApp
            </span>
          </Link>
        </div>

        {/* Navigation Menu */}
        <NavigationMenu 
          currentPageName={currentPageName}
          onNavigate={() => {}}
          isMobile={false}
        />

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 mt-auto sticky bottom-0 bg-white dark:bg-slate-900">
          <Link to={createPageUrl('Settings')}>
            <div className="p-4 rounded-xl bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 dark:from-violet-900/20 dark:via-purple-900/20 dark:to-indigo-900/20 cursor-pointer hover:shadow-lg transition-all group">
              <p className="text-sm font-semibold text-violet-900 dark:text-violet-200 group-hover:text-violet-700">
                ✨ Разблокируйте Premium
              </p>
              <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">
                AI-ассистент и расширенная аналитика
              </p>
              <div className="mt-3 w-full py-2 px-4 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-medium text-center hover:from-violet-700 hover:to-indigo-700 transition-all shadow-md">
                Улучшить план
              </div>
            </div>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-72">
        {children}
      </main>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setShowMobileMenu(!showMobileMenu)}
        className="lg:hidden fixed top-6 left-6 w-12 h-12 bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg z-50 transition-transform hover:scale-105"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Mobile Sidebar (выдвижная панель) */}
      <AnimatePresence>
        {showMobileMenu && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileMenu(false)}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />

            {/* Sidebar Panel */}
            <motion.div
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="lg:hidden fixed left-0 top-0 h-full w-80 bg-white dark:bg-slate-900 shadow-2xl z-50 overflow-y-auto"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 flex items-center justify-center shadow-lg">
                    <Wallet className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-lg font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                    FinanceApp
                  </span>
                </div>
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
              </div>

              {/* Navigation Menu */}
              <NavigationMenu 
                currentPageName={currentPageName}
                onNavigate={() => setShowMobileMenu(false)}
                isMobile={true}
              />

              {/* Footer */}
              <div className="p-6 border-t border-slate-200 dark:border-slate-800 mt-auto">
                <Link to={createPageUrl('Settings')} onClick={() => setShowMobileMenu(false)}>
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 dark:from-violet-900/20 dark:via-purple-900/20 dark:to-indigo-900/20 cursor-pointer">
                    <p className="text-sm font-semibold text-violet-900 dark:text-violet-200">
                      ✨ Разблокируйте Premium
                    </p>
                    <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">
                      AI-ассистент и расширенная аналитика
                    </p>
                    <div className="mt-3 w-full py-2 px-4 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-medium text-center shadow-md">
                      Улучшить план
                    </div>
                  </div>
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}