import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { canvas, CanvasCourse, CanvasAssignment, CanvasSubmission } from '../lib/canvas';

const webStorage = {
  getItem: (name: string) => { try { const v = typeof localStorage !== 'undefined' ? localStorage.getItem(name) : null; return v ? JSON.parse(v) : null; } catch { return null; } },
  setItem: (name: string, value: string) => { try { if (typeof localStorage !== 'undefined') localStorage.setItem(name, JSON.stringify(value)); } catch {} },
  removeItem: (name: string) => { try { if (typeof localStorage !== 'undefined') localStorage.removeItem(name); } catch {} },
};

interface CanvasState {
  connected: boolean; token: string | null;
  courses: CanvasCourse[]; assignments: CanvasAssignment[];
  submissions: CanvasSubmission[];
  lastSync: string | null; isSyncing: boolean; error: string | null;
  connect: (token: string) => Promise<void>;
  disconnect: () => void;
  sync: () => Promise<void>;
}

export const useCanvasStore = create<CanvasState>()(
  persist(
    (set, get) => ({
      connected: false, token: null, courses: [], assignments: [],
      submissions: [], lastSync: null, isSyncing: false, error: null,

      connect: async (token) => {
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
          set({ connected: true, token, courses: activeCourses, assignments, submissions, lastSync: new Date().toISOString(), isSyncing: false });
        } catch(e: any) {
          const msg = e.message?.includes('Failed to fetch')
            ? 'Could not reach Canvas. Make sure the proxy is running (node canvas-proxy.js).'
            : e.message || 'Connection failed.';
          set({ isSyncing: false, error: msg });
          throw new Error(msg);
        }
      },

      disconnect: () => set({ connected: false, token: null, courses: [], assignments: [], submissions: [], lastSync: null }),

      sync: async () => {
        const { token, courses } = get();
        if (!token) throw new Error('Not connected');
        set({ isSyncing: true });
        try {
          const courseIds = courses.map(c => c.id);
          const [assignments, submissions] = await Promise.all([
            canvas.getAllAssignments(token, courseIds),
            canvas.getAllSubmissions(token, courseIds),
          ]);
          set({ assignments, submissions, lastSync: new Date().toISOString(), isSyncing: false });
        } catch(e: any) { set({ isSyncing: false, error: e.message }); throw e; }
      },
    }),
    { name: 'workspace-canvas', storage: webStorage }
  )
);
