import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { UserProfile } from '@clerk/clerk-react';
import { useColors } from '../../lib/theme';

export default function AccountScreen() {
  const colors = useColors();
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { borderBottomColor: colors.border }, Platform.OS === 'web' && { paddingTop: 60 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
      </View>
      <View style={{ flex: 1 }}>
        <UserProfile
          appearance={{
            elements: {
              rootBox: { width: '100%', height: '100%' },
              card: { borderRadius: 0, boxShadow: 'none', border: 'none', width: '100%' },
              navbar: { display: 'none' },
              pageScrollBox: { padding: 16 },
            },
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
