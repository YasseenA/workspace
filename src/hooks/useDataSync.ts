import { useEffect } from 'react';
import { useUser } from '@clerk/clerk-expo';
import { setSupabaseUserId } from '../lib/supabase';
import { useAuthStore }       from '../store/auth';
import { useNotesStore }      from '../store/notes';
import { useTasksStore }      from '../store/tasks';
import { useFocusStore }      from '../store/focus';
import { useSettingsStore }   from '../store/settings';
import { useStudyBuddyStore } from '../store/studyBuddy';
import { useCanvasStore }     from '../store/canvas';
import { useTeamsStore }      from '../store/teams';
import { useFlashcardsStore } from '../store/flashcards';
import { useGCalStore }      from '../store/gcal';

// Loads all user data from Supabase when Clerk auth state changes.
// Call this once in the root layout.
export function useDataSync() {
  const { user, isLoaded } = useUser();
  const authStore       = useAuthStore();
  const notesStore      = useNotesStore();
  const tasksStore      = useTasksStore();
  const focusStore      = useFocusStore();
  const settingsStore   = useSettingsStore();
  const studyBuddyStore = useStudyBuddyStore();
  const canvasStore     = useCanvasStore();
  const teamsStore      = useTeamsStore();
  const flashcardsStore = useFlashcardsStore();
  const gcalStore       = useGCalStore();

  useEffect(() => {
    if (!isLoaded) return;

    if (user?.id) {
      const uid = user.id;
      setSupabaseUserId(uid);
      void (async () => {
        await authStore.loadForUser(uid);
        await canvasStore.loadForUser(uid);
        await Promise.all([
          notesStore.loadForUser(uid),
          tasksStore.loadForUser(uid),
          focusStore.loadForUser(uid),
          settingsStore.loadForUser(uid),
          studyBuddyStore.loadForUser(uid),
          teamsStore.loadForUser(uid),
          flashcardsStore.loadForUser(uid),
          gcalStore.loadForUser(uid),
        ]);
      })().catch(e => console.error('[sync] store load failed:', e));
    } else {
      authStore.resetAppState();
      notesStore.clear();
      tasksStore.clear();
      focusStore.clear();
      settingsStore.clear();
      studyBuddyStore.clear();
      canvasStore.clear();
      teamsStore.clear();
      flashcardsStore.clear();
      gcalStore.clear();
    }
  }, [user?.id, isLoaded]);
}
