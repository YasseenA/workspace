import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../lib/theme';
import Button from './Button';

interface Props { icon: React.ReactNode; title: string; message: string; action?: { label: string; onPress: () => void }; }

export default function EmptyState({ icon, title, message, action }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>{icon}</View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {action && <Button variant="primary" onPress={action.onPress} style={{ marginTop: 16 }}>{action.label}</Button>}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  iconWrap: { marginBottom: 16, opacity: 0.4 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8, textAlign: 'center' },
  message: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
