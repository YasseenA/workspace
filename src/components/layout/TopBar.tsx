import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { useColors } from '../../lib/theme';
import { initials } from '../../utils/helpers';

export default function TopBar() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useUser();

  const name = user?.fullName || user?.firstName || '';

  return (
    <View style={[
      styles.bar,
      { backgroundColor: colors.card, borderBottomColor: colors.border },
    ]}>
      {/* Logo */}
      <TouchableOpacity onPress={() => router.push('/')} style={styles.logo} activeOpacity={0.7}>
        <Image source={require('../../../assets/icon.png')} style={{ width: 30, height: 30 }} resizeMode="contain" />
        <Text style={[styles.logoText, { color: colors.text }]}>Workspace</Text>
      </TouchableOpacity>

      {/* Account avatar */}
      <TouchableOpacity
        onPress={() => router.push('/settings')}
        style={[styles.avatar, { backgroundColor: colors.primary }]}
        activeOpacity={0.8}
      >
        <Text style={styles.avatarText}>
          {name ? initials(name) : '?'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    ...(Platform.OS === 'web'
      ? ({ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100 } as any)
      : {}),
  },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  logoText: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },

  avatar: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
