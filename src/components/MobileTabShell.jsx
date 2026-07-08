import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, Target, Settings as SettingsIcon, Wallet } from 'lucide-react';
import Dashboard from '@/pages/Dashboard';
import Transactions from '@/pages/Transactions';
import Goals from '@/pages/Goals';
import Budgets from '@/pages/Budgets';
import Settings from '@/pages/Settings';

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
const TABS = [
  { label: 'Главная', path: '/', icon: LayoutDashboard, component: Dashboard },
  { label: 'Операции', path: '/Transactions', icon: ArrowLeftRight, component: Transactions },
  { label: 'Цели', path: '/Goals', icon: Target, component: Goals },
  { label: 'Бюджеты', path: '/Budgets', icon: Wallet, component: Budgets },
  { label: 'Ещё', path: '/Settings', icon: SettingsIcon, component: Settings },
];

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

      {/* Bottom Tab Bar — floating */}
      <div
        className="fixed left-4 right-4 z-40"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <div
          className="flex items-center justify-around py-2 px-1 rounded-2xl"
          style={{
            background: 'rgba(10, 13, 19, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          {TABS.map((tab, index) => {
            const Icon = tab.icon;
            const isActive = activeTab === index;
            return (
              <button
                key={tab.label}
                onClick={() => switchTab(index)}
                className="flex flex-col items-center gap-1 px-2 py-1 rounded-xl transition-all duration-200 flex-1"
                style={isActive ? {
                  background: 'rgba(255,255,255,0.1)',
                } : {}}
              >
                <Icon className={`w-5 h-5 transition-all duration-200 ${isActive ? 'text-white scale-110' : 'text-white/40'}`} />
                <span className={`text-[10px] font-medium transition-all duration-200 ${isActive ? 'text-white' : 'text-white/40'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}