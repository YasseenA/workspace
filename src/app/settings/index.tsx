import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { User, Bell, Moon, Shield, HelpCircle, LogOut, ChevronRight, Brain, Link2, Timer, BookOpen, Star, ExternalLink, TrendingUp, CheckSquare } from 'lucide-react-native';
import { useAuthStore } from '../../store/auth';
import { useCanvasStore } from '../../store/canvas';
import { useNotesStore } from '../../store/notes';
import { useTasksStore } from '../../store/tasks';
import { useFocusStore } from '../../store/focus';
import { useSettingsStore } from '../../store/settings';
import { Badge } from '../../components/ui';
import TabBar from '../../components/layout/TabBar';
import { useColors } from '../../lib/theme';
import { initials, showAlert } from '../../utils/helpers';

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user, logout } = useAuthStore();
  const { connected: canvasConnected, courses } = useCanvasStore();
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
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress && !right}
      activeOpacity={0.7}
      style={[styles.row, { borderBottomColor: colors.border }, !last && styles.rowBorder]}>
      <View style={[styles.rowIcon, { backgroundColor: color + '18' }]}>
        <Icon size={17} color={color} />
      </View>
      <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
      {value && (
        <View style={{ backgroundColor: colors.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginRight: 6 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>{value}</Text>
        </View>
      )}
      {right || (onPress && <ChevronRight size={15} color={colors.textTertiary} />)}
    </TouchableOpacity>
  );

  const Section = ({ title, children }: any) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>{title}</Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );

  const focusHrs = Math.round(totalFocusMinutes / 60 * 10) / 10;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* Header banner */}
        <View style={[styles.banner, { backgroundColor: colors.primary }]}>
          <View style={styles.bannerShape1} />
          <View style={styles.bannerShape2} />
          <Text style={styles.bannerTitle}>Settings</Text>
          <Text style={styles.bannerSub}>Manage your workspace</Text>
        </View>

        {/* Profile card — overlaps banner */}
        <View style={{ paddingHorizontal: 16, marginTop: -28 }}>
          <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: '#000' }]}>
            <View style={[styles.profileAvatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.profileAvatarText}>{initials(user?.name || 'Student')}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.profileName, { color: colors.text }]}>{user?.name || 'Student'}</Text>
              <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{user?.email || 'student@bellevuecollege.edu'}</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                <Badge variant="primary" size="sm">Free Plan</Badge>
                <Badge variant="neutral" size="sm">{user?.school || 'Bellevue College'}</Badge>
                {canvasConnected && <Badge variant="success" size="sm">Canvas ✓</Badge>}
              </View>
            </View>
          </View>
        </View>

        {/* Stats row */}
        <View style={{ paddingHorizontal: 16, marginTop: 12, marginBottom: 4 }}>
          <View style={styles.statsRow}>
            {[
              { label: 'Notes', value: notes.length, color: colors.primary, icon: '📝' },
              { label: 'Tasks', value: tasks.length, color: '#10b981', icon: '✅' },
              { label: 'Sessions', value: sessions, color: '#8b5cf6', icon: '🧠' },
              { label: 'Focus hrs', value: focusHrs, color: '#f59e0b', icon: '⏱' },
            ].map(s => (
              <View key={s.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={{ fontSize: 18, marginBottom: 2 }}>{s.icon}</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: s.color }}>{s.value}</Text>
                <Text style={{ fontSize: 10, color: colors.textTertiary, marginTop: 1 }}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <Section title="ACCOUNT">
            <Row icon={User} color={colors.primary} label="Edit Profile" onPress={() => showAlert('Coming soon')} />
            <Row icon={Shield} color="#8b5cf6" label="Privacy & Security" onPress={() => showAlert('Coming soon')} last />
          </Section>

          <Section title="INTEGRATIONS">
            <Row icon={Link2} color="#f59e0b" label="Canvas LMS"
              value={canvasConnected ? `${courses.length} courses` : 'Not connected'}
              onPress={() => router.push('/canvas')} />
            <Row icon={Brain} color="#8b5cf6" label="Claude AI" value="Configured" onPress={() => router.push('/ai-studio')} last />
          </Section>

          <Section title="PREFERENCES">
            <Row icon={Moon} color={darkMode ? '#818cf8' : '#475569'} label="Dark Mode"
              right={
                <Switch
                  value={darkMode}
                  onValueChange={toggleDarkMode}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                />
              } />
            <Row icon={Bell} color="#f59e0b" label="Notifications"
              right={
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                />
              } last />
          </Section>

          <Section title="TOOLS">
            <Row icon={BookOpen} color="#6366f1" label="Notes" value={`${notes.length} notes`} onPress={() => router.push('/notes')} />
            <Row icon={CheckSquare} color="#10b981" label="Tasks" value={`${tasks.filter(t => t.status !== 'done').length} pending`} onPress={() => router.push('/tasks')} />
            <Row icon={Timer} color="#f59e0b" label="Focus Timer" value={`${sessions} sessions`} onPress={() => router.push('/focus')} />
            <Row icon={TrendingUp} color="#10b981" label="Grade Calculator" onPress={() => router.push('/settings/grades')} last />
          </Section>

          <Section title="ABOUT">
            <Row icon={Star} color="#f59e0b" label="Rate Workspace" onPress={() => showAlert('Thanks for using Workspace!')} />
            <Row icon={HelpCircle} color="#10b981" label="Help & Support" onPress={() => showAlert('Help & Support', 'Email: support@workspace.app')} />
            <Row icon={ExternalLink} color="#475569" label="Version" value="1.0.0" last />
          </Section>

          {/* Sign out */}
          <TouchableOpacity onPress={handleLogout} style={[styles.logoutBtn, { backgroundColor: colors.error + '10', borderColor: colors.error + '40' }]}>
            <LogOut size={16} color={colors.error} />
            <Text style={[styles.logoutText, { color: colors.error }]}>Sign Out</Text>
          </TouchableOpacity>

          <Text style={[styles.footer, { color: colors.textTertiary }]}>Workspace · Everything school, in one place</Text>
        </View>
      </ScrollView>

      <TabBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  banner: {
    height: 130, justifyContent: 'flex-end', padding: 20, paddingBottom: 44, overflow: 'hidden', position: 'relative',
  },
  bannerShape1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.08)', top: -60, right: -40,
  },
  bannerShape2: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.06)', top: 20, right: 80,
  },
  bannerTitle: { fontSize: 26, fontWeight: '800', color: '#fff' },
  bannerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16,
    borderRadius: 16, borderWidth: 0.5,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  profileAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  profileAvatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  profileName: { fontSize: 17, fontWeight: '700' },
  profileEmail: { fontSize: 13, marginTop: 1 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: {
    flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 0.5,
  },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6, marginLeft: 2 },
  sectionCard: { borderRadius: 14, borderWidth: 0.5, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rowBorder: { borderBottomWidth: 0.5 },
  rowIcon: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 15 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 16 },
  logoutText: { fontSize: 15, fontWeight: '600' },
  footer: { textAlign: 'center', fontSize: 12, marginBottom: 16 },
});
