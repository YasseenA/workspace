import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link2, RefreshCw, CheckCircle, BookOpen, X, Download, ExternalLink, AlertCircle } from 'lucide-react-native';
import { useCanvasStore } from '../../store/canvas';
import { useTasksStore } from '../../store/tasks';
import { Card, Button, Badge } from '../../components/ui';
import TabBar from '../../components/layout/TabBar';
import { useColors } from '../../lib/theme';
import { fmt } from '../../utils/helpers';

export default function CanvasScreen() {
  const colors = useColors();
  const { connected, courses, assignments, lastSync, isSyncing, error, connect, disconnect, sync } = useCanvasStore();
  const { importFromCanvas, tasks } = useTasksStore();
  const [showModal, setShowModal] = useState(false);
  const [token, setToken] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [importing, setImporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'courses'>('upcoming');

  const handleConnect = async () => {
    if (!token.trim()) { setConnectError('Please paste your Canvas access token.'); return; }
    setConnecting(true); setConnectError('');
    try {
      await connect(token.trim());
      setShowModal(false); setToken('');
    } catch (e: any) {
      setConnectError(e.message || 'Connection failed. Check your token and try again.');
    } finally { setConnecting(false); }
  };

  const handleSync = async () => { try { await sync(); } catch {} };

  const handleImport = async () => {
    setImporting(true);
    try {
      const count = importFromCanvas(assignments);
      const msg = count > 0 ? `${count} new tasks added!` : 'All assignments already imported.';
      if (Platform.OS === 'web') window.alert(msg);
    } finally { setImporting(false); }
  };

  const handleDisconnect = () => {
    if (Platform.OS === 'web' && window.confirm('Disconnect from Canvas?')) disconnect();
  };

  const courseForId = (id: number) => courses.find(c => c.id === id);
  const now = new Date();

  const upcoming = assignments
    .filter(a => !a.due_at || new Date(a.due_at) > now)
    .sort((a, b) => new Date(a.due_at || '').getTime() - new Date(b.due_at || '').getTime());

  const pastDue = assignments
    .filter(a => a.due_at && new Date(a.due_at) <= now)
    .sort((a, b) => new Date(b.due_at!).getTime() - new Date(a.due_at!).getTime())
    .slice(0, 5);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <View>
            <Text style={{ fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5 }}>Canvas</Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
              {connected ? `${courses.length} courses · ${assignments.length} assignments` : 'Not connected'}
            </Text>
          </View>
          {connected && (
            <TouchableOpacity onPress={handleSync} disabled={isSyncing}
              style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
              {isSyncing
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <RefreshCw size={18} color={colors.primary} />}
            </TouchableOpacity>
          )}
        </View>

        {!connected ? (
          /* ── Not connected ── */
          <View style={[styles.connectCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.connectIcon, { backgroundColor: colors.primaryLight }]}>
              <Link2 size={40} color={colors.primary} strokeWidth={1.5} />
            </View>
            <Text style={[styles.connectTitle, { color: colors.text }]}>Connect Bellevue College Canvas</Text>
            <Text style={[styles.connectDesc, { color: colors.textSecondary }]}>
              Sync your real assignments, courses, and due dates using your Canvas API token.
            </Text>

            {/* Steps */}
            <View style={[styles.steps, { backgroundColor: colors.bg, borderColor: colors.border }]}>
              <Text style={[styles.stepsTitle, { color: colors.text }]}>How to get your token:</Text>
              {[
                'Go to bc.instructure.com',
                'Click Account → Settings',
                'Scroll to "Approved Integrations"',
                'Click "+ New Access Token"',
                'Copy the token and paste below',
              ].map((s, i) => (
                <View key={i} style={styles.step}>
                  <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
                    <Text style={styles.stepNumText}>{i + 1}</Text>
                  </View>
                  <Text style={[styles.stepText, { color: colors.textSecondary }]}>{s}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.canvasLink}
              onPress={() => { if (Platform.OS === 'web') window.open('https://bc.instructure.com/profile/settings', '_blank'); }}>
              <ExternalLink size={14} color={colors.primary} />
              <Text style={[styles.canvasLinkText, { color: colors.primary }]}>Open Canvas Settings</Text>
            </TouchableOpacity>

            <Button variant="primary" fullWidth onPress={() => setShowModal(true)} style={{ marginTop: 16 }}>
              Connect with Access Token
            </Button>
          </View>
        ) : (
          /* ── Connected ── */
          <>
            {/* Status bar */}
            <View style={[styles.statusBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <CheckCircle size={18} color={colors.success} fill={colors.success + '30'} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Connected to Bellevue College</Text>
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
                { label: 'Courses',    value: courses.length,                                color: colors.primary },
                { label: 'Assignments',value: assignments.length,                            color: '#8b5cf6' },
                { label: 'Due soon',   value: upcoming.filter(a => {
                  if (!a.due_at) return false;
                  return new Date(a.due_at).getTime() - now.getTime() < 3 * 86400000;
                }).length,                                                                   color: '#f59e0b' },
                { label: 'Imported',   value: tasks.filter(t => t.canvasId).length,          color: '#10b981' },
              ].map(s => (
                <View key={s.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.statNum, { color: s.color }]}>{s.value}</Text>
                  <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{s.label}</Text>
                </View>
              ))}
            </View>

            <Button variant="secondary" fullWidth onPress={handleImport} loading={importing}
              leftIcon={<Download size={15} color={colors.text} />} style={{ marginBottom: 16 }}>
              Import All as Tasks
            </Button>

            {/* Tabs */}
            <View style={[styles.tabs, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {(['upcoming', 'courses'] as const).map(tab => (
                <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)}
                  style={[styles.tab, activeTab === tab && { backgroundColor: colors.primary, borderRadius: 8 }]}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: activeTab === tab ? '#fff' : colors.textSecondary, textTransform: 'capitalize' }}>
                    {tab === 'upcoming' ? `Upcoming (${upcoming.length})` : `Courses (${courses.length})`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {activeTab === 'upcoming' ? (
              <>
                {upcoming.slice(0, 15).map(a => {
                  const due    = a.due_at ? fmt.dueDate(a.due_at) : null;
                  const course = courseForId(a.course_id);
                  const imported = tasks.some(t => t.canvasId === String(a.id));
                  const isUrgent = a.due_at && (new Date(a.due_at).getTime() - now.getTime()) < 2 * 86400000;
                  return (
                    <View key={a.id} style={[styles.assignCard, { backgroundColor: colors.card, borderColor: isUrgent ? colors.error + '60' : colors.border }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }} numberOfLines={1}>{a.name}</Text>
                        {course && (
                          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                            {course.course_code} · {a.points_possible} pts
                          </Text>
                        )}
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, alignItems: 'center' }}>
                          {due && <Text style={{ fontSize: 12, fontWeight: '600', color: due.color }}>{due.label}</Text>}
                          {imported && <Badge variant="success" size="sm">Imported</Badge>}
                          {isUrgent && !imported && <Badge variant="error" size="sm">Due soon!</Badge>}
                        </View>
                      </View>
                      {a.html_url && (
                        <TouchableOpacity onPress={() => { if (Platform.OS === 'web') window.open(a.html_url, '_blank'); }}
                          style={{ padding: 6 }}>
                          <ExternalLink size={15} color={colors.textTertiary} />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
                {upcoming.length === 0 && (
                  <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={{ fontSize: 14, color: colors.textTertiary, textAlign: 'center' }}>No upcoming assignments 🎉</Text>
                  </View>
                )}
                {pastDue.length > 0 && (
                  <>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.error, marginTop: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Past Due
                    </Text>
                    {pastDue.map(a => {
                      const course = courseForId(a.course_id);
                      return (
                        <View key={a.id} style={[styles.assignCard, { backgroundColor: colors.error + '08', borderColor: colors.error + '30' }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }} numberOfLines={1}>{a.name}</Text>
                            {course && <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{course.course_code}</Text>}
                          </View>
                          <Badge variant="error" size="sm">Past due</Badge>
                        </View>
                      );
                    })}
                  </>
                )}
              </>
            ) : (
              courses.map(course => {
                const courseAssignments = assignments.filter(a => a.course_id === course.id);
                const upcoming = courseAssignments.filter(a => !a.due_at || new Date(a.due_at) > now);
                return (
                  <View key={course.id} style={[styles.courseCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: upcoming.length > 0 ? 10 : 0 }}>
                      <View style={[styles.courseIcon, { backgroundColor: colors.primaryLight }]}>
                        <BookOpen size={18} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }} numberOfLines={1}>{course.name}</Text>
                        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }}>{course.course_code}</Text>
                      </View>
                      <Badge variant="neutral" size="sm">{courseAssignments.length} tasks</Badge>
                    </View>
                    {upcoming.slice(0, 2).map(a => {
                      const due = a.due_at ? fmt.dueDate(a.due_at) : null;
                      return (
                        <View key={a.id} style={[styles.courseAssign, { borderTopColor: colors.border }]}>
                          <Text style={{ fontSize: 13, color: colors.text, flex: 1 }} numberOfLines={1}>{a.name}</Text>
                          {due && <Text style={{ fontSize: 11, fontWeight: '600', color: due.color }}>{due.label}</Text>}
                        </View>
                      );
                    })}
                    {upcoming.length > 2 && (
                      <Text style={{ fontSize: 12, color: colors.primary, marginTop: 6, paddingTop: 6, borderTopWidth: 0.5, borderTopColor: colors.border }}>
                        +{upcoming.length - 2} more assignments
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

      {/* Token Modal */}
      {showModal && (
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Canvas Access Token</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); setToken(''); setConnectError(''); }}>
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 16 }}>
              Generate a token from Canvas → Account → Settings → Approved Integrations → New Access Token
            </Text>
            <TextInput
              style={[styles.tokenInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
              placeholder="Paste token here..."
              placeholderTextColor={colors.textTertiary}
              value={token}
              onChangeText={setToken}
              autoFocus
              multiline
            />
            {connectError ? <Text style={{ fontSize: 13, color: colors.error, marginTop: 8 }}>{connectError}</Text> : null}
            <Button variant="primary" fullWidth onPress={handleConnect} loading={connecting} style={{ marginTop: 12 }}>
              {connecting ? 'Connecting...' : 'Connect'}
            </Button>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  connectCard:   { borderRadius: 24, borderWidth: 0.5, padding: 24, paddingVertical: 32 },
  connectIcon:   { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 18, alignSelf: 'center' },
  connectTitle:  { fontSize: 21, fontWeight: '800', textAlign: 'center', marginBottom: 8, letterSpacing: -0.3 },
  connectDesc:   { fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 20 },
  steps:         { borderRadius: 16, borderWidth: 0.5, padding: 16, marginBottom: 16, gap: 12 },
  stepsTitle:    { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  step:          { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepNum:       { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepNumText:   { color: '#fff', fontSize: 12, fontWeight: '700' },
  stepText:      { fontSize: 13, flex: 1 },
  canvasLink:    { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center' },
  canvasLinkText:{ fontSize: 14, fontWeight: '600' },
  statusBar:     { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, borderWidth: 0.5, padding: 14, marginBottom: 12 },
  errorBar:      { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 0.5, padding: 12, marginBottom: 12 },
  statCard:      { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 16, borderWidth: 0.5 },
  statNum:       { fontSize: 22, fontWeight: '800' },
  statLabel:     { fontSize: 10, marginTop: 2 },
  tabs:          { flexDirection: 'row', padding: 4, borderRadius: 16, borderWidth: 0.5, marginBottom: 12 },
  tab:           { flex: 1, alignItems: 'center', paddingVertical: 9 },
  assignCard:    { borderRadius: 16, borderWidth: 0.5, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  courseCard:    { borderRadius: 18, borderWidth: 0.5, padding: 16, marginBottom: 10 },
  courseIcon:    { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  courseAssign:  { flexDirection: 'row', alignItems: 'center', paddingTop: 9, paddingHorizontal: 2, borderTopWidth: 0.5, gap: 8, marginTop: 4 },
  emptyCard:     { borderRadius: 16, borderWidth: 0.5, padding: 24 },
  overlay:       { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modal:         { borderRadius: 24, padding: 24, width: '100%', maxWidth: 480 },
  tokenInput:    { borderWidth: 1, borderRadius: 12, padding: 13, fontSize: 13, minHeight: 80, fontFamily: 'monospace' },
});
