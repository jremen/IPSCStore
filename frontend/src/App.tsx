import React, { useEffect } from 'react';
import { ThemeConfig, ThemeProvider } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import AppLayout from './components/layout/AppLayout';
import { useUIStore } from './stores/uiStore';
import { customTheme } from "./theme";
import { ThemeInit } from '../.flowbite-react/init';

export default function App() {
  const { i18n } = useTranslation();
  const language = useUIStore((s) => s.language);

  // Sync i18n language with store on mount and when it changes
  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language, i18n]);

  // Update <html lang> attribute to match the current language
  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return (
    <React.StrictMode>
      <ThemeConfig mode="auto" />
      <ThemeProvider theme={customTheme}>
        <ThemeInit />
        <AppLayout />
      </ThemeProvider>
    </React.StrictMode>
  );
}
