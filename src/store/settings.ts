import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export const ACCENT_COLORS = [
  { name: 'Violet',  value: '#7c3aed' },
  { name: 'Blue',    value: '#3b82f6' },
  { name: 'Indigo',  value: '#6366f1' },
  { name: 'Rose',    value: '#f43f5e' },
  { name: 'Green',   value: '#10b981' },
  { name: 'Orange',  value: '#f97316' },
  { name: 'Pink',    value: '#ec4899' },
  { name: 'Cyan',    value: '#06b6d4' },
];

interface SettingsState {
  darkMode: boolean; notificationsEnabled: boolean;
  accentColor: string;
  notifiedIds: string[]; userId: string | null;
  loadForUser: (userId: string) => Promise<void>;
  toggleDarkMode: () => void;
  setDarkMode: (v: boolean) => void;
  setAccentColor: (color: string) => void;
  setNotificationsEnabled: (v: boolean) => void;
  addNotifiedId: (id: string) => void;
  clearNotifiedIds: () => void;
  clear: () => void;
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  darkMode: false, notificationsEnabled: true, accentColor: '#7c3aed', notifiedIds: [], userId: null,

  loadForUser: async (userId) => {
    set({ userId });
    const { data } = await supabase.from('profiles')
      .select('dark_mode,notifications_enabled,accent_color').eq('user_id', userId).single();
    if (data) set({
      darkMode: data.dark_mode ?? false,
      notificationsEnabled: data.notifications_enabled ?? true,
      accentColor: data.accent_color || '#7c3aed',
    });
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

  setAccentColor: (color) => {
    set({ accentColor: color });
    const { userId } = get();
    if (userId) supabase.from('profiles').update({ accent_color: color }).eq('user_id', userId).then();
  },

  setNotificationsEnabled: (v) => {
    set({ notificationsEnabled: v });
    const { userId } = get();
    if (userId) supabase.from('profiles').update({ notifications_enabled: v }).eq('user_id', userId).then();
  },

  addNotifiedId: (id) => set(s => ({ notifiedIds: [...s.notifiedIds, id] })),
  clearNotifiedIds: () => set({ notifiedIds: [] }),
  clear: () => set({ darkMode: false, notificationsEnabled: true, accentColor: '#7c3aed', notifiedIds: [], userId: null }),
}));
