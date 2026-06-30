import { useEffect } from 'react';
import { useUIStore, type ThemeMode } from '../stores/uiStore';

function applyTheme(mode: ThemeMode) {
  const html = document.documentElement;
  html.classList.toggle('dark', mode === 'dark');
  html.classList.toggle('eink', mode === 'eink');

  // Update theme-color meta tag
  const colors: Record<ThemeMode, string> = {
    light: '#ffffff',
    dark: '#1e293b',
    eink: '#ffffff',
  };
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = colors[mode];
}

export function useThemeApplication() {
  const themeMode = useUIStore((s) => s.themeMode);

  useEffect(() => {
    applyTheme(themeMode);
  }, [themeMode]);
}
