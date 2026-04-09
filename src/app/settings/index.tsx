import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { User, Bell, Moon, Shield, HelpCircle, LogOut, ChevronRight, Brain, Link2, Timer, BookOpen, Star, ExternalLink, TrendingUp } from 'lucide-react-native';
import { useAuthStore } from '../../store/auth';
import { useCanvasStore } from '../../store/canvas';
import { useNotesStore } from '../../store/notes';
import { useTasksStore } from '../../store/tasks';
import { useFocusStore } from '../../store/focus';
import { useSettingsStore } from '../../store/settings';
import { Card, Badge } from '../../components/ui';
import TabBar from '../../components/layout/TabBar';
import { useColors } from '../../lib/theme';
import { initials, showAlert } from '../../utils/helpers';

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user, logout } = useAuthStore();
  const { connected: canvasConnected } = useCanvasStore();
  const { notes } = useNotesStore();
  const { tasks } = useTasksStore();
  const { sessions, totalFocusMinutes } = useFocusStore();
  const { darkMode, toggleDarkMode } = useSettingsStore();
  const [notifications, setNotifications] = useState(true);

  const handleLogout = () => {
    showAlert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => { logout(); router.replace('/auth/login'); } }
    ]);
  };

  const Row = ({ icon: Icon, color, label, value, onPress, right, last = false }: any) => (
    <TouchableOpacity onPress={onPress} disabled={!onPress && !right}
      style={[styles.row, { borderBottomColor: colors.border }, !last && styles.rowBorder]}>
      <View style={[styles.rowIcon, { backgroundColor: color + '20' }]}>
        <Icon size={17} color={color} />
      </View>
      <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
      {value && <Text style={[styles.rowValue, { color: colors.textSecondary }]}>{value}</Text>}
      {right || (onPress && <ChevronRight size={16} color={colors.textTertiary} />)}
    </TouchableOpacity>
  );

  const Section = ({ title, children }: any) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>{title}</Text>
      <Card padding={false}>{children}</Card>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

        <Card style={styles.profileCard}>
          <View style={[styles.profileAvatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.profileAvatarText}>{initials(user?.name || 'Student')}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { color: colors.text }]}>{user?.name || 'Student'}</Text>
            <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{user?.email || ''}</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
              <Badge variant="primary" size="sm">Free Plan</Badge>
              <Badge variant="neutral" size="sm">{user?.school || 'Bellevue College'}</Badge>
            </View>
          </View>
        </Card>

        <View style={styles.statsRow}>
          {[
            { label: 'Notes', value: notes.length, color: colors.primary },
            { label: 'Tasks', value: tasks.length, color: '#10b981' },
            { label: 'Sessions', value: sessions, color: '#8b5cf6' },
            { label: 'Focus hrs', value: Math.round(totalFocusMinutes / 60 * 10) / 10, color: '#f59e0b' },
          ].map(s => (
            <Card key={s.label} style={{ flex: 1 }} padding={false}>
              <View style={{ padding: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: s.color }}>{s.value}</Text>
                <Text style={{ fontSize: 10, color: colors.textTertiary, marginTop: 2 }}>{s.label}</Text>
              </View>
            </Card>
          ))}
        </View>

        <Section title="ACCOUNT">
          <Row icon={User} color={colors.primary} label="Edit Profile" onPress={() => showAlert('Coming soon')} />
          <Row icon={Shield} color="#8b5cf6" label="Privacy & Security" onPress={() => showAlert('Coming soon')} last />
        </Section>

        <Section title="INTEGRATIONS">
          <Row icon={Link2} color="#f59e0b" label="Canvas LMS" value={canvasConnected ? 'Connected' : 'Not connected'} onPress={() => router.push('/canvas')} />
          <Row icon={Brain} color="#8b5cf6" label="Claude AI" value="Configured" onPress={() => router.push('/ai-studio')} last />
        </Section>

        <Section title="PREFERENCES">
          <Row icon={Moon} color="#475569" label="Dark Mode"
            right={<Switch value={darkMode} onValueChange={toggleDarkMode} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={darkMode ? '#fff' : '#f4f3f4'} />} />
          <Row icon={Bell} color="#f59e0b" label="Notifications"
            right={<Switch value={notifications} onValueChange={setNotifications} trackColor={{ false: colors.border, true: colors.primary }} />} last />
        </Section>

        <Section title="TOOLS">
          <Row icon={BookOpen} color="#6366f1" label="Notes" value={`${notes.length} notes`} onPress={() => router.push('/notes')} />
          <Row icon={Timer} color="#f59e0b" label="Focus Timer" onPress={() => router.push('/focus')} />
          <Row icon={TrendingUp} color="#10b981" label="Grade Calculator" onPress={() => router.push('/settings/grades')} last />
        </Section>

        <Section title="ABOUT">
          <Row icon={Star} color="#f59e0b" label="Rate Workspace" onPress={() => showAlert('Thanks for using Workspace!')} />
          <Row icon={HelpCircle} color="#10b981" label="Help & Support" onPress={() => showAlert('Help & Support', 'Email: support@workspace.app')} />
          <Row icon={ExternalLink} color="#475569" label="Version" value="1.0.0" last />
        </Section>

        <TouchableOpacity onPress={handleLogout} style={[styles.logoutBtn, { backgroundColor: '#fef2f2', borderColor: '#fca5a5' }]}>
          <LogOut size={16} color={colors.error} />
          <Text style={[styles.logoutText, { color: colors.error }]}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={[styles.footer, { color: colors.textTertiary }]}>Workspace · Everything school, in one place</Text>
        <TabBar />
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 16 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  profileAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  profileAvatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  profileName: { fontSize: 17, fontWeight: '700' },
  profileEmail: { fontSize: 13 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginLeft: 2 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rowBorder: { borderBottomWidth: 0.5 },
  rowIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 15 },
  rowValue: { fontSize: 13, marginRight: 4 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 0.5, borderRadius: 12, padding: 14, marginBottom: 16 },
  logoutText: { fontSize: 15, fontWeight: '600' },
  footer: { textAlign: 'center', fontSize: 12, marginBottom: 8 },
});
