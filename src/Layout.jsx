import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ArrowLeft, LayoutDashboard, ArrowLeftRight, Target, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import NavigationMenu from '@/components/Navigation/NavigationMenu';
import NotificationBell from '@/components/NotificationBell';
import ThemeIconToggle from '@/components/ThemeIconToggle';
import MobileTabShell from '@/components/MobileTabShell';
import { useIsMobile } from '@/hooks/use-mobile';
import { base44 } from '@/api/base44Client';
import OfflineBanner from '@/components/OfflineBanner';
import { useWorkspaceProvision } from '@/components/workspace/WorkspaceContext';
import { eventBus, EVENTS } from '@/lib/eventBus';

// ============================================================
// Layout.jsx — ОСНОВНОЙ МАКЕТ ПРИЛОЖЕНИЯ
// ============================================================
// Оборачивает ВСЕ страницы (через LayoutWrapper в App.jsx).
// Props:
//   children        → содержимое текущей страницы
//   currentPageName → имя текущей страницы для подсветки активного пункта меню
//
// СТРУКТУРА:
//   Desktop (lg+):
//     aside.sidebar  → NavigationMenu (components/Navigation/NavigationMenu)
//     main           → children (страница)
//
//   Mobile:
//     div.topbar     → кнопка "назад" (navigate(-1)), кнопка "меню", лого
//     AnimatePresence → боковое меню (slide-in) с поддержкой свайпа для закрытия
//
// ДЕТСКИЙ РЕЖИМ:
//   Если user.theme_preference === 'child' → скрывает пункты меню с hideInChildMode: true
//   Список пунктов: components/Navigation/NavigationMenu.jsx
//
// СВАЙП НА МОБИЛЬНОМ:
//   framer-motion drag на боковом меню → закрывается при offset.x < -80 или velocity.x < -300
// ============================================================
export default function Layout({ children, currentPageName }) {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [themePreference, setThemePreference] = useState(null);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(null);
  const isMobile = useIsMobile();
  const isTabPage = ['Dashboard', 'Transactions', 'Goals', 'Budgets', 'Settings'].includes(currentPageName);
  const navigate = useNavigate();

  // Этап 1 Workspace-миграции: единожды на пользователя создаёт Personal/Family
  // Workspace и проставляет workspace_id существующим записям. Прозрачно для UI.
  useWorkspaceProvision();

  useEffect(() => {
    base44.auth.me().then((user) => {
      setThemePreference(user?.theme_preference || null);
      setBackgroundImageUrl(user?.background_image_url || null);
    }).catch(() => {});
  }, [currentPageName]);

  useEffect(() => {
    const off = eventBus.on(EVENTS.BACKGROUND_CHANGED, ({ url }) => {
      setBackgroundImageUrl(url || null);
    });
    return off;
  }, []);

  return (
    <div
      className="min-h-screen bg-[#0f1117] text-white"
      style={backgroundImageUrl ? {
        backgroundImage: `linear-gradient(rgba(15,17,23,0.55), rgba(15,17,23,0.55)), url(${backgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      } : undefined}
    >
      <OfflineBanner />
      <style>{`
        .dark {
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
            <span className="text-white font-semibold tracking-tight text-base">Библия Финансов</span>
          </Link>
        </div>

        {/* Navigation */}
        <NavigationMenu
          currentPageName={currentPageName}
          onNavigate={() => {}}
          isMobile={false}
          isChildMode={themePreference === 'child'} />
        

        {/* Notification Bell + Theme Toggle (desktop) */}
        <div className="px-4 pb-2 flex justify-end gap-2">
          <ThemeIconToggle />
          <NotificationBell />
        </div>

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
      <main className="lg:ml-64 pt-16 lg:pt-0">
        {isMobile && isTabPage ? (
          <MobileTabShell initialTab={
            currentPageName === 'Dashboard' ? 0 :
            currentPageName === 'Transactions' ? 1 :
            currentPageName === 'Goals' ? 2 :
            currentPageName === 'Budgets' ? 3 : 4
          } />
        ) : (
          children
        )}
      </main>

      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#0a0d13] border-b border-white/5 z-40 flex items-center px-5 gap-3"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        {currentPageName !== 'Dashboard' && (
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 bg-white/5 border border-white/10 text-white rounded-lg flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="w-9 h-9 bg-white/5 border border-white/10 text-white rounded-lg flex items-center justify-center">
          
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center">
            <span className="text-black font-bold text-xs">F</span>
          </div>
          <span className="text-white font-semibold text-sm">FinanceApp</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ThemeIconToggle />
          <NotificationBell />
        </div>
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {showMobileMenu &&
        <>
            <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowMobileMenu(false)}
            className="lg:hidden fixed inset-0 bg-black/70 z-40" />
          
            <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'tween', duration: 0.2 }}
            drag="x"
            dragConstraints={{ right: 0 }}
            dragElastic={0.1}
            onDragEnd={(event, info) => {
              if (info.offset.x < -80 || info.velocity.x < -300) {
                setShowMobileMenu(false);
              }
            }}
            className="lg:hidden fixed left-0 top-0 h-full w-72 bg-[#0a0d13] border-r border-white/5 shadow-2xl z-50 overflow-y-auto">
            
              <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center">
                    <span className="text-black font-bold text-xs">F</span>
                  </div>
                  <span className="text-white font-semibold text-sm">FinanceApp</span>
                </div>
                <button
                onClick={() => setShowMobileMenu(false)}
                className="w-7 h-7 rounded-md bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </div>

              <NavigationMenu
              currentPageName={currentPageName}
              onNavigate={() => setShowMobileMenu(false)}
              isMobile={true}
              isChildMode={themePreference === 'child'} />
            

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
        }
      </AnimatePresence>

      {/* Mobile Bottom Tab Bar — only on non-tab pages (desktop never shows) */}
      {isMobile && !isTabPage && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0a0d13] border-t border-white/8 z-40"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div className="flex items-center justify-around py-2">
            <Link to={createPageUrl('Dashboard')} className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-lg transition-colors ${currentPageName === 'Dashboard' ? 'text-white' : 'text-white/40 hover:text-white/70'}`}>
              <LayoutDashboard className="w-5 h-5" />
              <span className="text-[10px] font-medium">Главная</span>
            </Link>
            <Link to={createPageUrl('Transactions')} className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-lg transition-colors ${currentPageName === 'Transactions' ? 'text-white' : 'text-white/40 hover:text-white/70'}`}>
              <ArrowLeftRight className="w-5 h-5" />
              <span className="text-[10px] font-medium">Операции</span>
            </Link>
            <Link to={createPageUrl('Goals')} className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-lg transition-colors ${currentPageName === 'Goals' ? 'text-white' : 'text-white/40 hover:text-white/70'}`}>
              <Target className="w-5 h-5" />
              <span className="text-[10px] font-medium">Цели</span>
            </Link>
            <Link to={createPageUrl('Settings')} className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-lg transition-colors ${currentPageName === 'Settings' ? 'text-white' : 'text-white/40 hover:text-white/70'}`}>
              <Settings className="w-5 h-5" />
              <span className="text-[10px] font-medium">Ещё</span>
            </Link>
          </div>
        </div>
      )}
    </div>);

}