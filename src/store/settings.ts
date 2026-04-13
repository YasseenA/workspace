import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const webStorage = {
  getItem: (name: string) => { try { const v = typeof localStorage !== 'undefined' ? localStorage.getItem(name) : null; return v ? JSON.parse(v) : null; } catch { return null; } },
  setItem: (name: string, value: string) => { try { if (typeof localStorage !== 'undefined') localStorage.setItem(name, JSON.stringify(value)); } catch {} },
  removeItem: (name: string) => { try { if (typeof localStorage !== 'undefined') localStorage.removeItem(name); } catch {} },
};

interface SettingsState {
  darkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (v: boolean) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (v: boolean) => void;
  notifiedIds: string[]; // assignment/task IDs already notified this session
  addNotifiedId: (id: string) => void;
  clearNotifiedIds: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      darkMode: false,
      toggleDarkMode: () => set(s => ({ darkMode: !s.darkMode })),
      setDarkMode: (v) => set({ darkMode: v }),
      notificationsEnabled: true,
      setNotificationsEnabled: (v) => set({ notificationsEnabled: v }),
      notifiedIds: [],
      addNotifiedId: (id) => set(s => ({ notifiedIds: [...s.notifiedIds, id] })),
      clearNotifiedIds: () => set({ notifiedIds: [] }),
    }),
    { name: 'workspace-settings', storage: webStorage }
  )
);
