import { create } from 'zustand';

interface SSEState {
  connected: boolean;
}

interface SSEActions {
  setConnected: (connected: boolean) => void;
}

export const useSSEStore = create<SSEState & SSEActions>((set) => ({
  connected: false,
  setConnected: (connected) => set({ connected }),
}));
