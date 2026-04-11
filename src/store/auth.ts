import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// App-specific user data that Clerk doesn't manage
interface AppUserData {
  school: string;
  major?: string;
  graduationYear?: number;
}

interface AuthState {
  appData: AppUserData;
  hasOnboarded: boolean;
  canvasToken: string | null;
  updateAppData: (d: Partial<AppUserData>) => void;
  completeOnboarding: () => void;
  setCanvasToken: (t: string) => void;
  resetAppState: () => void;
}

const defaultAppData: AppUserData = { school: 'Bellevue College' };

const webStorage = {
  getItem: (name: string) => {
    try {
      if (typeof localStorage !== 'undefined') return localStorage.getItem(name);
      return null;
    } catch { return null; }
  },
  setItem: (name: string, value: string) => {
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(name, value); } catch {}
  },
  removeItem: (name: string) => {
    try { if (typeof localStorage !== 'undefined') localStorage.removeItem(name); } catch {}
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      appData: defaultAppData,
      hasOnboarded: false,
      canvasToken: null,

      updateAppData: (d) => set(s => ({ appData: { ...s.appData, ...d } })),
      completeOnboarding: () => set({ hasOnboarded: true }),
      setCanvasToken: (t) => set({ canvasToken: t }),
      resetAppState: () => set({ appData: defaultAppData, hasOnboarded: false, canvasToken: null }),
    }),
    {
      name: 'workspace-app',
      storage: {
        getItem: (name) => { const v = webStorage.getItem(name); return v ? JSON.parse(v) : null; },
        setItem: (name, value) => webStorage.setItem(name, JSON.stringify(value)),
        removeItem: (name) => webStorage.removeItem(name),
      },
    }
  )
);
