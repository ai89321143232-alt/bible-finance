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

import React from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import Onboarding from './pages/Onboarding';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

// Достаём список страниц, компонент Layout и имя главной страницы
const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

// Оборачивает страницу в Layout (передаёт currentPageName для подсветки меню)
const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user && user.onboarding_complete === false && !window.location.pathname.includes('/Onboarding')) {
      navigate('/Onboarding');
    }
  }, [user]);

  // Пока грузятся публичные настройки приложения или токен — показываем спиннер
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Обработка ошибок авторизации
  if (authError) {
    if (authError.type === 'user_not_registered') {
      // Пользователь не зарегистрирован в приложении → экран ошибки
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Требуется логин → редирект на страницу входа
      navigateToLogin();
      return null;
    }
  }

  // Основные маршруты приложения
  return (
    <Routes>
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
      {/* Страница 404 для неизвестных маршрутов */}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    // AuthProvider — хранит user, isAuthenticated, authError
    <AuthProvider>
      {/* QueryClientProvider — глобальный кэш для useQuery/useMutation */}
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          {/* NavigationTracker — сохраняет имя текущей страницы в state */}
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        {/* Toaster — глобальные уведомления (shadcn/ui) */}
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App