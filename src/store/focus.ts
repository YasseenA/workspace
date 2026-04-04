import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const webStorage = {
  getItem: (name: string) => { try { const v = typeof localStorage !== 'undefined' ? localStorage.getItem(name) : null; return v ? JSON.parse(v) : null; } catch { return null; } },
  setItem: (name: string, value: string) => { try { if (typeof localStorage !== 'undefined') localStorage.setItem(name, JSON.stringify(value)); } catch {} },
  removeItem: (name: string) => { try { if (typeof localStorage !== 'undefined') localStorage.removeItem(name); } catch {} },
};

interface FocusState {
  workMinutes: number; breakMinutes: number; sessions: number;
  totalFocusMinutes: number; streak: number; lastSessionDate: string | null;
  setWorkMinutes: (m: number) => void;
  setBreakMinutes: (m: number) => void;
  recordSession: (minutes: number) => void;
}

export const useFocusStore = create<FocusState>()(
  persist(
    (set, get) => ({
      workMinutes: 25, breakMinutes: 5, sessions: 0,
      totalFocusMinutes: 0, streak: 0, lastSessionDate: null,
      setWorkMinutes: (m) => set({ workMinutes: m }),
      setBreakMinutes: (m) => set({ breakMinutes: m }),
      recordSession: (minutes) => {
        const today = new Date().toDateString();
        const { lastSessionDate, streak } = get();
        set(s => ({ sessions: s.sessions+1, totalFocusMinutes: s.totalFocusMinutes+minutes, streak: lastSessionDate===today ? streak : streak+1, lastSessionDate: today }));
      },
    }),
    { name: 'workspace-focus', storage: webStorage }
  )
);
