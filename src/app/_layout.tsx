import React from 'react';
import { View, Text } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../store/auth';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {error: Error | null}> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#fff' }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: 'red', marginBottom: 12 }}>App Error</Text>
          <Text style={{ fontSize: 14, color: '#333', textAlign: 'center' }}>{err.message}</Text>
          <Text style={{ fontSize: 11, color: '#666', marginTop: 12, textAlign: 'center' }}>{err.stack?.slice(0, 400)}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="auth/login" />
            <Stack.Screen name="auth/register" />
            <Stack.Screen name="onboarding/index" />
            <Stack.Screen name="home/index" />
            <Stack.Screen name="notes/index" />
            <Stack.Screen name="notes/editor" />
            <Stack.Screen name="tasks/index" />
            <Stack.Screen name="ai-studio/index" />
            <Stack.Screen name="canvas/index" />
            <Stack.Screen name="focus/index" />
            <Stack.Screen name="settings/index" />
            <Stack.Screen name="settings/grades" />
          </Stack>
          <StatusBar style="auto" />
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
