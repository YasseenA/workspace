import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { User, Bell, Moon, Shield, HelpCircle, LogOut, ChevronRight, Brain, Link2, Timer, BookOpen, Star, ExternalLink } from 'lucide-react-native';
import { useAuthStore } from '../../store/auth';
import { useCanvasStore } from '../../store/canvas';
import { useNotesStore } from '../../store/notes';
import { useTasksStore } from '../../store/tasks';
import { useFocusStore } from '../../store/focus';
import { Card, Badge, Button } from '../../components/ui';
import TabBar from '../../components/layout/TabBar';
import { colors } from '../../lib/theme';
import { initials } from '../../utils/helpers';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { connected: canvasConnected } = useCanvasStore();
  const { notes } = useNotesStore();
  const { tasks } = useTasksStore();
  const { sessions, totalFocusMinutes } = useFocusStore();
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [canvasAlerts, setCanvasAlerts] = useState(true);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => { logout(); router.replace('/auth/login'); } }
    ]);
  };

  const Row = ({ icon: Icon, color, label, value, onPress, right, last = false }: any) => (
    <TouchableOpacity onPress={onPress} disabled={!onPress && !right}
      style={[styles.row, !last && { borderBottomWidth: 0.5, borderBottomColor: colors.border }]}>
      <View style={[styles.rowIcon, { backgroundColor: color + '20' }]}>
        <Icon size={17} color={color} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      {value && <Text style={styles.rowValue}>{value}</Text>}
      {right || (onPress && <ChevronRight size={16} color={colors.textTertiary} />)}
    </TouchableOpacity>
  );

  const Section = ({ title, children }: any) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Card padding={false}>{children}</Card>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Settings</Text>

        {/* Profile card */}
        <Card style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{initials(user?.name || 'Student')}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{user?.name || 'Student'}</Text>
            <Text style={styles.profileEmail}>{user?.email || ''}</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
              <Badge variant="primary" size="sm">Free Plan</Badge>
              <Badge variant="neutral" size="sm">{user?.school || 'Bellevue College'}</Badge>
            </View>
          </View>
        </Card>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Notes', value: notes.length, color: colors.primary },
            { label: 'Tasks', value: tasks.length, color: '#10b981' },
            { label: 'Sessions', value: sessions, color: '#8b5cf6' },
            { label: 'Focus hrs', value: Math.round(totalFocusMinutes / 60 * 10) / 10, color: '#f59e0b' },
          ].map(s => (
            <Card key={s.label} style={styles.statCard} padding={false}>
              <View style={{ padding: 10, alignItems: 'center' }}>
                <Text style={[styles.statNum, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            </Card>
          ))}
        </View>

        <Section title="Account">
          <Row icon={User} color={colors.primary} label="Edit Profile" onPress={() => Alert.alert('Coming soon')} />
          <Row icon={Shield} color="#8b5cf6" label="Privacy & Security" onPress={() => Alert.alert('Coming soon')} last />
        </Section>

        <Section title="Integrations">
          <Row icon={Link2} color="#f59e0b" label="Canvas LMS"
            value={canvasConnected ? 'Connected' : 'Not connected'}
            onPress={() => router.push('/canvas')} />
          <Row icon={Brain} color="#8b5cf6" label="Claude AI" value="Configured" onPress={() => router.push('/ai-studio')} last />
        </Section>

        <Section title="Preferences">
          <Row icon={Moon} color="#475569" label="Dark Mode" right={<Switch value={darkMode} onValueChange={setDarkMode} trackColor={{ false: colors.border, true: colors.primary }} />} />
          <Row icon={Bell} color="#f59e0b" label="Notifications" right={<Switch value={notifications} onValueChange={setNotifications} trackColor={{ false: colors.border, true: colors.primary }} />} />
          <Row icon={Bell} color="#10b981" label="Canvas Alerts" right={<Switch value={canvasAlerts} onValueChange={setCanvasAlerts} trackColor={{ false: colors.border, true: colors.primary }} />} last />
        </Section>

        <Section title="Tools">
          <Row icon={BookOpen} color="#6366f1" label="Notes" value={`${notes.length} notes`} onPress={() => router.push('/notes')} />
          <Row icon={Timer} color="#f59e0b" label="Focus Timer" onPress={() => router.push('/focus')} last />
        </Section>

        <Section title="About">
          <Row icon={Star} color="#f59e0b" label="Rate Workspace" onPress={() => Alert.alert('Thanks for using Workspace!')} />
          <Row icon={HelpCircle} color="#10b981" label="Help & Support" onPress={() => Alert.alert('Coming soon')} />
          <Row icon={ExternalLink} color="#475569" label="Version" value="1.0.0" last />
        </Section>

        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <LogOut size={16} color={colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>Workspace · Everything school, in one place</Text>
      <TabBar />
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 16 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  profileAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  profileAvatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  profileName: { fontSize: 17, fontWeight: '700', color: colors.text },
  profileEmail: { fontSize: 13, color: colors.textSecondary },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1 },
  statNum: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 10, color: colors.textTertiary, marginTop: 2 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginLeft: 2 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rowIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 15, color: colors.text },
  rowValue: { fontSize: 13, color: colors.textSecondary, marginRight: 4 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fef2f2', borderWidth: 0.5, borderColor: '#fca5a5', borderRadius: 12, padding: 14, marginBottom: 16 },
  logoutText: { fontSize: 15, color: colors.error, fontWeight: '600' },
  footer: { textAlign: 'center', fontSize: 12, color: colors.textTertiary, marginBottom: 8 },
});
