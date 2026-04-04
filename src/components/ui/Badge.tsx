import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Variant = 'primary'|'success'|'warning'|'error'|'info'|'neutral';
interface Props { children: string; variant?: Variant; size?: 'sm'|'md'; }

const BG: Record<Variant,string> = { primary:'#e0e7ff', success:'#d1fae5', warning:'#fef3c7', error:'#fee2e2', info:'#dbeafe', neutral:'#f1f5f9' };
const TC: Record<Variant,string> = { primary:'#4338ca', success:'#065f46', warning:'#92400e', error:'#991b1b', info:'#1e40af', neutral:'#475569' };

export default function Badge({ children, variant='neutral', size='md' }: Props) {
  return (
    <View style={[styles.base, { backgroundColor: BG[variant], paddingHorizontal: size==='sm' ? 6 : 10, paddingVertical: size==='sm' ? 2 : 4 }]}>
      <Text style={[styles.text, { color: TC[variant], fontSize: size==='sm' ? 11 : 12 }]}>{children}</Text>
    </View>
  );
}
const styles = StyleSheet.create({ base: { borderRadius: 20, alignSelf: 'flex-start' }, text: { fontWeight: '600' } });
