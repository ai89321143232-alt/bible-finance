import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Dashboard from '@/pages/Dashboard';
import Transactions from '@/pages/Transactions';
import Goals from '@/pages/Goals';
import Budgets from '@/pages/Budgets';
import Settings from '@/pages/Settings';
import BottomTabBar, { BOTTOM_TABS } from '@/components/BottomTabBar';

// ============================================================
// components/MobileTabShell.jsx — MOBILE TAB CONTAINER
// ============================================================
// Renders all four main tab pages simultaneously and uses
// CSS display to show/hide them, preserving scroll position
// and component state when switching tabs.
//
// Tab switching is driven by react-router-dom (useNavigate/useLocation)
// so the URL, browser history and the native Android hardware back
// button all stay in sync — no manual pushState/hash manipulation.
// ============================================================
const TABS = BOTTOM_TABS.map((tab, index) => ({
  ...tab,
  component: [Dashboard, Transactions, Goals, Budgets, Settings][index],
}));

const getTabIndexForPath = (pathname) => {
  const index = TABS.findIndex(t => t.path === pathname);
  return index >= 0 ? index : 0;
};

export default function MobileTabShell({ initialTab = 0 }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(initialTab);

  // Keep activeTab in sync with the URL — including native back/forward navigation.
  useEffect(() => {
    setActiveTab(getTabIndexForPath(location.pathname));
  }, [location.pathname]);

  const switchTab = useCallback((index) => {
    navigate(TABS[index].path);
  }, [navigate]);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Tab Content — all pages mounted, only active is visible */}
      <div className="flex-1 pb-24">
        {TABS.map((tab, index) => {
          const PageComponent = tab.component;
          return (
            <div
              key={tab.label}
              style={{
                display: activeTab === index ? 'block' : 'none',
                minHeight: '100vh',
              }}
            >
              <PageComponent />
            </div>
          );
        })}
      </div>

      {/* Bottom Tab Bar — floating, shared across all pages */}
      <BottomTabBar activeIndex={activeTab} onTabClick={(index) => switchTab(index)} />
    </div>
  );
}