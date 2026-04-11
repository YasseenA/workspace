import { Redirect } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { useAuthStore } from '../store/auth';

export default function Index() {
  const { isSignedIn, isLoaded } = useAuth();
  const { hasOnboarded } = useAuthStore();

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/landing" />;
  if (!hasOnboarded) return <Redirect href="/onboarding" />;
  return <Redirect href="/home" />;
}
