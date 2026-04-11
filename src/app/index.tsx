import { Redirect } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { useAuthStore } from '../store/auth';

export default function Index() {
  const { isSignedIn, isLoaded } = useAuth();
  const { hasOnboarded } = useAuthStore();

  if (!isLoaded) return null; // wait for Clerk to initialise
  if (!isSignedIn) return <Redirect href="/auth/login" />;
  if (!hasOnboarded) return <Redirect href="/onboarding" />;
  return <Redirect href="/home" />;
}
