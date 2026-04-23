import { create } from 'zustand';
import { supabase, bgSync } from '../lib/supabase';
import { initialCardState, reviewCard, isDue, type CardState, type SRSRating } from '../lib/srs';

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  state: CardState;
}

export interface FlashcardDeck {
  id: string;
  name: string;
  createdAt: string;
  cards: Flashcard[];
}

interface FlashcardsState {
  decks: FlashcardDeck[];
  userId: string | null;
  loadForUser: (userId: string) => Promise<void>;
  createDeck: (name: string, cards: { front: string; back: string }[]) => Promise<FlashcardDeck>;
  deleteDeck: (deckId: string) => void;
  renameDeck: (deckId: string, name: string) => void;
  rateCard: (deckId: string, cardId: string, rating: SRSRating) => void;
  dueCount: (deckId: string) => number;
  dueCards: (deckId: string) => Flashcard[];
  clear: () => void;
}

export const useFlashcardsStore = create<FlashcardsState>()((set, get) => ({
  decks: [],
  userId: null,

  loadForUser: async (userId) => {
    set({ userId });
    const { data } = await supabase
      .from('flashcard_decks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (data) {
      set({
        decks: data.map(r => ({
          id: r.id,
          name: r.name,
          createdAt: r.created_at,
          cards: (r.cards || []) as Flashcard[],
        })),
      });
    }
  },

  createDeck: async (name, rawCards) => {
    const { userId } = get();
    const deck: FlashcardDeck = {
      id: 'd' + Date.now(),
      name,
      createdAt: new Date().toISOString(),
      cards: rawCards.map((c, i) => ({
        id: `c${Date.now()}_${i}`,
        front: c.front,
        back: c.back,
        state: initialCardState(),
      })),
    };
    set(s => ({ decks: [deck, ...s.decks] }));
    if (userId) {
      await supabase.from('flashcard_decks').insert({
        id: deck.id,
        user_id: userId,
        name: deck.name,
        cards: deck.cards,
        created_at: deck.createdAt,
      });
    }
    return deck;
  },

  deleteDeck: (deckId) => {
    const { userId } = get();
    set(s => ({ decks: s.decks.filter(d => d.id !== deckId) }));
    if (userId) bgSync(supabase.from('flashcard_decks').delete().eq('id', deckId));
  },

  renameDeck: (deckId, name) => {
    const { userId } = get();
    set(s => ({ decks: s.decks.map(d => d.id === deckId ? { ...d, name } : d) }));
    if (userId) bgSync(supabase.from('flashcard_decks').update({ name }).eq('id', deckId));
  },

  rateCard: (deckId, cardId, rating) => {
    const { userId } = get();
    const decks = get().decks.map(d => {
      if (d.id !== deckId) return d;
      return {
        ...d,
        cards: d.cards.map(c =>
          c.id === cardId ? { ...c, state: reviewCard(c.state, rating) } : c
        ),
      };
    });
    set({ decks });
    const updated = decks.find(d => d.id === deckId);
    if (userId && updated) {
      bgSync(supabase.from('flashcard_decks').update({ cards: updated.cards }).eq('id', deckId));
    }
  },

  dueCount: (deckId) => {
    const deck = get().decks.find(d => d.id === deckId);
    return deck ? deck.cards.filter(c => isDue(c.state)).length : 0;
  },

  dueCards: (deckId) => {
    const deck = get().decks.find(d => d.id === deckId);
    return deck ? deck.cards.filter(c => isDue(c.state)) : [];
  },

  clear: () => set({ decks: [], userId: null }),
}));
