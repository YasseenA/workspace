import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type Status = 'todo' | 'in_progress' | 'done';

export interface Task {
  id: string; title: string; description?: string; priority: Priority;
  status: Status; dueDate?: string; classId?: string; canvasId?: string;
  tags: string[]; createdAt: string; updatedAt: string;
}

interface TasksState {
  tasks: Task[];
  createTask: (data: Partial<Task>) => Task;
  updateTask: (id: string, data: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  completeTask: (id: string) => void;
  importFromCanvas: (assignments: any[]) => number;
}

const webStorage = {
  getItem: (name: string) => { try { const v = typeof localStorage !== 'undefined' ? localStorage.getItem(name) : null; return v ? JSON.parse(v) : null; } catch { return null; } },
  setItem: (name: string, value: string) => { try { if (typeof localStorage !== 'undefined') localStorage.setItem(name, JSON.stringify(value)); } catch {} },
  removeItem: (name: string) => { try { if (typeof localStorage !== 'undefined') localStorage.removeItem(name); } catch {} },
};

export const useTasksStore = create<TasksState>()(
  persist(
    (set, get) => ({
      tasks: [],
      createTask: (data) => {
        const task: Task = { id: 't'+Date.now(), title: data.title||'New Task', description: data.description, priority: data.priority||'medium', status: 'todo', dueDate: data.dueDate, canvasId: data.canvasId, tags: data.tags||[], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        set(s => ({ tasks: [task, ...s.tasks] }));
        return task;
      },
      updateTask: (id, data) => set(s => ({ tasks: s.tasks.map(t => t.id===id ? {...t,...data, updatedAt: new Date().toISOString()} : t) })),
      deleteTask: (id) => set(s => ({ tasks: s.tasks.filter(t => t.id!==id) })),
      completeTask: (id) => set(s => ({ tasks: s.tasks.map(t => t.id===id ? {...t, status:'done', updatedAt: new Date().toISOString()} : t) })),
      importFromCanvas: (assignments) => {
        const existing = new Set(get().tasks.map(t => t.canvasId).filter(Boolean));
        const newTasks = assignments.filter(a => !existing.has(String(a.id))).map(a => ({
          id: 't'+Date.now()+Math.random(), title: a.name, description: a.description?.replace(/<[^>]*>/g,'').slice(0,200),
          priority: 'medium' as Priority, status: 'todo' as Status, dueDate: a.due_at||undefined,
          canvasId: String(a.id), tags: ['canvas'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        }));
        if (newTasks.length) set(s => ({ tasks: [...newTasks, ...s.tasks] }));
        return newTasks.length;
      },
    }),
    { name: 'workspace-tasks', storage: webStorage }
  )
);
