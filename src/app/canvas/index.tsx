import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link2, RefreshCw, CheckCircle, BookOpen, X, Download, ExternalLink } from 'lucide-react-native';
import { useCanvasStore } from '../../store/canvas';
import { useTasksStore } from '../../store/tasks';
import { Card, Button, Badge } from '../../components/ui';
import TabBar from '../../components/layout/TabBar';
import { colors } from '../../lib/theme';
import { fmt } from '../../utils/helpers';

export default function CanvasScreen() {
  const { connected, courses, assignments, lastSync, isSyncing, error, connect, disconnect, sync } = useCanvasStore();
  const { importFromCanvas, tasks } = useTasksStore();
  const [showModal, setShowModal] = useState(false);
  const [token, setToken] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [importing, setImporting] = useState(false);

  const handleConnect = async () => {
    if (!token.trim()) { setConnectError('Please paste your Canvas access token.'); return; }
    setConnecting(true);
    setConnectError('');
    try {
      await connect(token.trim());
      setShowModal(false);
      setToken('');
    } catch (e: any) {
      setConnectError(e.message || 'Connection failed. Check your token and try again.');
    } finally {
      setConnecting(false);
    }
  };

  const handleSync = async () => {
    try { await sync(); }
    catch(e: any) { /* error shown in store */ }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const count = importFromCanvas(assignments);
      const msg = count > 0 ? `${count} new tasks added to your Tasks list!` : 'All assignments already imported.';
      if (Platform.OS === 'web') { window.alert(msg); }
    } finally { setImporting(false); }
  };

  const handleDisconnect = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Disconnect from Canvas?')) disconnect();
    }
  };

  const courseForId = (id: number) => courses.find(c => c.id === id);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Canvas LMS</Text>
          {connected && (
            <TouchableOpacity onPress={handleSync} style={styles.syncBtn} disabled={isSyncing}>
              {isSyncing ? <ActivityIndicator size="small" color={colors.primary} /> : <RefreshCw size={16} color={colors.primary} />}
            </TouchableOpacity>
          )}
        </View>

        {!connected ? (
          <Card style={styles.connectCard}>
            <View style={styles.connectIcon}><Link2 size={40} color={colors.primary} strokeWidth={1.5} /></View>
            <Text style={styles.connectTitle}>Connect Bellevue College Canvas</Text>
            <Text style={styles.connectDesc}>
              Sync your real assignments, courses, and due dates. Uses your Canvas API access token.
            </Text>

            {/* How to get token */}
            <View style={styles.steps}>
              <Text style={styles.stepsTitle}>How to get your token:</Text>
              {[
                'Go to canvas.bellevuecollege.edu',
                'Click Account → Settings',
                'Scroll to "Approved Integrations"',
                'Click "+ New Access Token"',
                'Copy the token and paste it below',
              ].map((s, i) => (
                <View key={i} style={styles.step}>
                  <View style={styles.stepNum}><Text style={styles.stepNumText}>{i+1}</Text></View>
                  <Text style={styles.stepText}>{s}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.canvasLink}
              onPress={() => { if (Platform.OS === 'web') window.open('https://canvas.bellevuecollege.edu/profile/settings', '_blank'); }}>
              <ExternalLink size={14} color={colors.primary} />
              <Text style={styles.canvasLinkText}>Open Canvas Settings</Text>
            </TouchableOpacity>

            <Button variant="primary" fullWidth onPress={() => setShowModal(true)} style={{ marginTop: 16 }}>
              Connect with Access Token
            </Button>
          </Card>
        ) : (
          <>
            <Card style={styles.statusCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={18} color={colors.success} fill={colors.success + '30'} />
                <Text style={styles.statusText}>Connected to Bellevue College</Text>
              </View>
              {lastSync && <Text style={styles.lastSync}>Last synced {fmt.relative(lastSync)}</Text>}
              {error && <Text style={styles.errorText}>⚠️ {error}</Text>}
            </Card>

            <View style={styles.statsRow}>
              <Card style={styles.statCard}>
                <Text style={styles.statNum}>{courses.length}</Text>
                <Text style={styles.statLabel}>Courses</Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={styles.statNum}>{assignments.length}</Text>
                <Text style={styles.statLabel}>Assignments</Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={styles.statNum}>{tasks.filter(t => t.canvasId).length}</Text>
                <Text style={styles.statLabel}>Imported</Text>
              </Card>
            </View>

            <Button variant="secondary" fullWidth onPress={handleImport} loading={importing}
              leftIcon={<Download size={15} color={colors.text} />} style={{ marginBottom: 12 }}>
              Import All as Tasks
            </Button>

            <Text style={styles.sectionTitle}>Your Courses</Text>
            {courses.map(course => (
              <Card key={course.id} style={styles.courseCard} padding={false}>
                <View style={styles.courseRow}>
                  <View style={[styles.courseIcon, { backgroundColor: colors.primaryLight }]}>
                    <BookOpen size={16} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.courseName} numberOfLines={1}>{course.name}</Text>
                    <Text style={styles.courseCode}>{course.course_code}</Text>
                  </View>
                  <Badge variant="neutral" size="sm">
                    {assignments.filter(a => a.course_id === course.id).length} tasks
                  </Badge>
                </View>
              </Card>
            ))}

            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Upcoming Assignments</Text>
            {assignments
              .filter(a => !a.due_at || new Date(a.due_at) > new Date())
              .sort((a, b) => new Date(a.due_at || '').getTime() - new Date(b.due_at || '').getTime())
              .slice(0, 10)
              .map(a => {
                const due = a.due_at ? fmt.dueDate(a.due_at) : null;
                const course = courseForId(a.course_id);
                const alreadyImported = tasks.some(t => t.canvasId === String(a.id));
                return (
                  <Card key={a.id} style={styles.assignCard} padding={false}>
                    <View style={styles.assignRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.assignName} numberOfLines={1}>{a.name}</Text>
                        {course && <Text style={styles.assignCourse}>{course.course_code} · {a.points_possible}pts</Text>}
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        {due && <Text style={[styles.assignDue, { color: due.color }]}>{due.label}</Text>}
                        {alreadyImported && <Badge variant="success" size="sm">Imported</Badge>}
                      </View>
                    </View>
                  </Card>
                );
              })}

            <View style={{ height: 16 }} />
            <Button variant="ghost" onPress={handleDisconnect}>Disconnect Canvas</Button>
          </>
        )}

        <View style={{ height: 100 }} />
        <TabBar />
      </ScrollView>

      {/* Token Modal */}
      {showModal && (
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Paste Your Canvas Token</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); setToken(''); setConnectError(''); }}>
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Generate a token from Canvas → Account → Settings → Approved Integrations → New Access Token
            </Text>

            <TextInput
              style={styles.tokenInput}
              placeholder="Paste token here..."
              placeholderTextColor={colors.textTertiary}
              value={token}
              onChangeText={setToken}
              autoFocus
              multiline
            />

            {connectError ? <Text style={styles.connectErr}>{connectError}</Text> : null}

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
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  syncBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  connectCard: { paddingVertical: 24 },
  connectIcon: { width: 72, height: 72, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 16, alignSelf: 'center' },
  connectTitle: { fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 8 },
  connectDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  steps: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 16, gap: 10 },
  stepsTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 6 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  stepText: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  canvasLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center' },
  canvasLinkText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  statusCard: { marginBottom: 12, gap: 4 },
  statusText: { fontSize: 14, fontWeight: '600', color: colors.text },
  lastSync: { fontSize: 12, color: colors.textTertiary },
  errorText: { fontSize: 12, color: colors.error },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statNum: { fontSize: 24, fontWeight: '800', color: colors.primary },
  statLabel: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 8 },
  courseCard: { marginBottom: 8 },
  courseRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  courseIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  courseName: { fontSize: 14, fontWeight: '600', color: colors.text },
  courseCode: { fontSize: 12, color: colors.textSecondary },
  assignCard: { marginBottom: 8 },
  assignRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  assignName: { fontSize: 14, fontWeight: '500', color: colors.text },
  assignCourse: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  assignDue: { fontSize: 11, fontWeight: '600' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modal: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 480 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  modalDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 16 },
  tokenInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, fontSize: 13, color: colors.text, minHeight: 80, fontFamily: 'monospace' },
  connectErr: { fontSize: 13, color: colors.error, marginTop: 8 },
});
