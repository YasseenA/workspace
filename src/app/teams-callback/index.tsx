import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { exchangeCode } from '../../lib/teams';
import { useTeamsStore } from '../../store/teams';

export default function TeamsCallback() {
  const router = useRouter();
  const { connectWithToken } = useTeamsStore();
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code   = params.get('code');
        const err    = params.get('error_description') || params.get('error');

        if (err) throw new Error(err);
        if (!code) throw new Error('No authorization code received.');

        const { access_token } = await exchangeCode(code);
        await connectWithToken(access_token);
        router.replace('/teams');
      } catch (e: any) {
        setError(e.message || 'Sign-in failed.');
        setTimeout(() => router.replace('/teams'), 3000);
      }
    };
    run();
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f7ff', gap: 16 }}>
      {error ? (
        <>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#dc2626' }}>Connection failed</Text>
          <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', maxWidth: 300 }}>{error}</Text>
          <Text style={{ fontSize: 13, color: '#9ca3af' }}>Redirecting back...</Text>
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color="#5865f2" />
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151' }}>Connecting Microsoft Teams...</Text>
        </>
      )}
    </View>
  );
}
