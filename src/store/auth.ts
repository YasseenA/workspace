import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import React, { createContext, useContext, useEffect, ReactNode } from 'react';

interface User {
  id: string; name: string; email: string; school: string;
  major?: string; graduationYear?: number;
}

interface AuthState {
  user: User | null; token: string | null;
  isAuthenticated: boolean; isLoading: boolean; hasOnboarded: boolean;
  canvasToken: string | null;
  login: (email: string, password: string, displayName?: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (u: Partial<User>) => void;
  completeOnboarding: () => void;
  setCanvasToken: (t: string) => void;
}

// Web-safe storage
const webStorage = {
  getItem: (name: string) => {
    try {
      if (typeof localStorage !== 'undefined') return localStorage.getItem(name);
      return null;
    } catch { return null; }
  },
  setItem: (name: string, value: string) => {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(name, value);
    } catch {}
  },
  removeItem: (name: string) => {
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(name);
    } catch {}
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null, token: null, isAuthenticated: false,
      isLoading: false, hasOnboarded: false, canvasToken: null,

      login: async (email, password, displayName?) => {
        set({ isLoading: true });
        await new Promise(r => setTimeout(r, 800));
        if (password.length < 6) { set({ isLoading: false }); throw new Error('Password must be at least 6 characters'); }
        set(s => ({
          user: {
            id: s.user?.id || 'u1',
            // prefer: provided displayName > existing stored name (if same email) > email prefix
            name: displayName?.trim() || (s.user?.email === email ? s.user!.name : null) || email.split('@')[0],
            email,
            school: s.user?.school || 'Bellevue College',
            major: s.user?.major,
            graduationYear: s.user?.graduationYear,
          },
          token: 'tok_' + Date.now(), isAuthenticated: true, isLoading: false,
        }));
      },

      register: async (name, email, password) => {
        set({ isLoading: true });
        await new Promise(r => setTimeout(r, 800));
        if (password.length < 6) { set({ isLoading: false }); throw new Error('Password must be at least 6 characters'); }
        set({
          user: { id: 'u1', name, email, school: 'Bellevue College' },
          token: 'tok_' + Date.now(), isAuthenticated: true, isLoading: false,
        });
      },

      logout: () => set({ user: null, token: null, isAuthenticated: false, hasOnboarded: false, canvasToken: null }),
      updateUser: (u) => set(s => ({ user: s.user ? { ...s.user, ...u } : null })),
      completeOnboarding: () => set({ hasOnboarded: true }),
      setCanvasToken: (t) => set({ canvasToken: t }),
    }),
    {
      name: 'workspace-auth',
      storage: {
        getItem: (name) => { const v = webStorage.getItem(name); return v ? JSON.parse(v) : null; },
        setItem: (name, value) => webStorage.setItem(name, JSON.stringify(value)),
        removeItem: (name) => webStorage.removeItem(name),
      },
    }
  )
);

const AuthContext = createContext<AuthState | undefined>(undefined);
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const auth = useAuthStore();
  return React.createElement(AuthContext.Provider, { value: auth }, children);
};
export const useAuth = () => {
  const c = useContext(AuthContext);
  if (!c) throw new Error('useAuth outside AuthProvider');
  return c;
};
