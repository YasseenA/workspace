import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search, GraduationCap } from 'lucide-react-native';
import { useColors } from '../../lib/theme';
import { useAuthStore } from '../../store/auth';
import { SCHOOLS, findSchool, type School } from '../../lib/schools';

export default function SchoolSettingsScreen() {
  const router  = useRouter();
  const colors  = useColors();
  const { appData, updateAppData } = useAuthStore();
  const [query, setQuery] = useState('');
  const IS_WEB = Platform.OS === 'web';

  const results = findSchool(query).slice(0, 30);

  const select = (school: School) => {
    updateAppData({ school: school.name, canvasBaseUrl: school.canvasUrl });
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { borderColor: colors.border }]}>
          <ArrowLeft size={18} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>Change School</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        {/* Current school */}
        <View style={[styles.currentCard, { backgroundColor: '#7c3aed18', borderColor: '#7c3aed40' }]}>
          <GraduationCap size={18} color="#7c3aed" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#7c3aed', textTransform: 'uppercase', letterSpacing: 0.5 }}>Current School</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 2 }}>{appData.school}</Text>
          </View>
        </View>

        {/* Search */}
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search size={15} color={colors.textTertiary} />
          {IS_WEB ? (
            <input
              value={query}
              onChange={(e: any) => setQuery(e.target.value)}
              placeholder="Search schools…"
              autoFocus
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontSize: 15, color: colors.text, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                minWidth: 0,
              } as any}
            />
          ) : (
            <TextInput
              value={query} onChangeText={setQuery}
              placeholder="Search schools…" placeholderTextColor={colors.textTertiary}
              autoFocus style={{ flex: 1, fontSize: 15, color: colors.text }}
            />
          )}
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Text style={{ color: colors.textTertiary, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* List */}
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ marginTop: 8 }}>
          {results.map(school => {
            const isCurrent = appData.school === school.name;
            return (
              <TouchableOpacity
                key={school.canvasUrl}
                onPress={() => select(school)}
                style={[
                  styles.row,
                  {
                    backgroundColor: isCurrent ? '#7c3aed18' : colors.card,
                    borderColor: isCurrent ? '#7c3aed50' : colors.border,
                  },
                ]}
              >
                <Text style={{ fontSize: 20 }}>{school.emoji}</Text>
                <View style={{ flex: 1, gap: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{school.name}</Text>
                  <Text style={{ fontSize: 11, color: colors.textTertiary }}>{school.location}</Text>
                </View>
                {isCurrent && (
                  <View style={[styles.badge, { backgroundColor: '#7c3aed' }]}>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
          {results.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <Text style={{ fontSize: 28, marginBottom: 8 }}>🔍</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center' }}>No schools found for "{query}"</Text>
            </View>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: 0.5 },
  backBtn:    { width: 36, height: 36, borderRadius: 11, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  currentCard:{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, marginVertical: 14 },
  searchBox:  { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  row:        { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: 12, borderWidth: 1, marginBottom: 7 },
  badge:      { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
