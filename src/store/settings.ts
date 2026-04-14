import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface SettingsState {
  darkMode: boolean; notificationsEnabled: boolean;
  notifiedIds: string[]; userId: string | null;
  loadForUser: (userId: string) => Promise<void>;
  toggleDarkMode: () => void;
  setDarkMode: (v: boolean) => void;
  setNotificationsEnabled: (v: boolean) => void;
  addNotifiedId: (id: string) => void;
  clearNotifiedIds: () => void;
  clear: () => void;
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  darkMode: false, notificationsEnabled: true, notifiedIds: [], userId: null,

  loadForUser: async (userId) => {
    set({ userId });
    const { data } = await supabase.from('profiles')
      .select('dark_mode,notifications_enabled').eq('user_id', userId).single();
    if (data) set({ darkMode: data.dark_mode || false, notificationsEnabled: data.notifications_enabled ?? true });
  },

  toggleDarkMode: () => {
    const next = !get().darkMode;
    set({ darkMode: next });
    const { userId } = get();
    if (userId) supabase.from('profiles').update({ dark_mode: next }).eq('user_id', userId).then();
  },

  setDarkMode: (v) => {
    set({ darkMode: v });
    const { userId } = get();
    if (userId) supabase.from('profiles').update({ dark_mode: v }).eq('user_id', userId).then();
  },

  setNotificationsEnabled: (v) => {
    set({ notificationsEnabled: v });
    const { userId } = get();
    if (userId) supabase.from('profiles').update({ notifications_enabled: v }).eq('user_id', userId).then();
  },

  addNotifiedId: (id) => set(s => ({ notifiedIds: [...s.notifiedIds, id] })),
  clearNotifiedIds: () => set({ notifiedIds: [] }),
  clear: () => set({ darkMode: false, notificationsEnabled: true, notifiedIds: [], userId: null }),
}));
