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
import AIAssistant from './pages/AIAssistant';
import Accounts from './pages/Accounts';
import Admin from './pages/Admin';
import Analytics from './pages/Analytics';
import Backup from './pages/Backup';
import Budgets from './pages/Budgets';
import Categories from './pages/Categories';
import CleanupDuplicates from './pages/CleanupDuplicates';
import Dashboard from './pages/Dashboard';
import Family from './pages/Family';
import FamilyFinances from './pages/FamilyFinances';
import Goals from './pages/Goals';
import Investments from './pages/Investments';
import Settings from './pages/Settings';
import Subscription from './pages/Subscription';
import Tasks from './pages/Tasks';
import Transactions from './pages/Transactions';
import Referral from './pages/Referral';
import BackupReports from './pages/BackupReports';
import Notes from './pages/Notes';
import FinancialPlanning from './pages/FinancialPlanning';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AIAssistant": AIAssistant,
    "Accounts": Accounts,
    "Admin": Admin,
    "Analytics": Analytics,
    "Backup": Backup,
    "Budgets": Budgets,
    "Categories": Categories,
    "CleanupDuplicates": CleanupDuplicates,
    "Dashboard": Dashboard,
    "Family": Family,
    "FamilyFinances": FamilyFinances,
    "Goals": Goals,
    "Investments": Investments,
    "Settings": Settings,
    "Subscription": Subscription,
    "Tasks": Tasks,
    "Transactions": Transactions,
    "Referral": Referral,
    "BackupReports": BackupReports,
    "Notes": Notes,
    "FinancialPlanning": FinancialPlanning,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};