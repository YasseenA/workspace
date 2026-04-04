import React, { useState } from 'react';
import { View, Text, TextInput, TextInputProps, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius } from '../../lib/theme';

interface Props extends TextInputProps {
  label?: string; error?: string; hint?: string;
  leftIcon?: React.ReactNode; rightIcon?: React.ReactNode; onRightIconPress?: () => void;
}

export default function Input({ label, error, hint, leftIcon, rightIcon, onRightIconPress, style, ...props }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 4 }}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.container, focused && styles.focused, !!error && styles.errored]}>
        {leftIcon && <View style={{ marginRight: 8 }}>{leftIcon}</View>}
        <TextInput style={[styles.input, style]} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholderTextColor={colors.textTertiary} {...props} />
        {rightIcon && <TouchableOpacity onPress={onRightIconPress} style={{ marginLeft: 8 }}>{rightIcon}</TouchableOpacity>}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      {hint && !error && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}
const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '500', color: colors.textSecondary, marginBottom: 6 },
  container: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: colors.card },
  focused: { borderColor: colors.primary, borderWidth: 1.5 },
  errored: { borderColor: colors.error },
  input: { flex: 1, fontSize: 15, color: colors.text },
  error: { fontSize: 12, color: colors.error, marginTop: 4 },
  hint: { fontSize: 12, color: colors.textTertiary, marginTop: 4 },
});
