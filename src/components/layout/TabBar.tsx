import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Home, FileText, CheckSquare, Zap, Settings } from 'lucide-react-native';
import { colors } from '../../lib/theme';

const TABS = [
  { id: 'home', label: 'Home', icon: Home, route: '/home' },
  { id: 'notes', label: 'Notes', icon: FileText, route: '/notes' },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare, route: '/tasks' },
  { id: 'ai', label: 'AI Studio', icon: Zap, route: '/ai-studio' },
  { id: 'settings', label: 'Settings', icon: Settings, route: '/settings' },
];

export default function TabBar() {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <View style={styles.bar}>
      {TABS.map(tab => {
        const active = pathname === tab.route || pathname.startsWith(tab.route + '/');
        return (
          <TouchableOpacity key={tab.id} onPress={() => router.push(tab.route as any)} style={styles.tab}>
            <tab.icon size={22} color={active ? colors.primary : colors.textTertiary} strokeWidth={active ? 2.5 : 1.5} />
            <Text style={[styles.label, { color: active ? colors.primary : colors.textTertiary, fontWeight: active ? '600' : '400' }]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
const styles = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 0.5, borderTopColor: '#e2e8f0', paddingBottom: 20, paddingTop: 8 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  label: { fontSize: 10, marginTop: 3 },
});
