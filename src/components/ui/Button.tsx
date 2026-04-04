import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps, StyleSheet, View } from 'react-native';
import { colors, radius } from '../../lib/theme';

type Variant = 'primary'|'secondary'|'outline'|'ghost'|'danger'|'success';
type Size = 'sm'|'md'|'lg';

interface Props extends TouchableOpacityProps {
  children: React.ReactNode; variant?: Variant; size?: Size;
  loading?: boolean; leftIcon?: React.ReactNode; rightIcon?: React.ReactNode; fullWidth?: boolean;
}

const BG: Record<Variant,string> = { primary: colors.primary, secondary: '#f1f5f9', outline: 'transparent', ghost: 'transparent', danger: colors.error, success: colors.success };
const TC: Record<Variant,string> = { primary: '#fff', secondary: colors.text, outline: colors.text, ghost: colors.textSecondary, danger: '#fff', success: '#fff' };
const BC: Record<Variant,string> = { primary: colors.primary, secondary: '#f1f5f9', outline: colors.border, ghost: 'transparent', danger: colors.error, success: colors.success };
const PV: Record<Size,number> = { sm: 8, md: 12, lg: 16 };
const PH: Record<Size,number> = { sm: 12, md: 16, lg: 24 };
const FS: Record<Size,number> = { sm: 13, md: 15, lg: 17 };

export default function Button({ children, variant='primary', size='md', loading, leftIcon, rightIcon, fullWidth, disabled, style, ...props }: Props) {
  return (
    <TouchableOpacity style={[styles.base, { backgroundColor: BG[variant], borderColor: BC[variant], paddingVertical: PV[size], paddingHorizontal: PH[size], opacity: (disabled||loading) ? 0.5 : 1, alignSelf: fullWidth ? undefined : 'auto', width: fullWidth ? '100%' : undefined }, style]} disabled={disabled||loading} {...props}>
      {loading ? <ActivityIndicator size="small" color={TC[variant]} /> : (
        <>
          {leftIcon && <View style={{ marginRight: 6 }}>{leftIcon}</View>}
          {typeof children === 'string' ? <Text style={{ color: TC[variant], fontWeight: '600', fontSize: FS[size] }}>{children}</Text> : children}
          {rightIcon && <View style={{ marginLeft: 6 }}>{rightIcon}</View>}
        </>
      )}
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({ base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: radius.md } });
