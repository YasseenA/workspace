import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Shield, Database, Eye, Trash2, Download, Lock, AlertTriangle } from 'lucide-react-native';
import { useClerk } from '@clerk/clerk-expo';
import { useColors } from '../../lib/theme';
import { useNotesStore } from '../../store/notes';
import { useTasksStore } from '../../store/tasks';
import { useCanvasStore } from '../../store/canvas';
import { useFlashcardsStore } from '../../store/flashcards';
import { showAlert } from '../../utils/helpers';

export default function PrivacyScreen() {
  const colors  = useColors();
  const router  = useRouter();
  const { signOut } = useClerk();
  const { notes, clear: clearNotes } = useNotesStore();
  const { tasks, clear: clearTasks } = useTasksStore();
  const { disconnect } = useCanvasStore();
  const { decks, clear: clearDecks } = useFlashcardsStore();

  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  const handleDeleteData = () => {
    showAlert(
      'Delete All Data',
      'This will permanently delete all your notes, tasks, flashcard decks, and Canvas connection. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: () => {
            clearNotes();
            clearTasks();
            clearDecks();
            disconnect();
            showAlert('Done', 'All local data has been cleared.');
          },
        },
      ]
    );
  };

  const handleExportData = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      notes: notes.map(n => ({ title: n.title, content: n.content, createdAt: n.createdAt })),
      tasks: tasks.map(t => ({ title: t.title, status: t.status, dueDate: t.dueDate, priority: t.priority })),
      flashcardDecks: decks.map(d => ({ name: d.name, cardCount: d.cards.length })),
    };
    const json = JSON.stringify(exportData, null, 2);
    if (Platform.OS === 'web') {
      const blob = new Blob([json], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = 'workspace-data.json'; a.click();
      URL.revokeObjectURL(url);
    } else {
      showAlert('Export', 'Data export is available on the web version.');
    }
  };

  const Section = ({ title, children }: any) => (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>{title}</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );

  const Row = ({ icon: Icon, iconColor, label, subtitle, onPress, right, last = false }: any) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress && !right}
      activeOpacity={0.7}
      style={[styles.row, { borderBottomColor: colors.border }, !last && styles.rowBorder]}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconColor + '18' }]}>
        <Icon size={17} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
        {subtitle && <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 2 }}>{subtitle}</Text>}
      </View>
      {right}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }, Platform.OS === 'web' && { paddingTop: 60 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Privacy & Security</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 4 }} showsVerticalScrollIndicator={false}>

        {/* Info banner */}
        <View style={[styles.banner, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
          <Shield size={18} color={colors.primary} />
          <Text style={{ flex: 1, fontSize: 13, color: colors.text, lineHeight: 20 }}>
            Your data is stored securely in Supabase and never sold to third parties. AI requests are processed by Anthropic/OpenAI and not stored by Workspace.
          </Text>
        </View>

        <Section title="DATA STORED">
          <Row
            icon={Database} iconColor={colors.primary}
            label="Notes & Notebooks"
            subtitle={`${notes.length} notes stored in your account`}
            last={false}
          />
          <Row
            icon={Database} iconColor="#10b981"
            label="Tasks"
            subtitle={`${tasks.length} tasks stored in your account`}
            last={false}
          />
          <Row
            icon={Database} iconColor="#f97316"
            label="Flashcard Decks"
            subtitle={`${decks.length} decks stored in your account`}
            last={false}
          />
          <Row
            icon={Database} iconColor="#f59e0b"
            label="Focus Session Log"
            subtitle="Last 30 days of focus sessions with subject labels"
            last
          />
        </Section>

        <Section title="SECURITY">
          <Row
            icon={Lock} iconColor="#8b5cf6"
            label="Change Password"
            subtitle="Opens your account security settings"
            onPress={() => router.push('/settings/account' as any)}
            last={false}
          />
          <Row
            icon={Eye} iconColor="#06b6d4"
            label="Active Sessions"
            subtitle="View and revoke active sessions"
            onPress={() => router.push('/settings/account' as any)}
            last
          />
        </Section>

        <Section title="YOUR DATA">
          <Row
            icon={Download} iconColor="#10b981"
            label="Export My Data"
            subtitle="Download a JSON copy of your notes, tasks, and decks"
            onPress={handleExportData}
            last={false}
          />
          <Row
            icon={Trash2} iconColor={colors.error}
            label="Delete All Data"
            subtitle="Permanently removes all notes, tasks, and flashcards"
            onPress={handleDeleteData}
            last
          />
        </Section>

        <Section title="ABOUT">
          <Row
            icon={Shield} iconColor={colors.textTertiary}
            label="What data does Workspace collect?"
            subtitle="Notes, tasks, focus sessions, Canvas assignments, and settings. No tracking, no ads."
            last={false}
          />
          <Row
            icon={AlertTriangle} iconColor={colors.textTertiary}
            label="Canvas API tokens"
            subtitle="Stored encrypted in your Supabase account, never exposed to other users."
            last
          />
        </Section>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header:  { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title:   { fontSize: 17, fontWeight: '700' },

  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 8 },

  section:      { marginBottom: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 7, marginLeft: 2 },
  card:         { borderRadius: 18, borderWidth: 0.5, overflow: 'hidden' },

  row:      { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rowBorder:{ borderBottomWidth: 0.5 },
  rowIcon:  { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowLabel: { fontSize: 15, fontWeight: '500' },
});
