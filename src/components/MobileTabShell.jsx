import React, { useState } from 'react';
import { LayoutDashboard, ArrowLeftRight, Target, Settings as SettingsIcon } from 'lucide-react';
import Dashboard from '@/pages/Dashboard';
import Transactions from '@/pages/Transactions';
import Goals from '@/pages/Goals';
import Settings from '@/pages/Settings';

// ============================================================
// components/MobileTabShell.jsx — MOBILE TAB CONTAINER
// ============================================================
// Renders all four main tab pages simultaneously and uses
// CSS display to show/hide them, preserving scroll position
// and component state when switching tabs.
//
// Keeps all tab pages mounted; only the active one is visible.
// The bottom tab bar is rendered inside this component.
// ============================================================
const TABS = [
  { label: 'Главная', icon: LayoutDashboard, component: Dashboard },
  { label: 'Операции', icon: ArrowLeftRight, component: Transactions },
  { label: 'Цели', icon: Target, component: Goals },
  { label: 'Ещё', icon: SettingsIcon, component: Settings },
];

export default function MobileTabShell({ initialTab = 0 }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Tab Content — all pages mounted, only active is visible */}
      <div className="flex-1">
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

      {/* Bottom Tab Bar */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-[#0a0d13] border-t border-white/8 z-40"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-around py-2">
          {TABS.map((tab, index) => {
            const Icon = tab.icon;
            const isActive = activeTab === index;
            return (
              <button
                key={tab.label}
                onClick={() => setActiveTab(index)}
                className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-lg transition-colors ${
                  isActive ? 'text-white' : 'text-white/40 hover:text-white/70'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}