import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Wallet, TrendingUp, TrendingDown, PiggyBank, CreditCard, AlertCircle } from 'lucide-react';

export default function NetWorthCard({
  accounts = [],
  investments = [],
  formatCurrency
}) {
  // Split accounts into assets (positive/zero) and debts (negative)
  const assetAccounts = accounts.filter(a => (a.balance || 0) >= 0 && a.type !== 'credit');
  const debtAccounts = accounts.filter(a => (a.balance || 0) < 0 || a.type === 'credit');
  
  const totalAssets = assetAccounts.reduce((sum, a) => sum + Math.max(a.balance || 0, 0), 0);
  const totalDebts = debtAccounts.reduce((sum, a) => sum + Math.abs(Math.min(a.balance || 0, 0)), 0);
  // For credit accounts with positive balance (overpaid), treat as asset
  const creditPositive = debtAccounts.reduce((sum, a) => sum + Math.max(a.balance || 0, 0), 0);
  const creditNegative = debtAccounts.reduce((sum, a) => sum + Math.abs(Math.min(a.balance || 0, 0)), 0);
  
  totalAssets += creditPositive;
  
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
      <div className="relative rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 via-violet-600/5 to-rose-600/10" />
        <div className="absolute inset-0 bg-[#141820]/85 backdrop-blur-sm" />
        
        <div className="relative border border-white/8 rounded-2xl p-5 sm:p-6">
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 rounded-md bg-emerald-500/20 flex items-center justify-center">
              <PiggyBank className="w-3 h-3 text-emerald-400" />
            </div>
            <span className="text-white/40 text-xs uppercase tracking-widest font-medium">
              Чистый капитал (Net Worth)
            </span>
          </div>

          {/* Net Worth Value */}
          <div className="mb-5">
            <h3 className={`text-3xl sm:text-4xl font-bold tracking-tight ${isNegative ? 'text-rose-400' : 'text-emerald-400'}`}>
              {formatCurrency(netWorth)}
            </h3>
            {isNegative && (
              <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span className="text-sm text-rose-300">
                  Долги превышают активы на {formatCurrency(Math.abs(netWorth))}
                </span>
              </div>
            )}
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Link to={createPageUrl('Accounts')}>
              <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-3.5 hover:bg-emerald-500/10 transition-all cursor-pointer">
                <div className="flex items-center gap-2 mb-1.5">
                  <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-white/35 text-xs">Активы</span>
                </div>
                <p className="text-emerald-400 font-bold text-lg">{formatCurrency(totalAssets)}</p>
                <p className="text-white/25 text-xs mt-0.5">{assetAccounts.length} счетов</p>
              </div>
            </Link>

            <Link to={createPageUrl('Investments')}>
              <div className="rounded-xl border border-cyan-500/10 bg-cyan-500/5 p-3.5 hover:bg-cyan-500/10 transition-all cursor-pointer">
                <div className="flex items-center gap-2 mb-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-white/35 text-xs">Инвестиции</span>
                </div>
                <p className="text-cyan-400 font-bold text-lg">{formatCurrency(investmentValue)}</p>
                <p className="text-white/25 text-xs mt-0.5">{investments.length} активов</p>
              </div>
            </Link>

            {totalDebts > 0 ? (
              <Link to={createPageUrl('Accounts')}>
                <div className="rounded-xl border border-rose-500/10 bg-rose-500/5 p-3.5 hover:bg-rose-500/10 transition-all cursor-pointer">
                  <div className="flex items-center gap-2 mb-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-white/35 text-xs">Долги</span>
                  </div>
                  <p className="text-rose-400 font-bold text-lg">{formatCurrency(-totalDebts)}</p>
                  <p className="text-white/25 text-xs mt-0.5">{debtAccounts.length} счетов</p>
                </div>
              </Link>
            ) : (
              <div className="rounded-xl border border-white/5 bg-white/3 p-3.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-white/25" />
                  <span className="text-white/35 text-xs">Долги</span>
                </div>
                <p className="text-white/25 font-bold text-lg">{formatCurrency(0)}</p>
                <p className="text-white/20 text-xs mt-0.5">Нет долгов</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}