import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/auth';

export default function Index() {
  const { isAuthenticated, hasOnboarded } = useAuthStore();
  if (!isAuthenticated) return <Redirect href="/auth/login" />;
  if (!hasOnboarded) return <Redirect href="/onboarding" />;
  return <Redirect href="/home" />;
}
