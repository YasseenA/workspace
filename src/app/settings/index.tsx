import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  User, Bell, Moon, Shield, HelpCircle, LogOut,
  ChevronRight, Bot, Link2, Timer, BookOpen,
  Star, ExternalLink, TrendingUp, CheckSquare, Calendar, RotateCcw,
} from 'lucide-react-native';
import { useUser, useClerk } from '@clerk/clerk-expo';
import { useAuthStore }    from '../../store/auth';
import { GraduationCap }   from 'lucide-react-native';
import { useCanvasStore }  from '../../store/canvas';
import { useTeamsStore }   from '../../store/teams';
import { useGCalStore }    from '../../store/gcal';
import { ACCENT_COLORS }   from '../../store/settings';
import { useNotesStore }   from '../../store/notes';
import { useTasksStore }   from '../../store/tasks';
import { useFocusStore }   from '../../store/focus';
import { useSettingsStore }from '../../store/settings';
import TabBar from '../../components/layout/TabBar';
import TopBar from '../../components/layout/TopBar';
import { useColors } from '../../lib/theme';
import { initials, showAlert } from '../../utils/helpers';
import { getKey } from '../../lib/keystore';
import { requestPermission, fireTestNotification } from '../../lib/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user }                             = useUser();
  const { signOut }                          = useClerk();
  const { resetAppState, appData }           = useAuthStore();
  const { connected: canvasConnected, courses } = useCanvasStore();
  const { notes }                            = useNotesStore();
  const { tasks }                            = useTasksStore();
  const { sessions, totalFocusMinutes }      = useFocusStore();
  const { darkMode, toggleDarkMode, notificationsEnabled, setNotificationsEnabled, accentColor, setAccentColor } = useSettingsStore();
  const { connected: teamsConnected } = useTeamsStore();
  const { connected: gcalConnected } = useGCalStore();

  const focusHrs    = Math.round(totalFocusMinutes / 60 * 10) / 10;
  const pendingTasks = tasks.filter(t => t.status !== 'done').length;

  const handleLogout = () => {
    showAlert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { resetAppState(); await signOut(); router.replace('/landing'); } },
    ]);
  };

  const gradientStyle: any = Platform.OS === 'web'
    ? { background: 'linear-gradient(135deg, #7c3aed 0%, #4338ca 70%, #312e81 100%)' }
    : { backgroundColor: colors.primary };

  const Row = ({ icon: Icon, iconColor, label, value, onPress, right, last = false }: any) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress && !right}
      activeOpacity={0.7}
      style={[styles.row, { borderBottomColor: colors.border }, !last && styles.rowBorder]}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconColor + '18' }]}>
        <Icon size={17} color={iconColor} />
      </View>
      <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
      {value != null && (
        <View style={[styles.valuePill, { backgroundColor: colors.bg }]}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>{value}</Text>
        </View>
      )}
      {right ?? (onPress ? <ChevronRight size={15} color={colors.textTertiary} /> : null)}
    </TouchableOpacity>
  );

  const Section = ({ title, children }: any) => (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>{title}</Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar />
      <ScrollView contentContainerStyle={{ paddingBottom: 110, paddingTop: Platform.OS === 'web' ? 50 : 0 }} showsVerticalScrollIndicator={false}>

        {/* ── Banner ── */}
        <View style={[styles.banner, gradientStyle]}>
          <View style={styles.bannerOrb1} />
          <View style={styles.bannerOrb2} />
          <Text style={styles.bannerTitle}>Settings</Text>
          <Text style={styles.bannerSub}>Manage your workspace</Text>
        </View>

        {/* ── Profile card (overlaps banner) ── */}
        <View style={{ paddingHorizontal: 16, marginTop: -32 }}>
          <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>{initials(user?.fullName || user?.firstName || 'S')}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.profileName, { color: colors.text }]}>{user?.fullName || user?.firstName || 'Student'}</Text>
              <Text style={[styles.profileEmail, { color: colors.textSecondary }]} numberOfLines={1}>
                {user?.primaryEmailAddress?.emailAddress || 'student@school.edu'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                <View style={[styles.badge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>Free Plan</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: colors.bg }]}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary }}>
                    {appData.school || 'My School'}
                  </Text>
                </View>
                {canvasConnected && (
                  <View style={[styles.badge, { backgroundColor: '#d1fae5' }]}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#065f46' }}>Canvas ✓</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* ── Stats row ── */}
        <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
          <View style={styles.statsRow}>
            {[
              { label: 'Notes',    value: notes.length,   color: colors.primary, icon: '📝' },
              { label: 'Tasks',    value: pendingTasks,   color: '#10b981',      icon: '✅' },
              { label: 'Sessions', value: sessions,        color: '#7c3aed',      icon: '🧠' },
              { label: 'Hrs',      value: focusHrs,        color: '#f59e0b',      icon: '⏱' },
            ].map(s => (
              <View key={s.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</Text>
                <Text style={{ fontSize: 20, fontWeight: '800', color: s.color, letterSpacing: -0.5 }}>{s.value}</Text>
                <Text style={{ fontSize: 10, color: colors.textTertiary, marginTop: 2 }}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>

          <Section title="ACCOUNT">
            <Row icon={User}   iconColor={colors.primary} label="Edit Profile"       onPress={() => router.push('/settings/profile')} />
            <Row icon={Shield} iconColor="#8b5cf6"         label="Privacy & Security" onPress={() => router.push('/settings/privacy')} last />
          </Section>

          <Section title="INTEGRATIONS">
            <Row
              icon={GraduationCap} iconColor="#7c3aed"
              label="School"
              value={appData.school || 'Not set'}
              onPress={() => router.push('/settings/school')}
            />
            <Row
              icon={Link2} iconColor="#f59e0b"
              label="Canvas LMS"
              value={canvasConnected ? `${courses.length} courses` : 'Not connected'}
              onPress={() => router.push('/canvas')}
            />
            <Row
              icon={Link2} iconColor="#5865f2"
              label="Microsoft Teams"
              value={teamsConnected ? 'Connected' : 'Not connected'}
              onPress={() => router.push('/teams')}
            />
            <Row
              icon={Calendar} iconColor="#4285f4"
              label="Google Calendar"
              value={gcalConnected ? 'Connected' : 'Not connected'}
              onPress={() => router.push('/calendar')}
            />
            <Row
              icon={Bot} iconColor="#8b5cf6"
              label="Claude AI"
              value="Active"
              onPress={() => router.push('/ai-studio')}
            />
            <Row
              icon={Bot} iconColor="#d946ef"
              label="AI API Keys"
              value={getKey('user_claude_api_key') ? 'Configured ✓' : 'Not set'}
              onPress={() => router.push('/settings/ai-keys')}
              last
            />
          </Section>

          <Section title="PREFERENCES">
            <Row
              icon={Moon}
              iconColor={darkMode ? colors.primary : colors.textSecondary}
              label="Dark Mode"
              right={
                <Switch
                  value={darkMode}
                  onValueChange={toggleDarkMode}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                />
              }
            />

            {/* Theme color picker */}
            <View style={[styles.row, { borderBottomColor: colors.border }, styles.rowBorder]}>
              <View style={[styles.rowIcon, { backgroundColor: accentColor + '22' }]}>
                <View style={{ width: 17, height: 17, borderRadius: 9, backgroundColor: accentColor }} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Theme Color</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1 }}>
                {ACCENT_COLORS.map(c => (
                  <TouchableOpacity
                    key={c.value}
                    onPress={() => setAccentColor(c.value)}
                    style={{
                      width: 26, height: 26, borderRadius: 13,
                      backgroundColor: c.value,
                      borderWidth: accentColor === c.value ? 3 : 0,
                      borderColor: '#fff',
                      ...(Platform.OS === 'web' ? { boxShadow: accentColor === c.value ? `0 0 0 2px ${c.value}` : 'none' } as any : {}),
                    }}
                  />
                ))}
              </View>
            </View>

            <Row
              icon={Bell}
              iconColor="#f59e0b"
              label="Notifications"
              right={
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  {notificationsEnabled && Platform.OS === 'web' && (
                    <TouchableOpacity
                      onPress={async () => {
                        const perm = await requestPermission();
                        if (perm === 'granted') {
                          fireTestNotification();
                        } else {
                          showAlert('Permission Required', 'Please allow notifications in your browser settings.');
                        }
                      }}
                      style={[styles.testBtn, { backgroundColor: '#f59e0b18', borderColor: '#f59e0b44' }]}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#f59e0b' }}>Test</Text>
                    </TouchableOpacity>
                  )}
                  <Switch
                    value={notificationsEnabled}
                    onValueChange={setNotificationsEnabled}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="#fff"
                  />
                </View>
              }
              last
            />
          </Section>

          <Section title="TOOLS">
            <Row icon={BookOpen}    iconColor={colors.primary} label="Notes"            value={`${notes.length} notes`}     onPress={() => router.push('/notes')} />
            <Row icon={CheckSquare} iconColor="#10b981"         label="Tasks"            value={`${pendingTasks} pending`}   onPress={() => router.push('/tasks')} />
            <Row icon={Timer}       iconColor="#f59e0b"         label="Focus Timer"      value={`${sessions} sessions`}      onPress={() => router.push('/focus')} />
            <Row icon={TrendingUp}  iconColor="#10b981"         label="Grade Calculator"                                    onPress={() => router.push('/settings/grades')} last />
          </Section>

          <Section title="ABOUT">
            <Row icon={RotateCcw} iconColor="#7c3aed" label="Replay App Tour" onPress={() => {
              const TOUR_KEY = 'workspace_tour_complete';
              if (Platform.OS === 'web') {
                try { localStorage.removeItem(TOUR_KEY); } catch {}
              } else {
                AsyncStorage.removeItem(TOUR_KEY);
              }
              showAlert('Tour Reset', 'The app tour will show next time you visit the home screen.');
            }} />
            <Row icon={Star}         iconColor="#f59e0b" label="Rate Workspace"  onPress={() => showAlert('Thanks for using Workspace! ⭐')} />
            <Row icon={HelpCircle}   iconColor="#10b981" label="Help & Support"  onPress={() => showAlert('Help & Support', 'Email: support@workspace.app')} />
            <Row icon={ExternalLink} iconColor={colors.textTertiary} label="Version" value="1.0.0" last />
          </Section>

          {/* Sign out */}
          <TouchableOpacity
            onPress={handleLogout}
            style={[styles.logoutBtn, { backgroundColor: colors.error + '10', borderColor: colors.error + '35' }]}
            activeOpacity={0.8}
          >
            <LogOut size={16} color={colors.error} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.error }}>Sign Out</Text>
          </TouchableOpacity>

          <Text style={[styles.footer, { color: colors.textTertiary }]}>
            Workspace · Everything school, in one place
          </Text>
        </View>
      </ScrollView>

      <TabBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  banner: {
    height: 140, justifyContent: 'flex-end', padding: 22,
    paddingBottom: 52, overflow: 'hidden', position: 'relative',
  },
  bannerOrb1: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.08)', top: -70, right: -50,
  },
  bannerOrb2: {
    position: 'absolute', width: 150, height: 150, borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.05)', top: 30, right: 90,
  },
  bannerTitle: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  bannerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 18, borderRadius: 22, borderWidth: 0.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 5,
  },
  avatar:      { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { color: '#fff', fontSize: 22, fontWeight: '700' },
  profileName: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  profileEmail:{ fontSize: 13, marginTop: 2 },
  badge:       { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  statCard: {
    flex: 1, alignItems: 'center', paddingVertical: 14,
    borderRadius: 16, borderWidth: 0.5,
  },

  section:      { marginBottom: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 7, marginLeft: 2 },
  sectionCard:  { borderRadius: 18, borderWidth: 0.5, overflow: 'hidden' },

  row:       { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rowBorder: { borderBottomWidth: 0.5 },
  rowIcon:   { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  rowLabel:  { flex: 1, fontSize: 15 },
  valuePill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 9, marginRight: 4 },

  testBtn: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1,
  },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderWidth: 1, borderRadius: 16, padding: 15, marginBottom: 16,
  },
  footer: { textAlign: 'center', fontSize: 12, marginBottom: 16 },
});
