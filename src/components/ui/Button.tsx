import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps, StyleSheet, View } from 'react-native';
import { useColors, radius } from '../../lib/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
type Size    = 'sm' | 'md' | 'lg';

interface Props extends TouchableOpacityProps {
  children: React.ReactNode;
  variant?:   Variant;
  size?:      Size;
  loading?:   boolean;
  leftIcon?:  React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const PV: Record<Size, number> = { sm: 9,  md: 13, lg: 17 };
const PH: Record<Size, number> = { sm: 14, md: 18, lg: 26 };
const FS: Record<Size, number> = { sm: 13, md: 15, lg: 17 };

export default function Button({
  children, variant = 'primary', size = 'md',
  loading, leftIcon, rightIcon, fullWidth, disabled, style, ...props
}: Props) {
  const c = useColors();

  const BG: Record<Variant, string> = {
    primary:   c.primary,
    secondary: c.bgSecondary,
    outline:   'transparent',
    ghost:     'transparent',
    danger:    c.error,
    success:   c.success,
  };
  const TC: Record<Variant, string> = {
    primary:   '#fff',
    secondary: c.text,
    outline:   c.primary,
    ghost:     c.textSecondary,
    danger:    '#fff',
    success:   '#fff',
  };
  const BC: Record<Variant, string> = {
    primary:   c.primary,
    secondary: c.border,
    outline:   c.border,
    ghost:     'transparent',
    danger:    c.error,
    success:   c.success,
  };

  return (
    <TouchableOpacity
      style={[
        styles.base,
        {
          backgroundColor: BG[variant],
          borderColor:     BC[variant],
          paddingVertical:   PV[size],
          paddingHorizontal: PH[size],
          opacity:     (disabled || loading) ? 0.5 : 1,
          alignSelf:   fullWidth ? undefined : 'auto',
          width:       fullWidth ? '100%' : undefined,
        },
        style,
      ]}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={TC[variant]} />
      ) : (
        <>
          {leftIcon  && <View style={{ marginRight: 7 }}>{leftIcon}</View>}
          {typeof children === 'string'
            ? <Text style={{ color: TC[variant], fontWeight: '600', fontSize: FS[size], letterSpacing: 0.1 }}>{children}</Text>
            : children}
          {rightIcon && <View style={{ marginLeft: 7 }}>{rightIcon}</View>}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.lg,
  },
});
