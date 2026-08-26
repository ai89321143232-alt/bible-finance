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
import BottomTabBar from '@/components/BottomTabBar';
import { useBottomTabs } from '@/components/bottomTabsConfig';
import { useIsMobile } from '@/hooks/use-mobile';
import { base44 } from '@/api/base44Client';
import OfflineBanner from '@/components/OfflineBanner';
import { useWorkspaceProvision } from '@/components/workspace/WorkspaceContext';
import { eventBus, EVENTS } from '@/lib/eventBus';
import { useTranslation } from '@/lib/LanguageContext';

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
  const bottomTabs = useBottomTabs();
  const tabPages = bottomTabs.filter((t) => !t.isCenter).map((t) => t.page);
  const isTabPage = tabPages.includes(currentPageName);
  const navigate = useNavigate();
  const t = useTranslation();

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
    <div className="min-h-screen bg-background/40 dark:bg-background/40 text-foreground relative">
      <div className="relative z-10">
      <OfflineBanner />

      {/* Desktop Sidebar */}
      <aside className="glass-bar hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 bg-background border-r border-border z-40 overflow-y-auto">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-border">
          <Link to={createPageUrl('Dashboard')} className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">F</span>
            </div>
            <span className="text-foreground font-semibold tracking-tight text-base">{t('app.name')}</span>
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

      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 pt-[calc(4rem+env(safe-area-inset-top,0px))] lg:pt-0">
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
      <div className="glass-bar lg:hidden fixed top-0 left-0 right-0 bg-background border-b border-border z-40 flex items-center px-5 gap-3"
        style={{ height: 'calc(4rem + env(safe-area-inset-top, 0px))', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        {currentPageName !== 'Dashboard' && (
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 bg-muted border border-border text-foreground rounded-lg flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="w-9 h-9 bg-muted border border-border text-foreground rounded-lg flex items-center justify-center">
          
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xs">F</span>
          </div>
          <span className="text-foreground font-semibold text-sm">{t('app.name')}</span>
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
            className="glass-bar lg:hidden fixed left-0 top-0 h-full w-72 bg-background border-r border-border shadow-2xl z-50 overflow-y-auto">
            
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-xs">F</span>
                  </div>
                  <span className="text-foreground font-semibold text-sm">{t('app.name')}</span>
                </div>
                <button
                onClick={() => setShowMobileMenu(false)}
                className="w-7 h-7 rounded-md bg-muted flex items-center justify-center hover:bg-accent transition-colors">
                
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <NavigationMenu
              currentPageName={currentPageName}
              onNavigate={() => setShowMobileMenu(false)}
              isMobile={true}
              isChildMode={themePreference === 'child'} />
            </motion.div>
          </>
        }
      </AnimatePresence>

      {/* Mobile Bottom Tab Bar — only on non-tab pages, same look as main screen (desktop never shows) */}
      {isMobile && !isTabPage && (
        <BottomTabBar
          activeIndex={bottomTabs.findIndex((t) => t.page === currentPageName)}
          onTabClick={(index, path) => navigate(path)}
        />
      )}
      </div>
    </div>);

}