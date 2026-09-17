import React from 'react';
import { Eye, EyeOff, Plus } from 'lucide-react';

export default function DashboardHero({ balance, income, expenses, showBalance, onToggleBalance, onAdd }) {
  const value = showBalance ? balance : '••••••';
  return (
    <section className="ds-hero">
      <div className="ds-hero-top"><span className="ds-hero-label">Мои финансы</span><button onClick={onToggleBalance} className="ds-quick" aria-label="Показать баланс">{showBalance ? <Eye /> : <EyeOff />}</button></div>
      <div className="ds-balance">{value}</div>
      <div className="ds-flow"><div className="ds-income">Доходы<b>{showBalance ? income : '••••'}</b></div><div className="ds-expense">Расходы<b>{showBalance ? expenses : '••••'}</b></div><button onClick={onAdd} className="ds-add" aria-label="Добавить операцию"><Plus /></button></div>
    </section>
  );
}