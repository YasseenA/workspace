import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface FocusState {
  workMinutes: number; breakMinutes: number; sessions: number;
  totalFocusMinutes: number; streak: number; lastSessionDate: string | null;
  userId: string | null;
  loadForUser: (userId: string) => Promise<void>;
  setWorkMinutes: (m: number) => void;
  setBreakMinutes: (m: number) => void;
  recordSession: (minutes: number) => void;
  clear: () => void;
}

export const useFocusStore = create<FocusState>()((set, get) => ({
  workMinutes: 25, breakMinutes: 5, sessions: 0,
  totalFocusMinutes: 0, streak: 0, lastSessionDate: null, userId: null,

  loadForUser: async (userId) => {
    set({ userId });
    const { data } = await supabase.from('profiles').select(
      'work_minutes,break_minutes,sessions,total_focus_minutes,streak,last_session_date'
    ).eq('user_id', userId).single();
    if (data) set({
      workMinutes: data.work_minutes || 25,
      breakMinutes: data.break_minutes || 5,
      sessions: data.sessions || 0,
      totalFocusMinutes: data.total_focus_minutes || 0,
      streak: data.streak || 0,
      lastSessionDate: data.last_session_date || null,
    });
  },

  setWorkMinutes: (m) => {
    set({ workMinutes: m });
    const { userId } = get();
    if (userId) supabase.from('profiles').update({ work_minutes: m }).eq('user_id', userId).then();
  },

  setBreakMinutes: (m) => {
    set({ breakMinutes: m });
    const { userId } = get();
    if (userId) supabase.from('profiles').update({ break_minutes: m }).eq('user_id', userId).then();
  },

  recordSession: (minutes) => {
    const today = new Date().toDateString();
    const { lastSessionDate, streak, userId } = get();
    const newStreak = lastSessionDate === today ? streak : streak + 1;
    set(s => ({
      sessions: s.sessions + 1,
      totalFocusMinutes: s.totalFocusMinutes + minutes,
      streak: newStreak,
      lastSessionDate: today,
    }));
    if (userId) supabase.from('profiles').update({
      sessions: get().sessions,
      total_focus_minutes: get().totalFocusMinutes,
      streak: newStreak,
      last_session_date: today,
    }).eq('user_id', userId).then();
  },

  clear: () => set({ workMinutes: 25, breakMinutes: 5, sessions: 0, totalFocusMinutes: 0, streak: 0, lastSessionDate: null, userId: null }),
}));
