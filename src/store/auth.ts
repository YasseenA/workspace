import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface AppUserData {
  school: string;
  canvasBaseUrl: string;
  major?: string;
  graduationYear?: number;
}

interface AuthState {
  appData: AppUserData;
  hasOnboarded: boolean;
  canvasToken: string | null;
  userId: string | null;
  loadForUser: (userId: string) => Promise<void>;
  updateAppData: (d: Partial<AppUserData>) => void;
  completeOnboarding: () => void;
  setCanvasToken: (t: string) => void;
  resetAppState: () => void;
}

const defaultAppData: AppUserData = {
  school: 'Bellevue College',
  canvasBaseUrl: 'https://canvas.bellevuecollege.edu',
};

export const useAuthStore = create<AuthState>()((set, get) => ({
  appData: defaultAppData,
  hasOnboarded: false,
  canvasToken: null,
  userId: null,

  loadForUser: async (userId) => {
    set({ userId });
    const { data, error } = await supabase.from('profiles')
      .select('school,canvas_base_url,has_onboarded,canvas_token')
      .eq('user_id', userId).single();

    if (error || !data) {
      // New user — create profile
      await supabase.from('profiles').insert({ user_id: userId });
      set({ hasOnboarded: false });
    } else {
      set({
        appData: {
          school: data.school || defaultAppData.school,
          canvasBaseUrl: data.canvas_base_url || defaultAppData.canvasBaseUrl,
        },
        hasOnboarded: data.has_onboarded || false,
        canvasToken: data.canvas_token || null,
      });
    }
  },

  updateAppData: (d) => {
    set(s => ({ appData: { ...s.appData, ...d } }));
    const { userId } = get();
    if (userId) {
      const patch: any = {};
      if (d.school)         patch.school          = d.school;
      if (d.canvasBaseUrl)  patch.canvas_base_url = d.canvasBaseUrl;
      supabase.from('profiles').update(patch).eq('user_id', userId).then();
    }
  },

  completeOnboarding: () => {
    set({ hasOnboarded: true });
    const { userId } = get();
    if (userId) supabase.from('profiles').update({ has_onboarded: true }).eq('user_id', userId).then();
  },

  setCanvasToken: (t) => {
    set({ canvasToken: t });
    const { userId } = get();
    if (userId) supabase.from('profiles').update({ canvas_token: t }).eq('user_id', userId).then();
  },

  resetAppState: () => set({ appData: defaultAppData, hasOnboarded: false, canvasToken: null, userId: null }),
}));
