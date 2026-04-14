import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Note {
  id: string; title: string; content: string; excerpt: string;
  notebookId: string; tags: string[]; isPinned: boolean; isFavorite: boolean;
  wordCount: number; createdAt: string; updatedAt: string;
  images?: string[];
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

// Strip HTML tags and clean up markdown symbols for plain-text preview
function toPlainText(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, ' ')   // strip HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')  // bold+italic
    .replace(/\*\*(.+?)\*\*/g, '$1')       // bold
    .replace(/\*(.+?)\*/g, '$1')           // italic
    .replace(/~~(.+?)~~/g, '$1')           // strikethrough
    .replace(/^#{1,6}\s+/gm, '')           // headings
    .replace(/^[-*]\s+/gm, '')             // bullets
    .replace(/^\d+\.\s+/gm, '')            // numbered list
    .replace(/^>\s+/gm, '')                // blockquote
    .replace(/`([^`]+)`/g, '$1')           // inline code
    .replace(/\s+/g, ' ')
    .trim();
}

// Strip trailing em dashes and trailing punctuation from template titles
function cleanTitle(t: string): string {
  return t.replace(/\s*[—–-]+\s*$/, '').trim();
}

export const useNotesStore = create<NotesState>()(
  persist(
    (set) => ({
      notes: [], notebooks: [],
      createNote: (data) => {
        const rawTitle = data.title || 'Untitled';
        const note: Note = {
          id: 'n' + Date.now(), title: cleanTitle(rawTitle),
          content: data.content || '', excerpt: toPlainText(data.content || '').slice(0, 120),
          notebookId: data.notebookId || 'nb1', tags: data.tags || [],
          isPinned: false, isFavorite: false,
          wordCount: toPlainText(data.content || '').split(/\s+/).filter(Boolean).length,
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        };
        set(s => ({ notes: [note, ...s.notes] }));
        return note;
      },
      updateNote: (id, data) => set(s => ({
        notes: s.notes.map(n => n.id === id ? {
          ...n, ...data,
          title: data.title !== undefined ? cleanTitle(data.title) : n.title,
          updatedAt: new Date().toISOString(),
          excerpt: data.content !== undefined ? toPlainText(data.content).slice(0, 120) : n.excerpt,
          wordCount: data.content !== undefined ? toPlainText(data.content).split(/\s+/).filter(Boolean).length : n.wordCount,
        } : n)
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
