import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { translations, DEFAULT_LANGUAGE, detectBrowserLanguage } from '@/lib/i18n';

const LanguageContext = createContext({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(DEFAULT_LANGUAGE);

  // Load language from user on mount
  useEffect(() => {
    let mounted = true;
    base44.auth.me().then((user) => {
      if (!mounted) return;
      if (user?.language) {
        setLanguageState(user.language);
      } else if (user) {
        // Auto-detect on first login
        const detected = detectBrowserLanguage();
        setLanguageState(detected);
        base44.auth.updateMe({ language: detected }).catch(() => {});
      }
    }).catch(() => {
      // Not logged in — use browser language
      setLanguageState(detectBrowserLanguage());
    });
    return () => { mounted = false; };
  }, []);

  const setLanguage = useCallback(async (lang) => {
    setLanguageState(lang);
    try {
      await base44.auth.updateMe({ language: lang });
    } catch {
      // ignore — applied locally anyway
    }
  }, []);

  const t = useCallback((key) => {
    const dict = translations[language] || translations[DEFAULT_LANGUAGE];
    return dict[key] || translations[DEFAULT_LANGUAGE][key] || key;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function useTranslation() {
  const { t } = useLanguage();
  return t;
}