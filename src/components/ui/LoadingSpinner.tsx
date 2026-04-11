import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useColors } from '../../lib/theme';

export default function LoadingSpinner({ message }: { message?: string }) {
  const colors = useColors();
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      {message && <Text style={[styles.text, { color: colors.textSecondary }]}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  text:      { fontSize: 14 },
});
