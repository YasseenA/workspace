import { create } from 'zustand';
import { supabase, bgSync } from '../lib/supabase';
import { canvas, CanvasCourse, CanvasAssignment, CanvasSubmission } from '../lib/canvas';
import { fetchAndParseICal } from '../lib/ical';

interface CanvasState {
  connected: boolean; token: string | null; icalUrl: string | null;
  courses: CanvasCourse[]; assignments: CanvasAssignment[];
  submissions: CanvasSubmission[];
  lastSync: string | null; isSyncing: boolean; error: string | null;
  userId: string | null;
  loadForUser: (userId: string) => Promise<void>;
  connect: (token: string) => Promise<void>;
  connectICal: (feedUrl: string) => Promise<void>;
  disconnect: () => void;
  sync: () => Promise<void>;
  submitAssignment: (courseId: number, assignmentId: number, subType: 'text' | 'url' | 'file', payload: string | File) => Promise<void>;
  clear: () => void;
}

export const useCanvasStore = create<CanvasState>()((set, get) => ({
  connected: false, token: null, icalUrl: null, courses: [], assignments: [],
  submissions: [], lastSync: null, isSyncing: false, error: null, userId: null,

  loadForUser: async (userId) => {
    set({ userId });
    const { data } = await supabase.from('profiles')
      .select('canvas_token,canvas_courses,canvas_assignments,canvas_submissions,canvas_last_sync')
      .eq('user_id', userId).single();
    if (!data?.canvas_token) return;
    // ical:: prefix means the user connected via calendar feed, not API token
    if (data.canvas_token.startsWith('ical::')) {
      const icalUrl = data.canvas_token.slice(6);
      set({
        connected: true, icalUrl, token: null,
        courses: data.canvas_courses || [],
        assignments: data.canvas_assignments || [],
        submissions: [],
        lastSync: data.canvas_last_sync || null,
      });
    } else {
      set({
        connected: true, token: data.canvas_token, icalUrl: null,
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
      const msg = e.message?.includes('Failed to fetch') || e.message?.includes('fetch')
        ? 'Could not reach Canvas. Make sure you selected the correct school and that your school\'s Canvas API is enabled.'
        : e.message || 'Connection failed. Double-check your token and try again.';
      set({ isSyncing: false, error: msg });
      throw new Error(msg);
    }
  },

  connectICal: async (feedUrl) => {
    const { userId } = get();
    set({ isSyncing: true, error: null });
    try {
      const { assignments, courses } = await fetchAndParseICal(feedUrl);
      const now = new Date().toISOString();
      set({ connected: true, icalUrl: feedUrl, token: null, courses, assignments, submissions: [], lastSync: now, isSyncing: false });
      if (userId) await supabase.from('profiles').update({
        canvas_token: `ical::${feedUrl}`,
        canvas_courses: courses,
        canvas_assignments: assignments,
        canvas_submissions: [],
        canvas_last_sync: now,
      }).eq('user_id', userId);
    } catch (e: any) {
      set({ isSyncing: false, error: e.message || 'Could not connect via calendar feed.' });
      throw e;
    }
  },

  disconnect: () => {
    const { userId } = get();
    set({ connected: false, token: null, icalUrl: null, courses: [], assignments: [], submissions: [], lastSync: null });
    if (userId) bgSync(supabase.from('profiles').update({
      canvas_token: null, canvas_courses: [], canvas_assignments: [], canvas_submissions: [],
    }).eq('user_id', userId));
  },

  sync: async () => {
    const { token, userId } = get();
    if (!token) throw new Error('Not connected');
    set({ isSyncing: true });
    try {
      const freshCourses = await canvas.getCourses(token);
      const activeCourses = Array.isArray(freshCourses)
        ? freshCourses.filter((c: CanvasCourse) => c.name && !c.name.startsWith('Sandbox'))
        : get().courses;
      const courseIds = activeCourses.map((c: CanvasCourse) => c.id);
      const [assignments, submissions] = await Promise.all([
        canvas.getAllAssignments(token, courseIds),
        canvas.getAllSubmissions(token, courseIds),
      ]);
      const now = new Date().toISOString();
      set({ courses: activeCourses, assignments, submissions, lastSync: now, isSyncing: false });
      if (userId) bgSync(supabase.from('profiles').update({
        canvas_courses: activeCourses, canvas_assignments: assignments, canvas_submissions: submissions, canvas_last_sync: now,
      }).eq('user_id', userId));
    } catch (e: any) {
      if (e.message === 'TOKEN_EXPIRED') {
        set({ isSyncing: false, connected: false, token: null, error: 'Your Canvas token has expired. Please reconnect.' });
        if (userId) bgSync(supabase.from('profiles').update({ canvas_token: null }).eq('user_id', userId));
      } else {
        set({ isSyncing: false, error: e.message });
      }
      throw e;
    }
  },

  submitAssignment: async (courseId, assignmentId, subType, payload) => {
    const { token, submissions, userId } = get();
    if (!token) throw new Error('No API token — connect via Canvas token to submit.');

    if (subType === 'text') {
      await canvas.submitTextEntry(token, courseId, assignmentId, payload as string);
    } else if (subType === 'url') {
      await canvas.submitUrl(token, courseId, assignmentId, payload as string);
    } else {
      const file = payload as File;
      const slot = await canvas.requestFileUpload(token, courseId, assignmentId, file.name, file.size, file.type);
      const fileId = await canvas.uploadFile(slot.upload_url, slot.upload_params, slot.file_param, file);
      await canvas.submitFile(token, courseId, assignmentId, fileId);
    }

    // Optimistically update local submission state
    const now = new Date().toISOString();
    const exists = submissions.some(s => s.assignment_id === assignmentId && s.course_id === courseId);
    const newSubs: CanvasSubmission[] = exists
      ? submissions.map(s => s.assignment_id === assignmentId && s.course_id === courseId
          ? { ...s, workflow_state: 'submitted', submitted_at: now, missing: false }
          : s)
      : [...submissions, { assignment_id: assignmentId, course_id: courseId, workflow_state: 'submitted', submitted_at: now, score: null, grade: null, late: false, missing: false }];
    set({ submissions: newSubs });
    if (userId) bgSync(supabase.from('profiles').update({ canvas_submissions: newSubs }).eq('user_id', userId));
  },

  clear: () => set({ connected: false, token: null, icalUrl: null, courses: [], assignments: [], submissions: [], lastSync: null, isSyncing: false, error: null, userId: null }),
}));
