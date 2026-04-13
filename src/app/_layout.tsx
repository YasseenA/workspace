import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ClerkProvider } from '@clerk/clerk-expo';
import { useSettingsStore } from '../store/settings';

const CLERK_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

// Persist Clerk tokens in localStorage on web (prevents logout on page refresh)
const tokenCache = {
  async getToken(key: string) {
    try { return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null; }
    catch { return null; }
  },
  async saveToken(key: string, value: string) {
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(key, value); }
    catch {}
  },
  async clearToken(key: string) {
    try { if (typeof localStorage !== 'undefined') localStorage.removeItem(key); }
    catch {}
  },
};

function ThemedStatusBar() {
  const darkMode = useSettingsStore(s => s.darkMode);
  return <StatusBar style={darkMode ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={CLERK_KEY} tokenCache={tokenCache}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <Stack screenOptions={{ headerShown: false }} />
          <ThemedStatusBar />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ClerkProvider>
  );
}
