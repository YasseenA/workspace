import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link2, RefreshCw, CheckCircle, BookOpen, AlertCircle, ChevronRight, Calendar, Download } from 'lucide-react-native';
import { useCanvasStore } from '../../store/canvas';
import { useTasksStore } from '../../store/tasks';
import { Card, Button, Badge } from '../../components/ui';
import TabBar from '../../components/layout/TabBar';
import { colors } from '../../lib/theme';
import { fmt } from '../../utils/helpers';
import { canvas } from '../../lib/canvas';

export default function CanvasScreen() {
  const { connected, courses, assignments, lastSync, isSyncing, error, connect, disconnect, sync } = useCanvasStore();
  const { importFromCanvas, tasks } = useTasksStore();
  const [importing, setImporting] = useState(false);

  const handleConnect = async () => {
    // In a real app this opens OAuth. For demo, we simulate with a token.
    Alert.alert(
      'Connect Canvas',
      'This will open your Bellevue College Canvas login.\n\nFor demo purposes, tap "Demo Mode" to load mock data.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Demo Mode', onPress: () => connectDemo() },
        { text: 'Open Canvas', onPress: () => {
          const url = canvas.getAuthUrl();
          Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open Canvas. Make sure your Canvas Client ID is set in .env'));
        }},
      ]
    );
  };

  const connectDemo = async () => {
    // Simulate connected state with mock data
    const mockCourses = [
      { id: 1, name: 'MATH 151 - Calculus I', course_code: 'MATH151', start_at: '', end_at: '' },
      { id: 2, name: 'HIST 147 - World History', course_code: 'HIST147', start_at: '', end_at: '' },
      { id: 3, name: 'CS 110 - Intro to Programming', course_code: 'CS110', start_at: '', end_at: '' },
    ];
    const mockAssignments = [
      { id: 101, course_id: 1, name: 'Problem Set 5', description: 'Integration techniques', due_at: new Date(Date.now()+86400000*2).toISOString(), points_possible: 50, html_url: '', submission_types: ['online_text_entry'] },
      { id: 102, course_id: 2, name: 'Essay: Industrial Revolution', description: '', due_at: new Date(Date.now()+86400000*4).toISOString(), points_possible: 100, html_url: '', submission_types: ['online_upload'] },
      { id: 103, course_id: 3, name: 'Lab 3: Loops', description: '', due_at: new Date(Date.now()+86400000).toISOString(), points_possible: 30, html_url: '', submission_types: ['online_text_entry'] },
    ];
    useCanvasStore.setState({ connected: true, token: 'demo_token', courses: mockCourses, assignments: mockAssignments, lastSync: new Date().toISOString() });
  };

  const handleSync = async () => {
    try { await sync(); Alert.alert('Synced!', `${courses.length} courses, ${assignments.length} assignments.`); }
    catch(e: any) { Alert.alert('Sync Failed', e.message); }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const count = importFromCanvas(assignments);
      Alert.alert('Imported!', count > 0 ? `${count} new tasks added from Canvas.` : 'All assignments already imported.');
    } finally { setImporting(false); }
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
            <Text style={styles.connectDesc}>Sync your assignments, courses, and due dates automatically. Never miss a deadline.</Text>
            <View style={styles.benefits}>
              {['Sync assignments as tasks', 'See due dates on dashboard', 'Get deadline notifications', 'Auto-organize by course'].map(b => (
                <View key={b} style={styles.benefit}>
                  <CheckCircle size={14} color={colors.success} />
                  <Text style={styles.benefitText}>{b}</Text>
                </View>
              ))}
            </View>
            <Button variant="primary" fullWidth onPress={handleConnect}>Connect Canvas Account</Button>
          </Card>
        ) : (
          <>
            {/* Status card */}
            <Card style={styles.statusCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={18} color={colors.success} fill={colors.success + '30'} />
                <Text style={styles.statusText}>Connected to Bellevue College</Text>
              </View>
              {lastSync && <Text style={styles.lastSync}>Last synced {fmt.relative(lastSync)}</Text>}
              {error && <Text style={styles.errorText}>⚠️ {error}</Text>}
            </Card>

            {/* Stats */}
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

            {/* Import button */}
            <Button variant="secondary" fullWidth onPress={handleImport} loading={importing} leftIcon={<Download size={15} color={colors.text} />} style={{ marginBottom: 16 }}>
              Import All as Tasks
            </Button>

            {/* Courses */}
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

            {/* Upcoming assignments */}
            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Upcoming Assignments</Text>
            {assignments
              .filter(a => !a.due_at || new Date(a.due_at) > new Date())
              .sort((a, b) => new Date(a.due_at || '').getTime() - new Date(b.due_at || '').getTime())
              .slice(0, 8)
              .map(a => {
                const due = a.due_at ? fmt.dueDate(a.due_at) : null;
                const course = courseForId(a.course_id);
                const alreadyImported = tasks.some(t => t.canvasId === String(a.id));
                return (
                  <Card key={a.id} style={styles.assignCard} padding={false}>
                    <View style={styles.assignRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.assignName} numberOfLines={1}>{a.name}</Text>
                        {course && <Text style={styles.assignCourse}>{course.course_code}</Text>}
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
            <Button variant="ghost" onPress={() => { Alert.alert('Disconnect', 'Disconnect from Canvas?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Disconnect', style: 'destructive', onPress: disconnect }]); }}>
              Disconnect Canvas
            </Button>
          </>
        )}
      <TabBar />
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  syncBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  connectCard: { alignItems: 'center', paddingVertical: 32 },
  connectIcon: { width: 80, height: 80, borderRadius: 24, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  connectTitle: { fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 8 },
  connectDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  benefits: { alignSelf: 'stretch', marginBottom: 24, gap: 10 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  benefitText: { fontSize: 14, color: colors.text },
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
});
