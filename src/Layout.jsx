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
      {/* Desktop Header */}
      <header className="hidden lg:block fixed top-0 left-0 right-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-40">
        <div className="px-6 py-4 flex items-center justify-between">
          <Link to={createPageUrl('Dashboard')} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white">
              FinanceApp
            </span>
          </Link>
          <Link to={createPageUrl('Settings')}>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-medium hover:from-violet-700 hover:to-indigo-700 transition-all">
              <Settings className="w-4 h-4" />
              Настройки
            </button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="lg:pt-20 pb-20 lg:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <NavigationMenu 
        currentPageName={currentPageName}
        onNavigate={() => setShowMobileMenu(false)}
      />

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