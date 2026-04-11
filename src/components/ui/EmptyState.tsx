import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '../../lib/theme';
import Button from './Button';

interface Props {
  icon:     React.ReactNode;
  title:    string;
  message:  string;
  action?:  { label: string; onPress: () => void };
}

export default function EmptyState({ icon, title, message, action }: Props) {
  const colors = useColors();
  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
        {icon}
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
      {action && (
        <Button variant="primary" onPress={action.onPress} style={{ marginTop: 20, paddingHorizontal: 28 }}>
          {action.label}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  iconWrap:  { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title:     { fontSize: 19, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  message:   { fontSize: 14, textAlign: 'center', lineHeight: 21, opacity: 0.7 },
});
