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

// ── localStorage cache (instant reads, no async wait) ─────────────────────────
const LS = {
  DARK:    'ws_dark_mode',
  ACCENT:  'ws_accent_color',
  NOTIFS:  'ws_notifications',
};

function lsGet(key: string, fallback: any) {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    if (typeof fallback === 'boolean') return v === 'true';
    return v;
  } catch { return fallback; }
}
function lsSet(key: string, val: any) {
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(key, String(val)); } catch {}
}

// ── Initial values from localStorage (no flicker on reload) ──────────────────
const initDark    = lsGet(LS.DARK,   false) as boolean;
const initAccent  = lsGet(LS.ACCENT, '#7c3aed') as string;
const initNotifs  = lsGet(LS.NOTIFS, true) as boolean;

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
  // Seed from localStorage immediately — Supabase will overwrite on load
  darkMode: initDark,
  notificationsEnabled: initNotifs,
  accentColor: initAccent,
  notifiedIds: [],
  userId: null,

  loadForUser: async (userId) => {
    set({ userId });
    const { data } = await supabase
      .from('profiles')
      .select('dark_mode,notifications_enabled,accent_color')
      .eq('user_id', userId)
      .single();

    if (data) {
      const dark   = data.dark_mode    ?? get().darkMode;
      const notifs = data.notifications_enabled ?? get().notificationsEnabled;
      const accent = data.accent_color  || get().accentColor;
      set({ darkMode: dark, notificationsEnabled: notifs, accentColor: accent });
      // Keep localStorage in sync with DB truth
      lsSet(LS.DARK,   dark);
      lsSet(LS.NOTIFS, notifs);
      lsSet(LS.ACCENT, accent);
    }
  },

  toggleDarkMode: () => {
    const next = !get().darkMode;
    set({ darkMode: next });
    lsSet(LS.DARK, next);
    const { userId } = get();
    if (userId) supabase.from('profiles').update({ dark_mode: next }).eq('user_id', userId).then();
  },

  setDarkMode: (v) => {
    set({ darkMode: v });
    lsSet(LS.DARK, v);
    const { userId } = get();
    if (userId) supabase.from('profiles').update({ dark_mode: v }).eq('user_id', userId).then();
  },

  setAccentColor: (color) => {
    set({ accentColor: color });
    lsSet(LS.ACCENT, color);
    const { userId } = get();
    if (userId) supabase.from('profiles').update({ accent_color: color }).eq('user_id', userId).then();
  },

  setNotificationsEnabled: (v) => {
    set({ notificationsEnabled: v });
    lsSet(LS.NOTIFS, v);
    const { userId } = get();
    if (userId) supabase.from('profiles').update({ notifications_enabled: v }).eq('user_id', userId).then();
  },

  addNotifiedId: (id) => set(s => ({ notifiedIds: [...s.notifiedIds, id] })),
  clearNotifiedIds: () => set({ notifiedIds: [] }),
  clear: () => {
    set({ darkMode: false, notificationsEnabled: true, accentColor: '#7c3aed', notifiedIds: [], userId: null });
    lsSet(LS.DARK,   false);
    lsSet(LS.ACCENT, '#7c3aed');
    lsSet(LS.NOTIFS, true);
  },
}));
