import React from 'react';
import { View, ViewProps } from 'react-native';
import { useColors, radius } from '../../lib/theme';

interface Props extends ViewProps { padding?: boolean; elevated?: boolean; }

export default function Card({ padding=true, elevated=false, style, children, ...props }: Props) {
  const colors = useColors();
  return (
    <View style={[
      { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 0.5, borderColor: colors.border },
      padding && { padding: 16 },
      elevated && { shadowColor: '#000', shadowOffset: { width:0, height:4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
      style,
    ]} {...props}>{children}</View>
  );
}
