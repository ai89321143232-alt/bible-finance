import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Transactions = lazy(() => import('@/pages/Transactions'));
const Accounts = lazy(() => import('@/pages/Accounts'));
const Goals = lazy(() => import('@/pages/Goals'));
const Budgets = lazy(() => import('@/pages/Budgets'));
const Analytics = lazy(() => import('@/pages/Analytics'));
const Settings = lazy(() => import('@/pages/Settings'));
import BottomTabBar from '@/components/BottomTabBar';
import { useBottomTabs } from '@/components/bottomTabsConfig';

// ============================================================
// components/MobileTabShell.jsx — MOBILE TAB CONTAINER
// ============================================================
// Loads a tab page only on its first visit, then keeps it mounted.
// CSS display preserves scroll position and component state when switching tabs.
//
// Tab configuration comes from useBottomTabs() — user can
// customize order and which tabs are shown in Personalization.
// ============================================================

const PAGE_COMPONENT_MAP = {
  Dashboard: Dashboard,
  Transactions: Transactions,
  Accounts: Accounts,
  Goals: Goals,
  Budgets: Budgets,
  Analytics: Analytics,
  Settings: Settings,
};

export default function MobileTabShell({ initialTab = 0 }) {
  const navigate = useNavigate();
  const location = useLocation();
  const allTabs = useBottomTabs();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [activatedTabs, setActivatedTabs] = useState(() => new Set([initialTab]));

  // Active indexes must match BottomTabBar, including the center tab.
  const tabs = allTabs;

  // Keep activeTab in sync with the URL
  useEffect(() => {
    const index = tabs.findIndex((t) => t.path === location.pathname);
    const nextTab = index >= 0 ? index : 0;
    setActiveTab(nextTab);
    setActivatedTabs((previous) => new Set([...previous, nextTab]));
  }, [location.pathname]);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Tab Content — all pages mounted, only active is visible */}
      <div className="flex-1 pb-24">
        {tabs.map((tab, index) => {
          if (tab.isCenter) return null;
          const PageComponent = PAGE_COMPONENT_MAP[tab.page];
          if (!PageComponent || !activatedTabs.has(index)) return null;
          return (
            <div
              key={tab.page}
              style={{
                display: activeTab === index ? 'block' : 'none',
                minHeight: '100vh',
              }}
            >
              <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center text-sm text-muted-foreground">Загрузка…</div>}><PageComponent /></Suspense>
            </div>
          );
        })}
      </div>

      {/* Bottom Tab Bar — floating, shared across all pages */}
      <BottomTabBar activeIndex={activeTab} onTabClick={(index, path) => {
        if (index === activeTab) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        navigate(path);
      }} />
    </div>
  );
}