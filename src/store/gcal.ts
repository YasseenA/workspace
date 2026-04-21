import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { fetchGoogleCalendar, GCalEvent } from '../lib/gcal';

interface GCalState {
  connected: boolean;
  feedUrl: string | null;
  events: GCalEvent[];
  isSyncing: boolean;
  error: string | null;
  userId: string | null;
  loadForUser: (userId: string) => Promise<void>;
  connect: (feedUrl: string) => Promise<void>;
  disconnect: () => void;
  sync: () => Promise<void>;
  clear: () => void;
}

export const useGCalStore = create<GCalState>()((set, get) => ({
  connected: false, feedUrl: null, events: [], isSyncing: false, error: null, userId: null,

  loadForUser: async (userId) => {
    set({ userId });
    const { data } = await supabase.from('profiles')
      .select('gcal_feed_url,gcal_events')
      .eq('user_id', userId).single();
    if (data?.gcal_feed_url) {
      set({
        connected: true,
        feedUrl: data.gcal_feed_url,
        events: data.gcal_events || [],
      });
    }
  },

  connect: async (feedUrl) => {
    const { userId } = get();
    set({ isSyncing: true, error: null });
    try {
      const events = await fetchGoogleCalendar(feedUrl);
      set({ connected: true, feedUrl, events, isSyncing: false });
      if (userId) supabase.from('profiles').update({
        gcal_feed_url: feedUrl, gcal_events: events,
      }).eq('user_id', userId).then();
    } catch (e: any) {
      set({ isSyncing: false, error: e.message || 'Failed to connect calendar' });
      throw e;
    }
  },

  disconnect: () => {
    const { userId } = get();
    set({ connected: false, feedUrl: null, events: [] });
    if (userId) supabase.from('profiles').update({
      gcal_feed_url: null, gcal_events: null,
    }).eq('user_id', userId).then();
  },

  sync: async () => {
    const { feedUrl, userId } = get();
    if (!feedUrl) return;
    set({ isSyncing: true });
    try {
      const events = await fetchGoogleCalendar(feedUrl);
      set({ events, isSyncing: false });
      if (userId) supabase.from('profiles').update({
        gcal_events: events,
      }).eq('user_id', userId).then();
    } catch (e: any) {
      set({ isSyncing: false, error: e.message });
    }
  },

  clear: () => set({ connected: false, feedUrl: null, events: [], isSyncing: false, error: null, userId: null }),
}));
