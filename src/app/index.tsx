import { Redirect } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { useAuthStore } from '../store/auth';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { isSignedIn, isLoaded } = useAuth();
  const { hasOnboarded, isLoading } = useAuthStore();

  // Wait for Clerk to load
  if (!isLoaded) return null;

  // Not signed in → always show landing
  if (!isSignedIn) return <Redirect href="/landing" />;

  // Signed in but Supabase profile still loading → spinner
  if (isLoading) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f7ff' }}>
      <ActivityIndicator size="large" color="#7c3aed" />
    </View>
  );

  // Signed in + profile loaded
  if (!hasOnboarded) return <Redirect href="/onboarding" />;
  return <Redirect href="/home" />;
}
