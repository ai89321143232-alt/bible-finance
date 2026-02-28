import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import NavigationMenu from '@/components/Navigation/NavigationMenu';
import { base44 } from '@/api/base44Client';

export default function Layout({ children, currentPageName }) {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [themePreference, setThemePreference] = useState(null);

  useEffect(() => {
    base44.auth.me().then(user => {
      setThemePreference(user?.theme_preference || null);
    }).catch(() => {});
  }, [currentPageName]);

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      <style>{`
        :root {
          --background: 222 47% 7%;
          --foreground: 210 40% 98%;
          --card: 222 40% 10%;
          --card-foreground: 210 40% 98%;
          --border: 220 20% 16%;
          --input: 220 20% 16%;
          --primary: 210 40% 98%;
          --primary-foreground: 222 47% 7%;
          --muted: 217 33% 14%;
          --muted-foreground: 215 20% 55%;
          --accent: 217 33% 14%;
          --accent-foreground: 210 40% 98%;
          --ring: 215 20% 55%;
        }
      `}</style>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 bg-[#0a0d13] border-r border-white/5 z-40 overflow-y-auto">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-white/5">
          <Link to={createPageUrl('Dashboard')} className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <span className="text-black font-bold text-sm">F</span>
            </div>
            <span className="text-white font-semibold tracking-tight text-base">FinanceApp</span>
          </Link>
        </div>

        {/* Navigation */}
        <NavigationMenu
          currentPageName={currentPageName}
          onNavigate={() => {}}
          isMobile={false}
        />

        {/* Footer */}
        <div className="p-4 mt-auto border-t border-white/5">
          <Link to={createPageUrl('Settings')}>
            <div className="rounded-lg border border-white/8 bg-white/3 p-3.5 hover:bg-white/6 transition-colors cursor-pointer">
              <p className="text-xs font-semibold text-white">Premium</p>
              <p className="text-xs text-white/40 mt-0.5">AI-ассистент и аналитика</p>
              <div className="mt-3 py-1.5 px-3 rounded-md bg-white text-black text-xs font-semibold text-center">
                Улучшить
              </div>
            </div>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64">
        {children}
      </main>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setShowMobileMenu(!showMobileMenu)}
        className="lg:hidden fixed top-5 left-5 w-10 h-10 bg-[#1a1f2e] border border-white/10 text-white rounded-lg flex items-center justify-center z-50"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {showMobileMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileMenu(false)}
              className="lg:hidden fixed inset-0 bg-black/70 z-40"
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'tween', duration: 0.2 }}
              className="lg:hidden fixed left-0 top-0 h-full w-72 bg-[#0a0d13] border-r border-white/5 shadow-2xl z-50 overflow-y-auto"
            >
              <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center">
                    <span className="text-black font-bold text-xs">F</span>
                  </div>
                  <span className="text-white font-semibold text-sm">FinanceApp</span>
                </div>
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className="w-7 h-7 rounded-md bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </div>

              <NavigationMenu
                currentPageName={currentPageName}
                onNavigate={() => setShowMobileMenu(false)}
                isMobile={true}
              />

              <div className="p-4 mt-auto border-t border-white/5">
                <Link to={createPageUrl('Settings')} onClick={() => setShowMobileMenu(false)}>
                  <div className="rounded-lg border border-white/8 bg-white/3 p-3 hover:bg-white/6 transition-colors cursor-pointer">
                    <p className="text-xs font-semibold text-white">Premium</p>
                    <p className="text-xs text-white/40 mt-0.5">AI-ассистент и аналитика</p>
                    <div className="mt-2 py-1.5 px-3 rounded-md bg-white text-black text-xs font-semibold text-center">
                      Улучшить
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