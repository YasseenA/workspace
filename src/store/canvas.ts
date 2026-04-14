import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { canvas, CanvasCourse, CanvasAssignment, CanvasSubmission } from '../lib/canvas';

interface CanvasState {
  connected: boolean; token: string | null;
  courses: CanvasCourse[]; assignments: CanvasAssignment[];
  submissions: CanvasSubmission[];
  lastSync: string | null; isSyncing: boolean; error: string | null;
  userId: string | null;
  loadForUser: (userId: string, token?: string | null) => Promise<void>;
  connect: (token: string) => Promise<void>;
  disconnect: () => void;
  sync: () => Promise<void>;
  clear: () => void;
}

export const useCanvasStore = create<CanvasState>()((set, get) => ({
  connected: false, token: null, courses: [], assignments: [],
  submissions: [], lastSync: null, isSyncing: false, error: null, userId: null,

  loadForUser: async (userId, token) => {
    set({ userId });
    if (!token) return;
    const { data } = await supabase.from('profiles')
      .select('canvas_token,canvas_courses,canvas_assignments,canvas_submissions,canvas_last_sync')
      .eq('user_id', userId).single();
    if (data?.canvas_token) {
      set({
        connected: true, token: data.canvas_token,
        courses: data.canvas_courses || [],
        assignments: data.canvas_assignments || [],
        submissions: data.canvas_submissions || [],
        lastSync: data.canvas_last_sync || null,
      });
    }
  },

  connect: async (token) => {
    const { userId } = get();
    set({ isSyncing: true, error: null });
    try {
      const courses = await canvas.getCourses(token);
      if (!Array.isArray(courses)) throw new Error('Invalid response — check your token and try again.');
      const activeCourses = courses.filter((c: CanvasCourse) => c.name && !c.name.startsWith('Sandbox'));
      const courseIds = activeCourses.map((c: CanvasCourse) => c.id);
      const [assignments, submissions] = await Promise.all([
        canvas.getAllAssignments(token, courseIds),
        canvas.getAllSubmissions(token, courseIds),
      ]);
      const now = new Date().toISOString();
      set({ connected: true, token, courses: activeCourses, assignments, submissions, lastSync: now, isSyncing: false });
      if (userId) await supabase.from('profiles').update({
        canvas_token: token, canvas_courses: activeCourses,
        canvas_assignments: assignments, canvas_submissions: submissions,
        canvas_last_sync: now,
      }).eq('user_id', userId);
    } catch (e: any) {
      const msg = e.message?.includes('Failed to fetch')
        ? 'Could not reach Canvas. Check that your proxy is running.'
        : e.message || 'Connection failed.';
      set({ isSyncing: false, error: msg });
      throw new Error(msg);
    }
  },

  disconnect: () => {
    const { userId } = get();
    set({ connected: false, token: null, courses: [], assignments: [], submissions: [], lastSync: null });
    if (userId) supabase.from('profiles').update({
      canvas_token: null, canvas_courses: [], canvas_assignments: [], canvas_submissions: [],
    }).eq('user_id', userId).then();
  },

  sync: async () => {
    const { token, courses, userId } = get();
    if (!token) throw new Error('Not connected');
    set({ isSyncing: true });
    try {
      const courseIds = courses.map(c => c.id);
      const [assignments, submissions] = await Promise.all([
        canvas.getAllAssignments(token, courseIds),
        canvas.getAllSubmissions(token, courseIds),
      ]);
      const now = new Date().toISOString();
      set({ assignments, submissions, lastSync: now, isSyncing: false });
      if (userId) supabase.from('profiles').update({
        canvas_assignments: assignments, canvas_submissions: submissions, canvas_last_sync: now,
      }).eq('user_id', userId).then();
    } catch (e: any) { set({ isSyncing: false, error: e.message }); throw e; }
  },

  clear: () => set({ connected: false, token: null, courses: [], assignments: [], submissions: [], lastSync: null, isSyncing: false, error: null, userId: null }),
}));
