// ============================================================
// services/index.js — ТОЧКА ВХОДА В DATA ACCESS LAYER
// ============================================================
// Компоненты импортируют сервисы отсюда. Прямые обращения к
// base44.entities.* из компонентов запрещены — только через сервисы.
// ============================================================

export { TransactionService } from './TransactionService';
export { AccountService } from './AccountService';
export { BudgetService } from './BudgetService';
export { GoalService } from './GoalService';
export { InvestmentService } from './InvestmentService';
export * from './context';