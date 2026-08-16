import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Dashboard from '@/pages/Dashboard';
import Transactions from '@/pages/Transactions';
import Accounts from '@/pages/Accounts';
import Goals from '@/pages/Goals';
import Budgets from '@/pages/Budgets';
import Analytics from '@/pages/Analytics';
import Settings from '@/pages/Settings';
import BottomTabBar from '@/components/BottomTabBar';
import { useBottomTabs } from '@/components/bottomTabsConfig';

// ============================================================
// components/MobileTabShell.jsx — MOBILE TAB CONTAINER
// ============================================================
// Renders all configured tab pages simultaneously and uses
// CSS display to show/hide them, preserving scroll position
// and component state when switching tabs.
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

  // Only regular tabs (non-center) are rendered as tab pages
  const tabs = allTabs.filter((tab) => !tab.isCenter);

  // Keep activeTab in sync with the URL
  useEffect(() => {
    const index = tabs.findIndex((t) => t.path === location.pathname);
    setActiveTab(index >= 0 ? index : 0);
  }, [location.pathname, tabs]);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Tab Content — all pages mounted, only active is visible */}
      <div className="flex-1 pb-24">
        {tabs.map((tab, index) => {
          const PageComponent = PAGE_COMPONENT_MAP[tab.page];
          if (!PageComponent) return null;
          return (
            <div
              key={tab.page}
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
      <BottomTabBar activeIndex={activeTab} onTabClick={(index, path) => {
        if (index === activeTab) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        navigate(path);
      }} />
    </div>
  );
}