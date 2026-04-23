import { create } from 'zustand';
import { supabase, bgSync } from '../lib/supabase';

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
  notes: Note[]; notebooks: Notebook[]; userId: string | null;
  setUserId: (id: string) => void;
  loadForUser: (userId: string) => Promise<void>;
  createNote: (data: Partial<Note>) => Note;
  updateNote: (id: string, data: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  togglePin: (id: string) => void;
  toggleFavorite: (id: string) => void;
  createNotebook: (name: string, color: string) => Notebook;
  clear: () => void;
}

function toPlainText(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1').replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1').replace(/~~(.+?)~~/g, '$1')
    .replace(/^#{1,6}\s+/gm, '').replace(/^[-*]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '').replace(/^>\s+/gm, '')
    .replace(/`([^`]+)`/g, '$1').replace(/\s+/g, ' ').trim();
}

function cleanTitle(t: string): string {
  return t.replace(/\s*[—–-]+\s*$/, '').trim();
}

// Map DB snake_case → app camelCase
function fromDB(row: any): Note {
  return {
    id: row.id, title: row.title, content: row.content || '',
    excerpt: row.excerpt || '', notebookId: row.notebook_id || '',
    tags: row.tags || [], isPinned: row.is_pinned || false,
    isFavorite: row.is_favorite || false, wordCount: row.word_count || 0,
    images: row.images || [], createdAt: row.created_at, updatedAt: row.updated_at,
  };
}
function notebookFromDB(row: any): Notebook {
  return { id: row.id, name: row.name, color: row.color, icon: row.icon || '📓', noteCount: 0 };
}

export const useNotesStore = create<NotesState>()((set, get) => ({
  notes: [], notebooks: [], userId: null,

  setUserId: (id) => set({ userId: id }),

  loadForUser: async (userId) => {
    set({ userId });
    const [{ data: notes }, { data: nbs }] = await Promise.all([
      supabase.from('notes').select('*').eq('user_id', userId).order('updated_at', { ascending: false }),
      supabase.from('notebooks').select('*').eq('user_id', userId),
    ]);
    set({ notes: (notes || []).map(fromDB), notebooks: (nbs || []).map(notebookFromDB) });
  },

  createNote: (data) => {
    const userId = get().userId;
    const title = cleanTitle(data.title || 'Untitled');
    const note: Note = {
      id: 'n' + Date.now(), title,
      content: data.content || '', excerpt: toPlainText(data.content || '').slice(0, 120),
      notebookId: data.notebookId || '', tags: data.tags || [],
      isPinned: false, isFavorite: false,
      wordCount: toPlainText(data.content || '').split(/\s+/).filter(Boolean).length,
      images: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    set(s => ({ notes: [note, ...s.notes] }));
    if (userId) bgSync(supabase.from('notes').insert({
      id: note.id, user_id: userId, title: note.title, content: note.content,
      excerpt: note.excerpt, notebook_id: note.notebookId || null, tags: note.tags,
      is_pinned: false, is_favorite: false, word_count: note.wordCount,
      images: [], created_at: note.createdAt, updated_at: note.updatedAt,
    }));
    return note;
  },

  updateNote: (id, data) => {
    const userId = get().userId;
    const title = data.title !== undefined ? cleanTitle(data.title) : undefined;
    set(s => ({
      notes: s.notes.map(n => n.id === id ? {
        ...n, ...data,
        title: title !== undefined ? title : n.title,
        updatedAt: new Date().toISOString(),
        excerpt: data.content !== undefined ? toPlainText(data.content).slice(0, 120) : n.excerpt,
        wordCount: data.content !== undefined ? toPlainText(data.content).split(/\s+/).filter(Boolean).length : n.wordCount,
      } : n)
    }));
    if (userId) {
      const patch: any = { updated_at: new Date().toISOString() };
      if (data.title !== undefined)     patch.title       = title;
      if (data.content !== undefined)   { patch.content = data.content; patch.excerpt = toPlainText(data.content).slice(0, 120); patch.word_count = toPlainText(data.content).split(/\s+/).filter(Boolean).length; }
      if (data.tags !== undefined)      patch.tags        = data.tags;
      if (data.notebookId !== undefined)patch.notebook_id = data.notebookId || null;
      if (data.images !== undefined)    patch.images      = data.images;
      if (data.isPinned !== undefined)  patch.is_pinned   = data.isPinned;
      if (data.isFavorite !== undefined)patch.is_favorite = data.isFavorite;
      bgSync(supabase.from('notes').update(patch).eq('id', id).eq('user_id', userId));
    }
  },

  deleteNote: (id) => {
    const userId = get().userId;
    set(s => ({ notes: s.notes.filter(n => n.id !== id) }));
    if (userId) bgSync(supabase.from('notes').delete().eq('id', id).eq('user_id', userId));
  },

  togglePin: (id) => {
    const note = get().notes.find(n => n.id === id);
    if (note) get().updateNote(id, { isPinned: !note.isPinned });
  },

  toggleFavorite: (id) => {
    const note = get().notes.find(n => n.id === id);
    if (note) get().updateNote(id, { isFavorite: !note.isFavorite });
  },

  createNotebook: (name, color) => {
    const userId = get().userId;
    const nb: Notebook = { id: 'nb' + Date.now(), name, color, icon: '📓', noteCount: 0 };
    set(s => ({ notebooks: [...s.notebooks, nb] }));
    if (userId) bgSync(supabase.from('notebooks').insert({ id: nb.id, user_id: userId, name, color, icon: '📓' }));
    return nb;
  },

  clear: () => set({ notes: [], notebooks: [], userId: null }),
}));
