import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Wallet, TrendingUp, PiggyBank, CreditCard, AlertCircle } from 'lucide-react';

export default function NetWorthCard({
  accounts = [],
  investments = [],
  formatCurrency
}) {
  // Simple: balance > 0 = asset, balance < 0 = debt
  const totalAssets = accounts.reduce((sum, a) => sum + Math.max(a.balance || 0, 0), 0);
  const totalDebts = accounts.reduce((sum, a) => sum + Math.abs(Math.min(a.balance || 0, 0)), 0);

  // Count for display
  const assetAccounts = accounts.filter(a => (a.balance || 0) > 0);
  const debtAccounts = accounts.filter(a => (a.balance || 0) < 0);

  const investmentValue = investments.reduce((sum, inv) =>
    sum + (inv.quantity * (inv.current_price || inv.purchase_price || 0)), 0
  );

  const netWorth = totalAssets + investmentValue - totalDebts;
  const isNegative = netWorth < 0;

  if (accounts.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 }}
      className="mb-6"
    >
      <div className="rounded-2xl border border-black/10 bg-white shadow-sm p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 rounded-md bg-emerald-500/15 flex items-center justify-center">
            <PiggyBank className="w-3 h-3 text-emerald-600" />
          </div>
          <span className="text-black/50 text-xs uppercase tracking-widest font-medium">
            Чистый капитал (Net Worth)
          </span>
        </div>

        {/* Net Worth Value */}
        <div className="mb-5">
          <h3 className={`text-3xl sm:text-4xl font-bold tracking-tight ${isNegative ? 'text-rose-600' : 'text-emerald-600'}`}>
            {formatCurrency(netWorth)}
          </h3>
          {isNegative && (
            <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span className="text-sm text-rose-600">
                Долги превышают активы на {formatCurrency(Math.abs(netWorth))}
              </span>
            </div>
          )}
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Link to={createPageUrl('Accounts')}>
            <div className="rounded-xl border border-black/10 bg-black/[0.02] p-3.5 hover:bg-black/[0.04] transition-all cursor-pointer">
              <div className="flex items-center gap-2 mb-1.5">
                <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-black/45 text-xs">Активы</span>
              </div>
              <p className="text-emerald-600 font-bold text-lg">{formatCurrency(totalAssets)}</p>
              <p className="text-black/35 text-xs mt-0.5">{assetAccounts.length} счетов</p>
            </div>
          </Link>

          <Link to={createPageUrl('Investments')}>
            <div className="rounded-xl border border-black/10 bg-black/[0.02] p-3.5 hover:bg-black/[0.04] transition-all cursor-pointer">
              <div className="flex items-center gap-2 mb-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-cyan-600" />
                <span className="text-black/45 text-xs">Инвестиции</span>
              </div>
              <p className="text-cyan-600 font-bold text-lg">{formatCurrency(investmentValue)}</p>
              <p className="text-black/35 text-xs mt-0.5">{investments.length} активов</p>
            </div>
          </Link>

          {totalDebts > 0 ? (
            <Link to={createPageUrl('DebtAnalytics')}>
              <div className="rounded-xl border border-black/10 bg-black/[0.02] p-3.5 hover:bg-black/[0.04] transition-all cursor-pointer">
                <div className="flex items-center gap-2 mb-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-rose-600" />
                  <span className="text-black/45 text-xs">Долги</span>
                </div>
                <p className="text-rose-600 font-bold text-lg">{formatCurrency(-totalDebts)}</p>
                <p className="text-black/35 text-xs mt-0.5">{debtAccounts.length} счетов</p>
              </div>
            </Link>
          ) : (
            <div className="rounded-xl border border-black/10 bg-black/[0.02] p-3.5">
              <div className="flex items-center gap-2 mb-1.5">
                <CreditCard className="w-3.5 h-3.5 text-black/30" />
                <span className="text-black/45 text-xs">Долги</span>
              </div>
              <p className="text-black/30 font-bold text-lg">{formatCurrency(0)}</p>
              <p className="text-black/30 text-xs mt-0.5">Нет долгов</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}