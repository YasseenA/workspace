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

const MOCK_NOTEBOOKS: Notebook[] = [
  { id: 'nb1', name: 'Math', color: '#6366f1', icon: '📐', noteCount: 1 },
  { id: 'nb2', name: 'History', color: '#ef4444', icon: '📜', noteCount: 1 },
  { id: 'nb3', name: 'CS', color: '#10b981', icon: '💻', noteCount: 1 },
];

const MOCK_NOTES: Note[] = [
  { id: 'n1', title: 'Calculus - Derivatives', content: 'A derivative measures the rate of change of a function.\n\nKey rules:\n- Power rule: d/dx[xⁿ] = nxⁿ⁻¹\n- Product rule: d/dx[fg] = f\'g + fg\'\n- Chain rule: d/dx[f(g(x))] = f\'(g(x)) · g\'(x)', excerpt: 'A derivative measures the rate of change...', notebookId: 'nb1', tags: ['math','calculus'], isPinned: true, isFavorite: false, wordCount: 65, createdAt: new Date(Date.now()-86400000*2).toISOString(), updatedAt: new Date(Date.now()-3600000).toISOString() },
  { id: 'n2', title: 'WWI Causes', content: 'The main causes of World War I:\n1. Militarism\n2. Alliance System\n3. Imperialism\n4. Nationalism', excerpt: 'The main causes of World War I...', notebookId: 'nb2', tags: ['history','wwi'], isPinned: false, isFavorite: true, wordCount: 28, createdAt: new Date(Date.now()-86400000*5).toISOString(), updatedAt: new Date(Date.now()-86400000).toISOString() },
  { id: 'n3', title: 'Data Structures', content: 'Arrays - O(1) access\nLinked Lists - O(n) access\nHash Tables - O(1) average\nBST - O(log n)', excerpt: 'Core data structures...', notebookId: 'nb3', tags: ['cs','algorithms'], isPinned: false, isFavorite: false, wordCount: 22, createdAt: new Date(Date.now()-86400000*3).toISOString(), updatedAt: new Date(Date.now()-7200000).toISOString() },
];

export const useNotesStore = create<NotesState>()(
  persist(
    (set) => ({
      notes: MOCK_NOTES, notebooks: MOCK_NOTEBOOKS,
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
