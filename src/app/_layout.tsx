import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { View, ActivityIndicator, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettingsStore } from '../store/settings';
import { useDataSync } from '../hooks/useDataSync';
import { initKeystore } from '../lib/keystore';
import ErrorBoundary from '../components/ErrorBoundary';

const CLERK_KEY = 'pk_live_Y2xlcmsud29ya3NwYWNlLWVkdS5jb20k';

// Keys managed by the keystore (API keys + provider preference)
const KEYSTORE_KEYS = ['ai_provider', 'user_claude_api_key', 'user_openai_api_key'];

// Clerk token cache — localStorage on web, AsyncStorage on native
const tokenCache = {
  async getToken(key: string) {
    if (Platform.OS === 'web') {
      try { return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null; } catch { return null; }
    }
    return AsyncStorage.getItem(key);
  },
  async saveToken(key: string, value: string) {
    if (Platform.OS === 'web') {
      try { if (typeof localStorage !== 'undefined') localStorage.setItem(key, value); } catch {}
      return;
    }
    await AsyncStorage.setItem(key, value);
  },
  async clearToken(key: string) {
    if (Platform.OS === 'web') {
      try { if (typeof localStorage !== 'undefined') localStorage.removeItem(key); } catch {}
      return;
    }
    await AsyncStorage.removeItem(key);
  },
};

function ThemedStatusBar() {
  const darkMode = useSettingsStore(s => s.darkMode);
  return <StatusBar style={darkMode ? 'light' : 'dark'} />;
}

function AppShell() {
  useDataSync();

  // Init keystore once on native so getKey() reads work synchronously throughout the app
  useEffect(() => {
    initKeystore(KEYSTORE_KEYS);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }} />
        <ThemedStatusBar />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

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
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="landing" />
            <Stack.Screen name="auth/login" />
            <Stack.Screen name="auth/register" />
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
    <ErrorBoundary>
      <ClerkProvider publishableKey={CLERK_KEY} tokenCache={tokenCache}>
        <AuthGate />
      </ClerkProvider>
    </ErrorBoundary>
  );
}
