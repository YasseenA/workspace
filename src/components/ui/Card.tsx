import React from 'react';
import { View, ViewProps } from 'react-native';
import { useColors, radius, shadow } from '../../lib/theme';

interface Props extends ViewProps {
  padding?:  boolean;
  elevated?: boolean;
}

export default function Card({ padding = true, elevated = false, style, children, ...props }: Props) {
  const colors = useColors();
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius:    radius.xl,
          borderWidth:     0.5,
          borderColor:     colors.border,
        },
        padding   && { padding: 16 },
        elevated  && shadow.md,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
