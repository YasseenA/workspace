import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { View, ActivityIndicator } from 'react-native';
import { useSettingsStore } from '../store/settings';
import { useDataSync } from '../hooks/useDataSync';

const CLERK_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';

const tokenCache = {
  async getToken(key: string) {
    try { return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null; }
    catch { return null; }
  },
  async saveToken(key: string, value: string) {
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(key, value); } catch {}
  },
  async clearToken(key: string) {
    try { if (typeof localStorage !== 'undefined') localStorage.removeItem(key); } catch {}
  },
};

function ThemedStatusBar() {
  const darkMode = useSettingsStore(s => s.darkMode);
  return <StatusBar style={darkMode ? 'light' : 'dark'} />;
}

// Inner app — only rendered when signed in
function AppShell() {
  useDataSync(); // load all Supabase data when user changes
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }} />
        <ThemedStatusBar />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Auth gate — shows sign-in if not authenticated
function AuthGate() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f7ff' }}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  if (!isSignedIn) {
    // Redirect to landing/sign-in page
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="landing" />
          </Stack>
          <StatusBar style="dark" />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return <AppShell />;
}

export default function RootLayout() {
  if (!CLERK_KEY) {
    // Dev fallback — no auth
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <Stack screenOptions={{ headerShown: false }} />
          <StatusBar style="dark" />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <ClerkProvider publishableKey={CLERK_KEY} tokenCache={tokenCache}>
      <AuthGate />
    </ClerkProvider>
  );
}
