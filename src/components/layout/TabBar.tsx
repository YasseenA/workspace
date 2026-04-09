import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Home, FileText, CheckSquare, Zap, Settings } from 'lucide-react-native';
import { useColors, colors } from '../../lib/theme';

const TABS = [
  { id: 'home', label: 'Home', icon: Home, route: '/home' },
  { id: 'notes', label: 'Notes', icon: FileText, route: '/notes' },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare, route: '/tasks' },
  { id: 'ai', label: 'AI', icon: Zap, route: '/ai-studio' },
  { id: 'settings', label: 'Settings', icon: Settings, route: '/settings' },
];

export default function TabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const colors = useColors();
  return (
    <View style={[styles.bar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
      {TABS.map(tab => {
        const active = pathname === tab.route || pathname.startsWith(tab.route + '/');
        return (
          <TouchableOpacity key={tab.id} onPress={() => router.push(tab.route as any)} style={styles.tab}>
            <tab.icon size={20} color={active ? colors.primary : colors.textTertiary} strokeWidth={active ? 2.5 : 1.5} />
            <Text style={[styles.label, { color: active ? colors.primary : colors.textTertiary, fontWeight: active ? '600' : '400' }]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 0.5,
    borderTopColor: '#e2e8f0',
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 6,
    ...(Platform.OS === 'web' ? {
      position: 'fixed' as any,
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 100,
    } : {}),
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 2, gap: 2 },
  label: { fontSize: 10, marginTop: 2 },
});
