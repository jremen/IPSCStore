import { create } from 'zustand';

export type TabId = 'matches' | 'stages' | 'shooters' | 'registration' | 'scoring' | 'results';
export type Language = 'en' | 'sk';

interface UIState {
  activeTab: TabId;
  activeMatchId: string | null;
  activeStageId: string | null;
  language: Language;
  toasts: Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }>;
}

interface UIActions {
  setActiveTab: (tab: TabId) => void;
  setActiveMatch: (matchId: string | null) => void;
  setActiveStage: (stageId: string | null) => void;
  setLanguage: (lang: Language) => void;
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