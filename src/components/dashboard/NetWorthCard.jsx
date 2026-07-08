import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Wallet, TrendingUp, PiggyBank, CreditCard, AlertCircle, Plus, Home, Car, Gem, Box } from 'lucide-react';
import AddFixedAssetModal from './AddFixedAssetModal';

const FIXED_ASSET_ICONS = { real_estate: Home, auto: Car, gold: Gem, other: Box };

export default function NetWorthCard({
  accounts = [],
  investments = [],
  fixedAssets = [],
  formatCurrency,
  onFixedAssetAdded
}) {
  const [showAddAsset, setShowAddAsset] = useState(false);

  const totalAssets = accounts.reduce((sum, a) => sum + Math.max(a.balance || 0, 0), 0);
  const totalDebts = accounts.reduce((sum, a) => sum + Math.abs(Math.min(a.balance || 0, 0)), 0);

  const assetAccounts = accounts.filter(a => (a.balance || 0) > 0);
  const debtAccounts = accounts.filter(a => (a.balance || 0) < 0);

  const investmentValue = investments.reduce((sum, inv) =>
    sum + (inv.quantity * (inv.current_price || inv.purchase_price || 0)), 0
  );

  const fixedAssetsValue = fixedAssets.reduce((sum, fa) => sum + (fa.value || 0), 0);

  const netWorth = totalAssets + investmentValue + fixedAssetsValue - totalDebts;
  const isNegative = netWorth < 0;

  if (accounts.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 }}
      className="mb-6"
    >
      <div className="rounded-2xl border border-border bg-card shadow-sm p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 rounded-md bg-emerald-500/15 flex items-center justify-center">
            <PiggyBank className="w-3 h-3 text-emerald-500" />
          </div>
          <span className="text-muted-foreground text-xs uppercase tracking-widest font-medium">
            Чистый капитал (Net Worth)
          </span>
        </div>

        <div className="mb-5">
          <h3 className={`text-3xl sm:text-4xl font-bold tracking-tight ${isNegative ? 'text-rose-500' : 'text-emerald-500'}`}>
            {formatCurrency(netWorth)}
          </h3>
          {isNegative && (
            <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              <span className="text-sm text-rose-500">
                Долги превышают активы на {formatCurrency(Math.abs(netWorth))}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Link to={createPageUrl('Accounts')}>
            <div className="rounded-xl border border-border bg-muted/50 p-3.5 hover:bg-muted transition-all cursor-pointer">
              <div className="flex items-center gap-2 mb-1.5">
                <Wallet className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-muted-foreground text-xs">Активы</span>
              </div>
              <p className="text-emerald-500 font-bold text-lg">{formatCurrency(totalAssets)}</p>
              <p className="text-muted-foreground/70 text-xs mt-0.5">{assetAccounts.length} счетов</p>
            </div>
          </Link>

          <Link to={createPageUrl('Investments')}>
            <div className="rounded-xl border border-border bg-muted/50 p-3.5 hover:bg-muted transition-all cursor-pointer">
              <div className="flex items-center gap-2 mb-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-cyan-500" />
                <span className="text-muted-foreground text-xs">Инвестиции</span>
              </div>
              <p className="text-cyan-500 font-bold text-lg">{formatCurrency(investmentValue)}</p>
              <p className="text-muted-foreground/70 text-xs mt-0.5">{investments.length} активов</p>
            </div>
          </Link>

          {totalDebts > 0 ? (
            <Link to={createPageUrl('DebtAnalytics')}>
              <div className="rounded-xl border border-border bg-muted/50 p-3.5 hover:bg-muted transition-all cursor-pointer">
                <div className="flex items-center gap-2 mb-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-rose-500" />
                  <span className="text-muted-foreground text-xs">Долги</span>
                </div>
                <p className="text-rose-500 font-bold text-lg">{formatCurrency(-totalDebts)}</p>
                <p className="text-muted-foreground/70 text-xs mt-0.5">{debtAccounts.length} счетов</p>
              </div>
            </Link>
          ) : (
            <div className="rounded-xl border border-border bg-muted/50 p-3.5">
              <div className="flex items-center gap-2 mb-1.5">
                <CreditCard className="w-3.5 h-3.5 text-muted-foreground/50" />
                <span className="text-muted-foreground text-xs">Долги</span>
              </div>
              <p className="text-muted-foreground/50 font-bold text-lg">{formatCurrency(0)}</p>
              <p className="text-muted-foreground/50 text-xs mt-0.5">Нет долгов</p>
            </div>
          )}

          <button onClick={() => setShowAddAsset(true)} className="text-left">
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-3.5 hover:bg-muted transition-all cursor-pointer h-full">
              <div className="flex items-center gap-2 mb-1.5">
                <Plus className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-muted-foreground text-xs">Недвижимость, авто, золото</span>
              </div>
              <p className="text-amber-500 font-bold text-lg">{formatCurrency(fixedAssetsValue)}</p>
              <p className="text-muted-foreground/70 text-xs mt-0.5">{fixedAssets.length} активов · добавить</p>
            </div>
          </button>
        </div>

        {fixedAssets.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {fixedAssets.map((fa) => {
              const Icon = FIXED_ASSET_ICONS[fa.type] || Box;
              return (
                <div key={fa.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-foreground text-sm">{fa.name}</span>
                  </div>
                  <span className="text-foreground text-sm font-medium">{formatCurrency(fa.value)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AddFixedAssetModal
        open={showAddAsset}
        onClose={() => setShowAddAsset(false)}
        onSaved={() => onFixedAssetAdded && onFixedAssetAdded()}
      />
    </motion.div>
  );
}