import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Home } from 'lucide-react-native';
import { useColors } from '../lib/theme';

export default function NotFoundScreen() {
  const colors = useColors();
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.container}>
        <Text style={[styles.code, { color: colors.textTertiary }]}>404</Text>
        <Text style={[styles.title, { color: colors.text }]}>Page not found</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          This page doesn't exist or has been moved.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace('/home')}
          style={[styles.btn, { backgroundColor: colors.primary }]}
        >
          <Home size={18} color="#fff" />
          <Text style={styles.btnText}>Go Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  code: { fontSize: 72, fontWeight: '800', letterSpacing: -2 },
  title: { fontSize: 22, fontWeight: '700', marginTop: 8 },
  subtitle: { fontSize: 15, marginTop: 8, textAlign: 'center', lineHeight: 22 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 32, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
