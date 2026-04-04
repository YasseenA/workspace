import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { canvas, CanvasCourse, CanvasAssignment } from '../lib/canvas';

const webStorage = {
  getItem: (name: string) => { try { const v = typeof localStorage !== 'undefined' ? localStorage.getItem(name) : null; return v ? JSON.parse(v) : null; } catch { return null; } },
  setItem: (name: string, value: string) => { try { if (typeof localStorage !== 'undefined') localStorage.setItem(name, JSON.stringify(value)); } catch {} },
  removeItem: (name: string) => { try { if (typeof localStorage !== 'undefined') localStorage.removeItem(name); } catch {} },
};

interface CanvasState {
  connected: boolean; token: string | null;
  courses: CanvasCourse[]; assignments: CanvasAssignment[];
  lastSync: string | null; isSyncing: boolean; error: string | null;
  connect: (token: string) => Promise<void>;
  disconnect: () => void;
  sync: () => Promise<{ courses: number; assignments: number }>;
}

export const useCanvasStore = create<CanvasState>()(
  persist(
    (set, get) => ({
      connected: false, token: null, courses: [], assignments: [],
      lastSync: null, isSyncing: false, error: null,
      connect: async (token) => {
        set({ isSyncing: true, error: null });
        try {
          const courses = await canvas.getCourses(token);
          set({ connected: true, token, courses, isSyncing: false });
        } catch(e: any) { set({ isSyncing: false, error: e.message }); throw e; }
      },
      disconnect: () => set({ connected: false, token: null, courses: [], assignments: [], lastSync: null }),
      sync: async () => {
        const { token, courses } = get();
        if (!token) throw new Error('Not connected');
        set({ isSyncing: true });
        try {
          const assignments = await canvas.getAllAssignments(token, courses.map(c => c.id));
          set({ assignments, lastSync: new Date().toISOString(), isSyncing: false });
          return { courses: courses.length, assignments: assignments.length };
        } catch(e: any) { set({ isSyncing: false, error: e.message }); throw e; }
      },
    }),
    { name: 'workspace-canvas', storage: webStorage }
  )
);
