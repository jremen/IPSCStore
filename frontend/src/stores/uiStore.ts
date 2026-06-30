import { create } from 'zustand';

export type TabId = 'matches' | 'stages' | 'shooters' | 'registration' | 'scoring' | 'results' | 'squads';
export type Language = 'en' | 'sk';
export type ThemeMode = 'light' | 'dark' | 'eink';

const THEME_KEY = 'ipscscore-theme-mode';
const OLD_THEME_KEY = 'flowbite-theme-mode';

function readInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  // Migrate from old flowbite key if present
  const old = localStorage.getItem(OLD_THEME_KEY);
  const saved = localStorage.getItem(THEME_KEY);
  if (saved && ['light', 'dark', 'eink'].includes(saved)) return saved as ThemeMode;
  if (old) {
    let migrated: ThemeMode = 'light';
    if (old === 'dark') migrated = 'dark';
    else if (old === 'light') migrated = 'light';
    // 'auto' — resolve by system preference
    if (old === 'auto') migrated = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    localStorage.setItem(THEME_KEY, migrated);
    localStorage.removeItem(OLD_THEME_KEY);
    return migrated;
  }
  return 'light';
}

interface UIState {
  activeTab: TabId;
  activeMatchId: string | null;
  activeStageId: string | null;
  language: Language;
  themeMode: ThemeMode;
  toasts: Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }>;
}

interface UIActions {
  setActiveTab: (tab: TabId) => void;
  setActiveMatch: (matchId: string | null) => void;
  setActiveStage: (stageId: string | null) => void;
  setLanguage: (lang: Language) => void;
  setThemeMode: (mode: ThemeMode) => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

// Read saved language from localStorage, default to 'en'
const savedLanguage = (typeof window !== 'undefined' && localStorage.getItem('ipscscore-language')) as Language || 'en';

// Read saved active match ID from localStorage (for offline fallback)
const savedActiveMatchId = typeof window !== 'undefined' ? localStorage.getItem('ipscscore-active-match-id') : null;

export const useUIStore = create<UIState & UIActions>((set) => ({
  activeTab: 'matches',
  activeMatchId: savedActiveMatchId,
  activeStageId: null,
  language: savedLanguage,
  themeMode: readInitialTheme(),
  toasts: [],

  setActiveTab: (tab) => set({ activeTab: tab }),
  setActiveMatch: (matchId) => {
    if (matchId) {
      localStorage.setItem('ipscscore-active-match-id', matchId);
    } else {
      localStorage.removeItem('ipscscore-active-match-id');
    }
    set({ activeMatchId: matchId });
  },
  setActiveStage: (stageId) => set({ activeStageId: stageId }),

  setLanguage: (lang) => {
    localStorage.setItem('ipscscore-language', lang);
    set({ language: lang });
  },

  setThemeMode: (mode) => {
    localStorage.setItem(THEME_KEY, mode);
    set({ themeMode: mode });
  },

  addToast: (message, type = 'info') => {
    const id = Date.now().toString();
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },

  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));