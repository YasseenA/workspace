import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Home, FileText, CheckSquare, Zap, Settings } from 'lucide-react-native';
import { useColors } from '../../lib/theme';

const TABS = [
  { id: 'home',     label: 'Home',     icon: Home,        route: '/home'      },
  { id: 'notes',    label: 'Notes',    icon: FileText,    route: '/notes'     },
  { id: 'tasks',    label: 'Tasks',    icon: CheckSquare, route: '/tasks'     },
  { id: 'ai',       label: 'AI',       icon: Zap,         route: '/ai-studio' },
  { id: 'settings', label: 'Settings', icon: Settings,    route: '/settings'  },
];

export default function TabBar() {
  const router   = useRouter();
  const pathname = usePathname();
  const colors   = useColors();

  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: colors.card, borderTopColor: colors.border },
      ]}
    >
      {TABS.map(tab => {
        const active = pathname === tab.route || pathname.startsWith(tab.route + '/');
        return (
          <TouchableOpacity
            key={tab.id}
            onPress={() => router.push(tab.route as any)}
            style={styles.tab}
            activeOpacity={0.7}
          >
            <View style={[styles.pill, active && { backgroundColor: colors.primary + '1a' }]}>
              <tab.icon
                size={20}
                color={active ? colors.primary : colors.textTertiary}
                strokeWidth={active ? 2.5 : 1.5}
              />
            </View>
            <Text
              style={[
                styles.label,
                { color: active ? colors.primary : colors.textTertiary, fontWeight: active ? '600' : '400' },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
    ...(Platform.OS === 'web'
      ? ({ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100 } as any)
      : {}),
  },
  tab:   { flex: 1, alignItems: 'center', gap: 3 },
  pill:  { width: 46, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11 },
});
