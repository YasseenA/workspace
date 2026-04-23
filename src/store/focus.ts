import { create } from 'zustand';
import { supabase, bgSync } from '../lib/supabase';

export interface SessionEntry { date: string; minutes: number; label: string; }

interface FocusState {
  workMinutes: number; breakMinutes: number; sessions: number;
  totalFocusMinutes: number; streak: number; lastSessionDate: string | null;
  sessionLog: SessionEntry[];
  userId: string | null;
  focusTaskId: string | null; focusTaskTitle: string | null;
  loadForUser: (userId: string) => Promise<void>;
  setWorkMinutes: (m: number) => void;
  setBreakMinutes: (m: number) => void;
  recordSession: (minutes: number, label?: string) => void;
  setFocusTask: (id: string | null, title: string | null) => void;
  clear: () => void;
}

export const useFocusStore = create<FocusState>()((set, get) => ({
  workMinutes: 25, breakMinutes: 5, sessions: 0,
  totalFocusMinutes: 0, streak: 0, lastSessionDate: null,
  sessionLog: [], userId: null,
  focusTaskId: null, focusTaskTitle: null,

  loadForUser: async (userId) => {
    set({ userId });
    const { data } = await supabase.from('profiles').select(
      'work_minutes,break_minutes,sessions,total_focus_minutes,streak,last_session_date,focus_session_log'
    ).eq('user_id', userId).single();
    if (data) set({
      workMinutes: data.work_minutes || 25,
      breakMinutes: data.break_minutes || 5,
      sessions: data.sessions || 0,
      totalFocusMinutes: data.total_focus_minutes || 0,
      streak: data.streak || 0,
      lastSessionDate: data.last_session_date || null,
      sessionLog: data.focus_session_log || [],
    });
  },

  setWorkMinutes: (m) => {
    set({ workMinutes: m });
    const { userId } = get();
    if (userId) bgSync(supabase.from('profiles').update({ work_minutes: m }).eq('user_id', userId));
  },

  setBreakMinutes: (m) => {
    set({ breakMinutes: m });
    const { userId } = get();
    if (userId) bgSync(supabase.from('profiles').update({ break_minutes: m }).eq('user_id', userId));
  },

  recordSession: (minutes, label) => {
    const today = new Date().toDateString();
    const { lastSessionDate, streak, userId, sessionLog } = get();
    const newStreak = lastSessionDate === today ? streak : streak + 1;

    // Trim log to last 30 days and append new entry
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
    const newEntry: SessionEntry = { date: new Date().toISOString().slice(0, 10), minutes, label: label || 'Free Focus' };
    const trimmedLog = [
      ...sessionLog.filter(e => new Date(e.date) >= cutoff),
      newEntry,
    ];

    set(s => ({
      sessions: s.sessions + 1,
      totalFocusMinutes: s.totalFocusMinutes + minutes,
      streak: newStreak,
      lastSessionDate: today,
      sessionLog: trimmedLog,
    }));

    if (userId) bgSync(supabase.from('profiles').update({
      sessions: get().sessions,
      total_focus_minutes: get().totalFocusMinutes,
      streak: newStreak,
      last_session_date: today,
      focus_session_log: trimmedLog,
    }).eq('user_id', userId));
  },

  setFocusTask: (id, title) => set({ focusTaskId: id, focusTaskTitle: title }),

  clear: () => set({
    workMinutes: 25, breakMinutes: 5, sessions: 0,
    totalFocusMinutes: 0, streak: 0, lastSessionDate: null,
    sessionLog: [], userId: null,
    focusTaskId: null, focusTaskTitle: null,
  }),
}));
