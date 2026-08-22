// ============================================================
// App.jsx — КОРНЕВОЙ КОМПОНЕНТ ПРИЛОЖЕНИЯ
// ============================================================
// Стек провайдеров (снаружи → внутрь):
//   AuthProvider       → авторизация (lib/AuthContext.jsx)
//   QueryClientProvider → кэш запросов (lib/query-client.js)
//   Router             → навигация (react-router-dom)
//   NavigationTracker  → отслеживает текущую страницу (lib/NavigationTracker.jsx)
//   AuthenticatedApp   → рендерит маршруты
//
// Маршруты берутся из pages.config.js (auto-generated).
// Главная страница задаётся полем mainPage в pages.config.js → сейчас "Dashboard".
// Каждая страница оборачивается в Layout (Layout.jsx) через LayoutWrapper.
//
// ⚠️ ВАЖНО: новые страницы нужно добавлять В pages.config.js И
//    отдельным <Route> в этом файле (loop из pagesConfig не подхватит их автоматически).
// ============================================================

import React, { Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'));
const PrivacyPolicy = React.lazy(() => import('./pages/PrivacyPolicy'));
const Onboarding = React.lazy(() => import('./pages/Onboarding'));
const HelpCenter = React.lazy(() => import('./pages/HelpCenter'));
const DebtAnalytics = React.lazy(() => import('./pages/DebtAnalytics'));
const DebtPlanner = React.lazy(() => import('./pages/DebtPlanner'));
const Education = React.lazy(() => import('./pages/Education'));
const EducationLesson = React.lazy(() => import('./pages/EducationLesson'));
const FamilyChat = React.lazy(() => import('./pages/FamilyChat'));
const Subscriptions = React.lazy(() => import('./pages/Subscriptions'));
import SplashScreen from './components/SplashScreen';
import PushNotificationManager from '@/components/PushNotificationManager';
import GlobalCacheSync from './components/GlobalCacheSync';
import BackgroundLayer from './components/BackgroundLayer';
import { useFontScale } from '@/hooks/useFontScale';
import { Toaster as SonnerToaster } from 'sonner';

// Достаём список страниц, компонент Layout и имя главной страницы
const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

// Оборачивает страницу в Layout (передаёт currentPageName для подсветки меню)
const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    if (user && user.onboarding_complete !== true && !window.location.pathname.includes('/Onboarding')) {
      navigate('/Onboarding');
    }
  }, [user]);

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
    <BackgroundLayer />
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
      >
    <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div></div>}>
    <Routes location={location}>
      {/* Auth routes — public */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* All app routes — protected */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        {/* Главная страница "/" → компонент Dashboard */}
        <Route path="/" element={
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        } />
        {/* Все остальные страницы из pages.config.js → "/<PageName>" */}
        {Object.entries(Pages).map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <LayoutWrapper currentPageName={path}>
                <Page />
              </LayoutWrapper>
            }
          />
        ))}
        {/* Онбординг — без Layout */}
        <Route path="/Onboarding" element={<Onboarding />} />
        {/* База знаний */}
        <Route path="/HelpCenter" element={<LayoutWrapper currentPageName="HelpCenter"><HelpCenter /></LayoutWrapper>} />
        {/* Анализ долгов */}
        <Route path="/DebtAnalytics" element={<LayoutWrapper currentPageName="DebtAnalytics"><DebtAnalytics /></LayoutWrapper>} />
        {/* Планировщик долгов */}
        <Route path="/DebtPlanner" element={<LayoutWrapper currentPageName="DebtPlanner"><DebtPlanner /></LayoutWrapper>} />
        {/* Обучение */}
        <Route path="/Education" element={<LayoutWrapper currentPageName="Education"><Education /></LayoutWrapper>} />
        <Route path="/Education/:lessonId" element={<LayoutWrapper currentPageName="Education"><EducationLesson /></LayoutWrapper>} />
        {/* Политика конфиденциальности */}
        <Route path="/PrivacyPolicy" element={<LayoutWrapper currentPageName="PrivacyPolicy"><PrivacyPolicy /></LayoutWrapper>} />
        {/* Семейный чат */}
        <Route path="/FamilyChat" element={<LayoutWrapper currentPageName="FamilyChat"><FamilyChat /></LayoutWrapper>} />
        {/* Подписки и регулярные платежи */}
        <Route path="/Subscriptions" element={<LayoutWrapper currentPageName="Subscriptions"><Subscriptions /></LayoutWrapper>} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </Suspense>
      </motion.div>
    </AnimatePresence>
    </>
  );
};


function App() {
  const [splashDone, setSplashDone] = React.useState(false);
  useFontScale();

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <GlobalCacheSync />
        <SplashScreen onFinish={() => setSplashDone(true)} />
        <PushNotificationManager />
        {splashDone && (
          <Router>
            <NavigationTracker />
            <AuthenticatedApp />
          </Router>
        )}
        <Toaster />
        <SonnerToaster richColors position="top-center" />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App