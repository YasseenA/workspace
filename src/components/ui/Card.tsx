import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { colors, radius } from '../../lib/theme';

interface Props extends ViewProps { padding?: boolean; elevated?: boolean; }

export default function Card({ padding=true, elevated=false, style, children, ...props }: Props) {
  return <View style={[styles.card, padding && styles.padding, elevated && styles.elevated, style]} {...props}>{children}</View>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 0.5, borderColor: colors.border },
  padding: { padding: 16 },
  elevated: { shadowColor: '#000', shadowOffset: { width:0, height:4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
});
