/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import React from 'react';
const AIAdvisors = React.lazy(() => import('./pages/AIAdvisors'));
const AIAssistant = React.lazy(() => import('./pages/AIAssistant'));
const Accounts = React.lazy(() => import('./pages/Accounts'));
const Admin = React.lazy(() => import('./pages/Admin'));
const Analytics = React.lazy(() => import('./pages/Analytics'));
const Backup = React.lazy(() => import('./pages/Backup'));
const BackupReports = React.lazy(() => import('./pages/BackupReports'));
const Budgets = React.lazy(() => import('./pages/Budgets'));
const Categories = React.lazy(() => import('./pages/Categories'));
const ChildExpenses = React.lazy(() => import('./pages/ChildExpenses'));
const CleanupDuplicates = React.lazy(() => import('./pages/CleanupDuplicates'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Family = React.lazy(() => import('./pages/Family'));
const FamilyFinances = React.lazy(() => import('./pages/FamilyFinances'));
const FinancialPlanning = React.lazy(() => import('./pages/FinancialPlanning'));
const Goals = React.lazy(() => import('./pages/Goals'));
const Investments = React.lazy(() => import('./pages/Investments'));
const Notes = React.lazy(() => import('./pages/Notes'));
const Referral = React.lazy(() => import('./pages/Referral'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Subscription = React.lazy(() => import('./pages/Subscription'));
const Tasks = React.lazy(() => import('./pages/Tasks'));
const Transactions = React.lazy(() => import('./pages/Transactions'));
import __Layout from './Layout.jsx';


export const PAGES = {
    "AIAdvisors": AIAdvisors,
    "AIAssistant": AIAssistant,
    "Accounts": Accounts,
    "Admin": Admin,
    "Analytics": Analytics,
    "Backup": Backup,
    "BackupReports": BackupReports,
    "Budgets": Budgets,
    "Categories": Categories,
    "ChildExpenses": ChildExpenses,
    "CleanupDuplicates": CleanupDuplicates,
    "Dashboard": Dashboard,
    "Family": Family,
    "FamilyFinances": FamilyFinances,
    "FinancialPlanning": FinancialPlanning,
    "Goals": Goals,
    "Investments": Investments,
    "Notes": Notes,
    "Referral": Referral,
    "Settings": Settings,
    "Subscription": Subscription,
    "Tasks": Tasks,
    "Transactions": Transactions,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};