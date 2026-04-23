import { create } from 'zustand';
import { supabase, bgSync } from '../lib/supabase';
import { getClasses, getAllAssignments, TeamsClass, TeamsAssignment } from '../lib/teams';

interface TeamsState {
  connected: boolean;
  token: string | null;
  classes: TeamsClass[];
  assignments: TeamsAssignment[];
  lastSync: string | null;
  isSyncing: boolean;
  error: string | null;
  userId: string | null;
  loadForUser: (userId: string) => Promise<void>;
  connectWithToken: (accessToken: string) => Promise<void>;
  sync: () => Promise<void>;
  disconnect: () => void;
  clear: () => void;
}

export const useTeamsStore = create<TeamsState>()((set, get) => ({
  connected: false, token: null, classes: [], assignments: [],
  lastSync: null, isSyncing: false, error: null, userId: null,

  loadForUser: async (userId) => {
    set({ userId });
    const { data } = await supabase.from('profiles')
      .select('teams_token,teams_courses,teams_assignments,teams_last_sync')
      .eq('user_id', userId).single();
    if (data?.teams_token) {
      set({
        connected: true,
        token: data.teams_token,
        classes: data.teams_courses || [],
        assignments: data.teams_assignments || [],
        lastSync: data.teams_last_sync || null,
      });
    }
  },

  connectWithToken: async (accessToken) => {
    const { userId } = get();
    set({ isSyncing: true, error: null });
    try {
      const classes     = await getClasses(accessToken);
      const assignments = await getAllAssignments(accessToken, classes);
      const now         = new Date().toISOString();
      set({ connected: true, token: accessToken, classes, assignments, lastSync: now, isSyncing: false });
      if (userId) await supabase.from('profiles').update({
        teams_token: accessToken,
        teams_courses: classes,
        teams_assignments: assignments,
        teams_last_sync: now,
      }).eq('user_id', userId);
    } catch (e: any) {
      const msg = e.message?.includes('403') || e.message?.includes('Education')
        ? 'Your school doesn\'t have Microsoft Teams Education. Contact your IT to enable it, or ask your teacher to use Teams Education assignments.'
        : e.message || 'Could not connect to Microsoft Teams.';
      set({ isSyncing: false, error: msg });
      throw new Error(msg);
    }
  },

  sync: async () => {
    const { token, classes, userId } = get();
    if (!token) throw new Error('Not connected');
    set({ isSyncing: true });
    try {
      const assignments = await getAllAssignments(token, classes);
      const now         = new Date().toISOString();
      set({ assignments, lastSync: now, isSyncing: false });
      if (userId) bgSync(supabase.from('profiles').update({
        teams_assignments: assignments, teams_last_sync: now,
      }).eq('user_id', userId));
    } catch (e: any) { set({ isSyncing: false, error: e.message }); throw e; }
  },

  disconnect: () => {
    const { userId } = get();
    set({ connected: false, token: null, classes: [], assignments: [], lastSync: null });
    if (userId) bgSync(supabase.from('profiles').update({
      teams_token: null, teams_courses: [], teams_assignments: [],
    }).eq('user_id', userId));
  },

  clear: () => set({ connected: false, token: null, classes: [], assignments: [], lastSync: null, isSyncing: false, error: null, userId: null }),
}));
