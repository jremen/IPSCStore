import { useEffect } from 'react';
import { ThemeProvider } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import AppLayout from './components/layout/AppLayout';
import { useUIStore } from './stores/uiStore';
import { customTheme } from "./theme";
import { ThemeInit } from '../.flowbite-react/init';

export default function App() {
  const { i18n } = useTranslation();
  const { language } = useUIStore();

  // Sync i18n language with store on mount and when it changes
  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language, i18n]);

  return (
    <ThemeProvider theme={customTheme}>
      <ThemeInit />
      <AppLayout />
    </ThemeProvider>
  );
}