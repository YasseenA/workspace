import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SBMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
};

interface StudyBuddyState {
  messages: SBMessage[];
  addMessage: (msg: Omit<SBMessage, 'id' | 'timestamp'>) => string;
  appendToLast: (text: string) => void;
  clearHistory: () => void;
}

const webStorage = {
  getItem: (name: string) => { try { const v = typeof localStorage !== 'undefined' ? localStorage.getItem(name) : null; return v ? JSON.parse(v) : null; } catch { return null; } },
  setItem: (name: string, value: string) => { try { if (typeof localStorage !== 'undefined') localStorage.setItem(name, JSON.stringify(value)); } catch {} },
  removeItem: (name: string) => { try { if (typeof localStorage !== 'undefined') localStorage.removeItem(name); } catch {} },
};

export const useStudyBuddyStore = create<StudyBuddyState>()(
  persist(
    (set, get) => ({
      messages: [],

      addMessage: ({ role, text }) => {
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
        set(s => ({ messages: [...s.messages, { id, role, text, timestamp: Date.now() }] }));
        return id;
      },

      appendToLast: (text) => {
        set(s => {
          if (s.messages.length === 0) return s;
          const msgs = [...s.messages];
          msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], text: msgs[msgs.length - 1].text + text };
          return { messages: msgs };
        });
      },

      clearHistory: () => set({ messages: [] }),
    }),
    { name: 'studybuddy-store', storage: webStorage }
  )
);
