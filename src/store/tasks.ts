import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type Status   = 'todo' | 'in_progress' | 'done';

export interface Task {
  id: string; title: string; description?: string; priority: Priority;
  status: Status; dueDate?: string; classId?: string; canvasId?: string;
  tags: string[]; createdAt: string; updatedAt: string;
}

interface TasksState {
  tasks: Task[]; userId: string | null;
  loadForUser: (userId: string) => Promise<void>;
  createTask: (data: Partial<Task>) => Task;
  updateTask: (id: string, data: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  completeTask: (id: string) => void;
  importFromCanvas: (assignments: any[]) => number;
  clear: () => void;
}

function fromDB(row: any): Task {
  return {
    id: row.id, title: row.title, description: row.description,
    priority: row.priority, status: row.status,
    dueDate: row.due_date, canvasId: row.canvas_id,
    tags: row.tags || [], createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export const useTasksStore = create<TasksState>()((set, get) => ({
  tasks: [], userId: null,

  loadForUser: async (userId) => {
    set({ userId });
    const { data } = await supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    set({ tasks: (data || []).map(fromDB) });
  },

  createTask: (data) => {
    const userId = get().userId;
    const task: Task = {
      id: 't' + Date.now(), title: data.title || 'New Task',
      description: data.description, priority: data.priority || 'medium',
      status: 'todo', dueDate: data.dueDate, canvasId: data.canvasId,
      tags: data.tags || [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    set(s => ({ tasks: [task, ...s.tasks] }));
    if (userId) supabase.from('tasks').insert({
      id: task.id, user_id: userId, title: task.title, description: task.description,
      priority: task.priority, status: task.status, due_date: task.dueDate || null,
      canvas_id: task.canvasId || null, tags: task.tags,
      created_at: task.createdAt, updated_at: task.updatedAt,
    }).then();
    return task;
  },

  updateTask: (id, data) => {
    const userId = get().userId;
    set(s => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, ...data, updatedAt: new Date().toISOString() } : t) }));
    if (userId) {
      const patch: any = { updated_at: new Date().toISOString() };
      if (data.title !== undefined)       patch.title       = data.title;
      if (data.description !== undefined) patch.description = data.description;
      if (data.priority !== undefined)    patch.priority    = data.priority;
      if (data.status !== undefined)      patch.status      = data.status;
      if (data.dueDate !== undefined)     patch.due_date    = data.dueDate || null;
      if (data.tags !== undefined)        patch.tags        = data.tags;
      supabase.from('tasks').update(patch).eq('id', id).eq('user_id', userId).then();
    }
  },

  deleteTask: (id) => {
    const userId = get().userId;
    set(s => ({ tasks: s.tasks.filter(t => t.id !== id) }));
    if (userId) supabase.from('tasks').delete().eq('id', id).eq('user_id', userId).then();
  },

  completeTask: (id) => get().updateTask(id, { status: 'done' }),

  importFromCanvas: (assignments) => {
    const existing = new Set(get().tasks.map(t => t.canvasId).filter(Boolean));
    const newTasks = assignments.filter(a => !existing.has(String(a.id))).map(a => ({
      id: 't' + Date.now() + Math.random(), title: a.name,
      description: a.description?.replace(/<[^>]*>/g, '').slice(0, 200),
      priority: 'medium' as Priority, status: 'todo' as Status,
      dueDate: a.due_at || undefined, canvasId: String(a.id),
      tags: ['canvas'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }));
    if (newTasks.length) {
      set(s => ({ tasks: [...newTasks, ...s.tasks] }));
      const userId = get().userId;
      if (userId) supabase.from('tasks').insert(newTasks.map(t => ({
        id: t.id, user_id: userId, title: t.title, description: t.description,
        priority: t.priority, status: t.status, due_date: t.dueDate || null,
        canvas_id: t.canvasId, tags: t.tags, created_at: t.createdAt, updated_at: t.updatedAt,
      }))).then();
    }
    return newTasks.length;
  },

  clear: () => set({ tasks: [], userId: null }),
}));
