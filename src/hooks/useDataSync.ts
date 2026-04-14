import { useEffect } from 'react';
import { useUser } from '@clerk/clerk-expo';
import { useAuthStore }       from '../store/auth';
import { useNotesStore }      from '../store/notes';
import { useTasksStore }      from '../store/tasks';
import { useFocusStore }      from '../store/focus';
import { useSettingsStore }   from '../store/settings';
import { useStudyBuddyStore } from '../store/studyBuddy';
import { useCanvasStore }     from '../store/canvas';

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

  useEffect(() => {
    if (!isLoaded) return;

    if (user?.id) {
      const uid = user.id;
      // Load all stores in parallel
      Promise.all([
        authStore.loadForUser(uid),
        notesStore.loadForUser(uid),
        tasksStore.loadForUser(uid),
        focusStore.loadForUser(uid),
        settingsStore.loadForUser(uid),
        studyBuddyStore.loadForUser(uid),
      ]).then(() => {
        // Load canvas with the token from auth store
        const token = authStore.canvasToken;
        canvasStore.loadForUser(uid, token);
      });
    } else {
      // Signed out — clear everything
      authStore.resetAppState();
      notesStore.clear();
      tasksStore.clear();
      focusStore.clear();
      settingsStore.clear();
      studyBuddyStore.clear();
      canvasStore.clear();
    }
  }, [user?.id, isLoaded]);
}
