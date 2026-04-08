import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Note {
  id: string; title: string; content: string; excerpt: string;
  notebookId: string; tags: string[]; isPinned: boolean; isFavorite: boolean;
  wordCount: number; createdAt: string; updatedAt: string;
}
export interface Notebook {
  id: string; name: string; color: string; icon: string; noteCount: number;
}

interface NotesState {
  notes: Note[]; notebooks: Notebook[];
  createNote: (data: Partial<Note>) => Note;
  updateNote: (id: string, data: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  togglePin: (id: string) => void;
  toggleFavorite: (id: string) => void;
  createNotebook: (name: string, color: string) => Notebook;
}

const webStorage = {
  getItem: (name: string) => { try { const v = typeof localStorage !== 'undefined' ? localStorage.getItem(name) : null; return v ? JSON.parse(v) : null; } catch { return null; } },
  setItem: (name: string, value: string) => { try { if (typeof localStorage !== 'undefined') localStorage.setItem(name, JSON.stringify(value)); } catch {} },
  removeItem: (name: string) => { try { if (typeof localStorage !== 'undefined') localStorage.removeItem(name); } catch {} },
};

export const useNotesStore = create<NotesState>()(
  persist(
    (set) => ({
      notes: [], notebooks: [],
      createNote: (data) => {
        const note: Note = {
          id: 'n' + Date.now(), title: data.title || 'Untitled',
          content: data.content || '', excerpt: (data.content || '').slice(0, 100),
          notebookId: data.notebookId || 'nb1', tags: data.tags || [],
          isPinned: false, isFavorite: false,
          wordCount: (data.content || '').split(/\s+/).filter(Boolean).length,
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        };
        set(s => ({ notes: [note, ...s.notes] }));
        return note;
      },
      updateNote: (id, data) => set(s => ({
        notes: s.notes.map(n => n.id === id ? { ...n, ...data, updatedAt: new Date().toISOString(), excerpt: data.content ? data.content.slice(0,100) : n.excerpt } : n)
      })),
      deleteNote: (id) => set(s => ({ notes: s.notes.filter(n => n.id !== id) })),
      togglePin: (id) => set(s => ({ notes: s.notes.map(n => n.id === id ? { ...n, isPinned: !n.isPinned } : n) })),
      toggleFavorite: (id) => set(s => ({ notes: s.notes.map(n => n.id === id ? { ...n, isFavorite: !n.isFavorite } : n) })),
      createNotebook: (name, color) => {
        const nb: Notebook = { id: 'nb' + Date.now(), name, color, icon: '📓', noteCount: 0 };
        set(s => ({ notebooks: [...s.notebooks, nb] }));
        return nb;
      },
    }),
    { name: 'workspace-notes', storage: webStorage }
  )
);
