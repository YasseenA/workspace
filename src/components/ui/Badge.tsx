import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Variant = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface Props {
  children: string;
  variant?: Variant;
  size?:    'sm' | 'md';
}

const BG: Record<Variant, string> = {
  primary: '#ede9fe',
  success: '#d1fae5',
  warning: '#fef3c7',
  error:   '#fee2e2',
  info:    '#dbeafe',
  neutral: '#f1f0f8',
};
const TC: Record<Variant, string> = {
  primary: '#6d28d9',
  success: '#065f46',
  warning: '#92400e',
  error:   '#991b1b',
  info:    '#1e40af',
  neutral: '#4b4b6b',
};

export default function Badge({ children, variant = 'neutral', size = 'md' }: Props) {
  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor:  BG[variant],
          paddingHorizontal: size === 'sm' ? 7  : 10,
          paddingVertical:   size === 'sm' ? 2  : 4,
        },
      ]}
    >
      <Text style={[styles.text, { color: TC[variant], fontSize: size === 'sm' ? 11 : 12 }]}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 20, alignSelf: 'flex-start' },
  text: { fontWeight: '600' },
});
