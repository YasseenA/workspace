import React, { useState } from 'react';
import { View, Text, TextInput, TextInputProps, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useColors, radius } from '../../lib/theme';

interface Props extends TextInputProps {
  label?:           string;
  error?:           string;
  hint?:            string;
  leftIcon?:        React.ReactNode;
  rightIcon?:       React.ReactNode;
  onRightIconPress?: () => void;
}

export default function Input({
  label, error, hint, leftIcon, rightIcon, onRightIconPress, style, ...props
}: Props) {
  const [focused, setFocused] = useState(false);
  const colors = useColors();

  return (
    <View style={{ marginBottom: 4 }}>
      {label && (
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 7, letterSpacing: 0.2 }}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.card,
            borderColor: error ? colors.error : focused ? colors.primary : colors.border,
            borderWidth: focused ? 1.5 : 1,
          },
        ]}
      >
        {leftIcon && <View style={{ marginRight: 10 }}>{leftIcon}</View>}
        <TextInput
          style={[
            styles.input,
            { color: colors.text },
            Platform.OS === 'web' ? ({ outlineWidth: 0 } as any) : {},
            style,
          ]}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholderTextColor={colors.textTertiary}
          {...props}
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} style={{ marginLeft: 8 }}>
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={{ fontSize: 12, color: colors.error,        marginTop: 5 }}>{error}</Text>}
      {hint && !error && <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 5 }}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems:    'center',
    borderRadius:  radius.lg,
    paddingHorizontal: 14,
    paddingVertical:   13,
  },
  input: { flex: 1, fontSize: 15 },
});
