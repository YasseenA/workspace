import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export type SBMessage = {
  id: string; role: 'user' | 'assistant'; text: string; timestamp: number;
};

interface StudyBuddyState {
  messages: SBMessage[]; userId: string | null;
  loadForUser: (userId: string) => Promise<void>;
  addMessage: (msg: Omit<SBMessage, 'id' | 'timestamp'>) => string;
  appendToLast: (text: string) => void;
  clearHistory: () => void;
  clear: () => void;
}

export const useStudyBuddyStore = create<StudyBuddyState>()((set, get) => ({
  messages: [], userId: null,

  loadForUser: async (userId) => {
    set({ userId });
    const { data } = await supabase.from('study_buddy_messages')
      .select('*').eq('user_id', userId).order('timestamp', { ascending: true }).limit(100);
    set({ messages: (data || []).map(r => ({ id: r.id, role: r.role, text: r.text, timestamp: r.timestamp })) });
  },

  addMessage: ({ role, text }) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    const timestamp = Date.now();
    set(s => ({ messages: [...s.messages, { id, role, text, timestamp }] }));
    const { userId } = get();
    if (userId) supabase.from('study_buddy_messages').insert({ id, user_id: userId, role, text, timestamp }).then();
    return id;
  },

  appendToLast: (text) => {
    set(s => {
      if (!s.messages.length) return s;
      const msgs = [...s.messages];
      msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], text: msgs[msgs.length - 1].text + text };
      return { messages: msgs };
    });
    // Update the last message in DB after streaming completes
    const { messages, userId } = get();
    if (userId && messages.length) {
      const last = messages[messages.length - 1];
      supabase.from('study_buddy_messages').update({ text: last.text }).eq('id', last.id).then();
    }
  },

  clearHistory: () => {
    const { userId } = get();
    set({ messages: [] });
    if (userId) supabase.from('study_buddy_messages').delete().eq('user_id', userId).then();
  },

  clear: () => set({ messages: [], userId: null }),
}));
