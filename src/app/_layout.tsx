import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ClerkProvider } from '@clerk/clerk-expo';
import { useSettingsStore } from '../store/settings';

const CLERK_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

function ThemedStatusBar() {
  const darkMode = useSettingsStore(s => s.darkMode);
  return <StatusBar style={darkMode ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={CLERK_KEY}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <Stack screenOptions={{ headerShown: false }} />
          <ThemedStatusBar />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ClerkProvider>
  );
}
