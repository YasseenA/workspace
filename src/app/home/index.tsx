import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FileText, CheckSquare, Zap, Timer, Plus, ChevronRight, Clock, Flag, BookOpen, TrendingUp } from 'lucide-react-native';
import { useAuthStore } from '../../store/auth';
import { useNotesStore } from '../../store/notes';
import { useTasksStore } from '../../store/tasks';
import { useFocusStore } from '../../store/focus';
import { useCanvasStore } from '../../store/canvas';
import { Card, Badge } from '../../components/ui';
import TabBar from '../../components/layout/TabBar';
import { useColors, colors } from '../../lib/theme';
import { fmt, priorityColor } from '../../utils/helpers';

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuthStore();
  const { notes } = useNotesStore();
  const { tasks } = useTasksStore();
  const { sessions, totalFocusMinutes, streak } = useFocusStore();
  const { assignments, courses, connected: canvasConnected } = useCanvasStore();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => { setRefreshing(true); await new Promise(r => setTimeout(r, 800)); setRefreshing(false); };

  const now = new Date();

  // Merge Canvas assignments + manual tasks for display
  const importedIds = new Set(tasks.map(t => t.canvasId).filter(Boolean));
  const canvasDueToday = canvasConnected ? assignments.filter(a =>
    a.due_at && new Date(a.due_at).toDateString() === now.toDateString()
  ) : [];
  const canvasUpcoming = canvasConnected ? assignments.filter(a =>
    a.due_at && new Date(a.due_at) > now && new Date(a.due_at).toDateString() !== now.toDateString()
  ).slice(0, 3) : [];

  const dueTodayTasks = tasks.filter(t => t.status !== 'done' && t.dueDate && new Date(t.dueDate).toDateString() === now.toDateString());
  const overdueTasks = tasks.filter(t => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < now && new Date(t.dueDate).toDateString() !== now.toDateString());
  const recentNotes = notes.slice(0, 3);
  const pendingTasks = tasks.filter(t => t.status !== 'done').slice(0, 4);
  const courseMap = new Map(courses.map(c => [c.id, c]));
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const QuickAction = ({ icon: Icon, label, color, route }: any) => (
    <TouchableOpacity onPress={() => router.push(route)} style={[styles.qa, { backgroundColor: color + '18' }]}>
      <Icon size={22} color={color} strokeWidth={1.5} />
      <Text style={[styles.qaLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>{greeting},</Text>
            <Text style={[styles.name, { color: colors.text }]}>{user?.name?.split(' ')[0] || 'Student'} 👋</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/settings')} style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.name?.[0] || 'S').toUpperCase()}</Text>
          </TouchableOpacity>
        </View>

        {/* Alert banners */}
        {overdueTasks.length > 0 && (
          <TouchableOpacity onPress={() => router.push('/tasks')} style={styles.alert}>
            <Clock size={14} color="#fff" />
            <Text style={styles.alertText}>{overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''} — tap to view</Text>
          </TouchableOpacity>
        )}

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { label: 'Notes', value: notes.length, color: colors.primary },
            { label: 'Due today', value: dueTodayTasks.length + canvasDueToday.length, color: '#f59e0b' },
            { label: 'Assignments', value: assignments.length, color: '#10b981' },
            { label: 'Focus hrs', value: Math.round(totalFocusMinutes / 60 * 10) / 10, color: '#8b5cf6' },
          ].map(s => (
            <Card key={s.label} style={styles.statCard} padding={false}>
              <View style={styles.statInner}>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            </Card>
          ))}
        </View>

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.qaRow}>
          <QuickAction icon={FileText} label="New Note" color={colors.primary} route="/notes/editor" />
          <QuickAction icon={CheckSquare} label="Add Task" color="#10b981" route="/tasks" />
          <QuickAction icon={Zap} label="AI Studio" color="#8b5cf6" route="/ai-studio" />
          <QuickAction icon={Timer} label="Focus" color="#f59e0b" route="/focus" />
        </View>

        {/* Due today */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Due Today</Text>
          <TouchableOpacity onPress={() => router.push('/tasks')} style={styles.seeAll}>
            <Text style={styles.seeAllText}>See all</Text>
            <ChevronRight size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>
        {dueTodayTasks.length === 0 && canvasDueToday.length === 0 ? (
          <Card><Text style={styles.empty}>No tasks due today 🎉</Text></Card>
        ) : (
          <>
            {dueTodayTasks.slice(0, 3).map(task => (
              <Card key={task.id} style={styles.taskCard} padding={false}>
                <View style={styles.taskRow}>
                  <View style={[styles.priorityDot, { backgroundColor: priorityColor(task.priority) }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
                    {task.dueDate && <Text style={styles.taskDue}>{fmt.dueDate(task.dueDate)?.label}</Text>}
                  </View>
                  <Flag size={14} color={priorityColor(task.priority)} />
                </View>
              </Card>
            ))}
            {canvasDueToday.map(a => (
              <Card key={a.id} style={styles.taskCard} padding={false}>
                <View style={styles.taskRow}>
                  <View style={[styles.priorityDot, { backgroundColor: '#f59e0b' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.taskTitle} numberOfLines={1}>{a.name}</Text>
                    <Text style={styles.taskDue}>{courseMap.get(a.course_id)?.course_code || 'Canvas'} · Due today</Text>
                  </View>
                  <BookOpen size={14} color="#f59e0b" />
                </View>
              </Card>
            ))}
          </>
        )}

        {/* Canvas upcoming */}
        {canvasUpcoming.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming from Canvas</Text>
              <TouchableOpacity onPress={() => router.push('/canvas')} style={styles.seeAll}>
                <Text style={styles.seeAllText}>See all</Text>
                <ChevronRight size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>
            {canvasUpcoming.map(a => {
              const due = a.due_at ? fmt.dueDate(a.due_at) : null;
              return (
                <Card key={a.id} style={styles.taskCard} padding={false}>
                  <View style={styles.taskRow}>
                    <View style={[styles.priorityDot, { backgroundColor: colors.primary }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.taskTitle} numberOfLines={1}>{a.name}</Text>
                      <Text style={styles.taskDue}>{courseMap.get(a.course_id)?.course_code || 'Canvas'}</Text>
                    </View>
                    {due && <Text style={[styles.taskDue, { color: due.color }]}>{due.label}</Text>}
                  </View>
                </Card>
              );
            })}
          </>
        )}

        {/* Recent notes */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Notes</Text>
          <TouchableOpacity onPress={() => router.push('/notes')} style={styles.seeAll}>
            <Text style={styles.seeAllText}>See all</Text>
            <ChevronRight size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>
        {recentNotes.length === 0 ? (
          <Card><Text style={styles.empty}>No notes yet — create your first!</Text></Card>
        ) : (
          recentNotes.map(note => (
            <TouchableOpacity key={note.id} onPress={() => router.push({ pathname: '/notes/editor', params: { id: note.id } })}>
              <Card style={styles.noteCard} padding={false}>
                <View style={styles.noteRow}>
                  <View style={[styles.noteIcon, { backgroundColor: colors.primaryLight }]}>
                    <BookOpen size={14} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.noteTitle} numberOfLines={1}>{note.title}</Text>
                    <Text style={styles.noteExcerpt} numberOfLines={1}>{note.excerpt}</Text>
                  </View>
                  <Text style={styles.noteDate}>{fmt.relative(note.updatedAt)}</Text>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}

        {/* Pending tasks */}
        {pendingTasks.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pending Tasks</Text>
              <TouchableOpacity onPress={() => router.push('/tasks')} style={styles.seeAll}>
                <Text style={styles.seeAllText}>See all</Text>
                <ChevronRight size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>
            {pendingTasks.map(task => (
              <Card key={task.id} style={styles.taskCard} padding={false}>
                <View style={styles.taskRow}>
                  <View style={[styles.priorityDot, { backgroundColor: priorityColor(task.priority) }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
                    {task.dueDate && <Text style={styles.taskDue}>{fmt.dueDate(task.dueDate)?.label}</Text>}
                  </View>
                  <Badge variant={task.priority === 'critical' ? 'error' : task.priority === 'high' ? 'warning' : 'neutral'} size="sm">
                    {task.priority}
                  </Badge>
                </View>
              </Card>
            ))}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <TabBar />
      {/* FAB */}
      <TouchableOpacity onPress={() => router.push('/notes/editor')} style={styles.fab}>
        <Plus size={24} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 14, color: colors.textSecondary },
  name: { fontSize: 24, fontWeight: '800', color: colors.text },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 17 },
  alert: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.error, borderRadius: 10, padding: 12, marginBottom: 16 },
  alertText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statCard: { flex: 1 },
  statInner: { padding: 12, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 10, color: colors.textTertiary, marginTop: 2 },
  qaRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  qa: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 12 },
  qaLabel: { fontSize: 11, fontWeight: '600', marginTop: 6 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8 },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontSize: 13, color: colors.primary, fontWeight: '500' },
  empty: { color: colors.textTertiary, textAlign: 'center', padding: 8 },
  taskCard: { marginBottom: 8 },
  taskRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  priorityDot: { width: 10, height: 10, borderRadius: 5 },
  taskTitle: { fontSize: 14, fontWeight: '500', color: colors.text },
  taskDue: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  noteCard: { marginBottom: 8 },
  noteRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  noteIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  noteTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  noteExcerpt: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  noteDate: { fontSize: 11, color: colors.textTertiary },
  fab: { position: 'absolute', bottom: 90, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8 },
});

// NOTE: Import ScreenWithTabs and wrap if using shared layout
