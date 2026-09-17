import { useEffect, useState } from 'react';

const STORAGE_KEY = 'theme';
const MEDIA_QUERY = '(prefers-color-scheme: dark)';
const CHANGE_EVENT = 'app-theme-change';
let removeSystemListener = null;

function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: theme }));
}

export function getCurrentTheme() {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function initializeTheme() {
  const savedTheme = localStorage.getItem(STORAGE_KEY);
  if (savedTheme === 'dark' || savedTheme === 'light') {
    applyTheme(savedTheme);
    return () => {};
  }

  const mediaQuery = window.matchMedia(MEDIA_QUERY);
  const syncSystemTheme = (event) => applyTheme(event.matches ? 'dark' : 'light');
  syncSystemTheme(mediaQuery);
  mediaQuery.addEventListener('change', syncSystemTheme);
  removeSystemListener = () => mediaQuery.removeEventListener('change', syncSystemTheme);

  return () => {
    removeSystemListener?.();
    removeSystemListener = null;
  };
}

export function setManualTheme(theme) {
  removeSystemListener?.();
  removeSystemListener = null;
  localStorage.setItem(STORAGE_KEY, theme);
  applyTheme(theme);
}

export function useSystemTheme() {
  useEffect(() => initializeTheme(), []);
}

export function useTheme() {
  const [theme, setTheme] = useState(getCurrentTheme);

  useEffect(() => {
    const updateTheme = (event) => setTheme(event.detail || getCurrentTheme());
    window.addEventListener(CHANGE_EVENT, updateTheme);
    setTheme(getCurrentTheme());
    return () => window.removeEventListener(CHANGE_EVENT, updateTheme);
  }, []);

  return [theme, setManualTheme];
}