import React from 'react';
import { View, StyleSheet } from 'react-native';
import TabBar from './TabBar';

export default function ScreenWithTabs({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.container}>
      <View style={{ flex: 1 }}>{children}</View>
      <TabBar />
    </View>
  );
}
const styles = StyleSheet.create({ container: { flex: 1 } });
