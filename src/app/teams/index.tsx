import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, RefreshCw, AlertCircle, BookOpen, X } from 'lucide-react-native';
import { useTeamsStore } from '../../store/teams';
import { getLoginUrl } from '../../lib/teams';
import { showAlert } from '../../utils/helpers';
import { useTasksStore } from '../../store/tasks';
import { Badge, Button } from '../../components/ui';
import TabBar from '../../components/layout/TabBar';
import TopBar from '../../components/layout/TopBar';
import { useColors } from '../../lib/theme';
import { fmt } from '../../utils/helpers';

const TEAMS_BLUE = '#5865f2';

export default function TeamsScreen() {
  const colors = useColors();
  const { connected, classes, assignments, lastSync, isSyncing, error, sync, disconnect } = useTeamsStore();
  const { tasks } = useTasksStore();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'classes'>('upcoming');

  const now      = new Date();
  const upcoming = assignments
    .filter(a => !a.dueDateTime || new Date(a.dueDateTime) > now)
    .sort((a, b) => new Date(a.dueDateTime || '').getTime() - new Date(b.dueDateTime || '').getTime());

  const handleSignIn = async () => {
    if (Platform.OS !== 'web') {
      showAlert('Teams on iOS', 'Microsoft Teams connection requires the web app. Visit workspace-edu.com to connect.');
      return;
    }
    const url = await getLoginUrl();
    window.location.href = url;
  };

  const handleSync = async () => { try { await sync(); } catch {} };

  const handleDisconnect = () => {
    showAlert('Disconnect Teams', 'Disconnect from Microsoft Teams?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: disconnect },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100, paddingTop: Platform.OS === 'web' ? 60 : 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <View>
            <Text style={{ fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5 }}>Teams</Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
              {connected ? `${classes.length} classes · ${assignments.length} assignments` : 'Not connected'}
            </Text>
          </View>
          {connected && (
            <TouchableOpacity
              onPress={handleSync}
              disabled={isSyncing}
              style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: TEAMS_BLUE + '18', alignItems: 'center', justifyContent: 'center' }}
            >
              {isSyncing
                ? <ActivityIndicator size="small" color={TEAMS_BLUE} />
                : <RefreshCw size={18} color={TEAMS_BLUE} />}
            </TouchableOpacity>
          )}
        </View>

        {!connected ? (
          /* ── Not connected ── */
          <View style={[styles.connectCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.connectIcon, { backgroundColor: TEAMS_BLUE + '18' }]}>
              <Text style={{ fontSize: 40 }}>🟦</Text>
            </View>
            <Text style={[styles.connectTitle, { color: colors.text }]}>Connect Microsoft Teams</Text>
            <Text style={[styles.connectDesc, { color: colors.textSecondary }]}>
              Sync your class assignments and due dates from Microsoft Teams Education.
            </Text>

            <View style={[styles.steps, { backgroundColor: colors.bg, borderColor: colors.border }]}>
              <Text style={[styles.stepsTitle, { color: colors.text }]}>What you'll get:</Text>
              {[
                '✅ All class assignments with due dates',
                '✅ Assignment points and status',
                '✅ Works at most schools without IT approval',
                '⚠️ Requires your school to use Teams Education',
              ].map((s, i) => (
                <Text key={i} style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 22 }}>{s}</Text>
              ))}
            </View>

            <Button
              variant="primary"
              fullWidth
              onPress={handleSignIn}
              style={{ marginTop: 16, backgroundColor: TEAMS_BLUE }}
            >
              Sign in with Microsoft
            </Button>

            <View style={[styles.noteBanner, { backgroundColor: colors.bg, borderColor: colors.border }]}>
              <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 18, textAlign: 'center' }}>
                You'll be redirected to Microsoft to sign in with your school account. No password is stored.
              </Text>
            </View>

            {error && (
              <View style={[styles.errorBar, { backgroundColor: colors.error + '15', borderColor: colors.error + '40', marginTop: 12 }]}>
                <AlertCircle size={14} color={colors.error} />
                <Text style={{ fontSize: 13, color: colors.error, flex: 1 }}>{error}</Text>
              </View>
            )}
          </View>
        ) : (
          /* ── Connected ── */
          <>
            <View style={[styles.statusBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <CheckCircle size={18} color={colors.success} fill={colors.success + '30'} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Connected to Microsoft Teams</Text>
                {lastSync && <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 1 }}>Synced {fmt.relative(lastSync)}</Text>}
              </View>
              <TouchableOpacity onPress={handleDisconnect}>
                <Text style={{ fontSize: 12, color: colors.error, fontWeight: '600' }}>Disconnect</Text>
              </TouchableOpacity>
            </View>

            {error && (
              <View style={[styles.errorBar, { backgroundColor: colors.error + '15', borderColor: colors.error + '40' }]}>
                <AlertCircle size={14} color={colors.error} />
                <Text style={{ fontSize: 13, color: colors.error, flex: 1 }}>{error}</Text>
              </View>
            )}

            {/* Stats */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {[
                { label: 'Classes',     value: classes.length,     color: TEAMS_BLUE },
                { label: 'Assignments', value: assignments.length,  color: '#8b5cf6' },
                { label: 'Due soon',    value: upcoming.filter(a => {
                  if (!a.dueDateTime) return false;
                  return new Date(a.dueDateTime).getTime() - now.getTime() < 3 * 86400000;
                }).length, color: '#f59e0b' },
              ].map(s => (
                <View key={s.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.statNum, { color: s.color }]}>{s.value}</Text>
                  <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Tabs */}
            <View style={[styles.tabs, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {(['upcoming', 'classes'] as const).map(tab => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[styles.tab, activeTab === tab && { backgroundColor: TEAMS_BLUE, borderRadius: 8 }]}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: activeTab === tab ? '#fff' : colors.textSecondary, textTransform: 'capitalize' }}>
                    {tab === 'upcoming' ? `Upcoming (${upcoming.length})` : `Classes (${classes.length})`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {activeTab === 'upcoming' ? (
              <>
                {upcoming.slice(0, 20).map(a => {
                  const due     = a.dueDateTime ? fmt.dueDate(a.dueDateTime) : null;
                  const isUrgent = a.dueDateTime && (new Date(a.dueDateTime).getTime() - now.getTime()) < 2 * 86400000;
                  return (
                    <View key={a.id} style={[styles.assignCard, { backgroundColor: colors.card, borderColor: isUrgent ? colors.error + '60' : colors.border }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }} numberOfLines={1}>{a.displayName}</Text>
                        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                          {a.className}{a.points != null ? ` · ${a.points} pts` : ''}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, alignItems: 'center' }}>
                          {due && <Text style={{ fontSize: 12, fontWeight: '600', color: due.color }}>{due.label}</Text>}
                          {isUrgent && <Badge variant="error" size="sm">Due soon!</Badge>}
                        </View>
                      </View>
                      {a.webUrl ? (
                        <TouchableOpacity
                          onPress={() => window.open(a.webUrl, '_blank')}
                          style={[styles.viewBtn, { backgroundColor: TEAMS_BLUE + '18' }]}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: TEAMS_BLUE }}>View</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  );
                })}
                {upcoming.length === 0 && (
                  <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={{ fontSize: 14, color: colors.textTertiary, textAlign: 'center' }}>No upcoming assignments 🎉</Text>
                  </View>
                )}
              </>
            ) : (
              classes.map(cls => {
                const clsAssignments = assignments.filter(a => a.classId === cls.id);
                const clsUpcoming    = clsAssignments.filter(a => !a.dueDateTime || new Date(a.dueDateTime) > now);
                return (
                  <View key={cls.id} style={[styles.courseCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: clsUpcoming.length > 0 ? 10 : 0 }}>
                      <View style={[styles.courseIcon, { backgroundColor: TEAMS_BLUE + '18' }]}>
                        <BookOpen size={18} color={TEAMS_BLUE} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }} numberOfLines={1}>{cls.displayName}</Text>
                        {cls.courseCode ? <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }}>{cls.courseCode}</Text> : null}
                      </View>
                      <Badge variant="neutral" size="sm">{clsAssignments.length} tasks</Badge>
                    </View>
                    {clsUpcoming.slice(0, 2).map(a => {
                      const due = a.dueDateTime ? fmt.dueDate(a.dueDateTime) : null;
                      return (
                        <View key={a.id} style={[styles.courseAssign, { borderTopColor: colors.border }]}>
                          <Text style={{ fontSize: 13, color: colors.text, flex: 1 }} numberOfLines={1}>{a.displayName}</Text>
                          {due && <Text style={{ fontSize: 11, fontWeight: '600', color: due.color }}>{due.label}</Text>}
                        </View>
                      );
                    })}
                    {clsUpcoming.length > 2 && (
                      <Text style={{ fontSize: 12, color: TEAMS_BLUE, marginTop: 6, paddingTop: 6, borderTopWidth: 0.5, borderTopColor: colors.border }}>
                        +{clsUpcoming.length - 2} more assignments
                      </Text>
                    )}
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>
      <TabBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  connectCard:  { borderRadius: 24, borderWidth: 0.5, padding: 24, paddingVertical: 32 },
  connectIcon:  { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 18, alignSelf: 'center' },
  connectTitle: { fontSize: 21, fontWeight: '800', textAlign: 'center', marginBottom: 8, letterSpacing: -0.3 },
  connectDesc:  { fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 20 },
  steps:        { borderRadius: 16, borderWidth: 0.5, padding: 16, marginBottom: 4, gap: 4 },
  stepsTitle:   { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  noteBanner:   { borderRadius: 14, borderWidth: 0.5, padding: 12, marginTop: 12 },
  statusBar:    { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, borderWidth: 0.5, padding: 14, marginBottom: 12 },
  errorBar:     { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 0.5, padding: 12, marginBottom: 12 },
  statCard:     { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 16, borderWidth: 0.5 },
  statNum:      { fontSize: 22, fontWeight: '800' },
  statLabel:    { fontSize: 10, marginTop: 2 },
  tabs:         { flexDirection: 'row', padding: 4, borderRadius: 16, borderWidth: 0.5, marginBottom: 12 },
  tab:          { flex: 1, alignItems: 'center', paddingVertical: 9 },
  assignCard:   { borderRadius: 16, borderWidth: 0.5, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  courseCard:   { borderRadius: 18, borderWidth: 0.5, padding: 16, marginBottom: 10 },
  courseIcon:   { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  courseAssign: { flexDirection: 'row', alignItems: 'center', paddingTop: 9, paddingHorizontal: 2, borderTopWidth: 0.5, gap: 8, marginTop: 4 },
  emptyCard:    { borderRadius: 16, borderWidth: 0.5, padding: 24 },
  viewBtn:      { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9 },
});
