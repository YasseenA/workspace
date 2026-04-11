import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FileText, CheckSquare, Zap, Timer, Plus, ChevronRight, Clock, Flag, BookOpen, TrendingUp, Calendar } from 'lucide-react-native';
import { useAuthStore } from '../../store/auth';
import { useNotesStore } from '../../store/notes';
import { useTasksStore } from '../../store/tasks';
import { useFocusStore } from '../../store/focus';
import { useCanvasStore } from '../../store/canvas';
import { Card, Badge } from '../../components/ui';
import TabBar from '../../components/layout/TabBar';
import { useColors } from '../../lib/theme';
import { fmt, priorityColor } from '../../utils/helpers';

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuthStore();
  const { notes } = useNotesStore();
  const { tasks } = useTasksStore();
  const { sessions, totalFocusMinutes } = useFocusStore();
  const { assignments, courses, connected: canvasConnected } = useCanvasStore();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => { setRefreshing(true); await new Promise(r => setTimeout(r, 800)); setRefreshing(false); };

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const canvasDueToday = canvasConnected ? assignments.filter(a =>
    a.due_at && new Date(a.due_at).toDateString() === now.toDateString()
  ) : [];

  // Next 7 days upcoming (grouped)
  const nextWeek = canvasConnected ? assignments.filter(a => {
    if (!a.due_at) return false;
    const d = new Date(a.due_at);
    return d > now && (d.getTime() - now.getTime()) < 7 * 24 * 60 * 60 * 1000;
  }).sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime()) : [];

  const dueTodayTasks = tasks.filter(t => t.status !== 'done' && t.dueDate && new Date(t.dueDate).toDateString() === now.toDateString());
  const overdueTasks  = tasks.filter(t => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < now && new Date(t.dueDate).toDateString() !== now.toDateString());
  const recentNotes   = notes.slice(0, 3);
  const pendingTasks  = tasks.filter(t => t.status !== 'done').slice(0, 4);
  const courseMap     = new Map(courses.map(c => [c.id, c]));

  const QuickAction = ({ icon: Icon, label, color, route }: any) => (
    <TouchableOpacity onPress={() => router.push(route)}
      style={[styles.qa, { backgroundColor: color + '18' }]}>
      <Icon size={22} color={color} strokeWidth={1.5} />
      <Text style={[styles.qaLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );

  const dayLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const diff = Math.round((d.getTime() - now.getTime()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>{greeting},</Text>
            <Text style={[styles.name, { color: colors.text }]}>{user?.name?.split(' ')[0] || 'Student'} 👋</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/settings')}
            style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{(user?.name?.[0] || 'S').toUpperCase()}</Text>
          </TouchableOpacity>
        </View>

        {/* Overdue alert */}
        {overdueTasks.length > 0 && (
          <TouchableOpacity onPress={() => router.push('/tasks')}
            style={[styles.alert, { backgroundColor: colors.error }]}>
            <Clock size={14} color="#fff" />
            <Text style={styles.alertText}>{overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''} — tap to view</Text>
          </TouchableOpacity>
        )}

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { label: 'Notes',      value: notes.length,                                    color: colors.primary },
            { label: 'Due today',  value: dueTodayTasks.length + canvasDueToday.length,    color: '#f59e0b' },
            { label: 'Assignments',value: assignments.length,                              color: '#10b981' },
            { label: 'Focus hrs',  value: Math.round(totalFocusMinutes / 60 * 10) / 10,   color: '#8b5cf6' },
          ].map(s => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick actions */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
        <View style={styles.qaRow}>
          <QuickAction icon={FileText}   label="New Note"  color={colors.primary} route="/notes/editor" />
          <QuickAction icon={CheckSquare}label="Add Task"  color="#10b981"        route="/tasks" />
          <QuickAction icon={Zap}        label="AI Studio" color="#8b5cf6"        route="/ai-studio" />
          <QuickAction icon={Timer}      label="Focus"     color="#f59e0b"        route="/focus" />
        </View>

        {/* Due today */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Due Today</Text>
          <TouchableOpacity onPress={() => router.push('/tasks')} style={styles.seeAll}>
            <Text style={[styles.seeAllText, { color: colors.primary }]}>See all</Text>
            <ChevronRight size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {dueTodayTasks.length === 0 && canvasDueToday.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No tasks due today 🎉</Text>
          </View>
        ) : (
          <>
            {dueTodayTasks.slice(0, 3).map(task => (
              <View key={task.id} style={[styles.taskCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.priorityDot, { backgroundColor: priorityColor(task.priority) }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.taskTitle, { color: colors.text }]} numberOfLines={1}>{task.title}</Text>
                  {task.dueDate && <Text style={[styles.taskDue, { color: colors.textSecondary }]}>{fmt.dueDate(task.dueDate)?.label}</Text>}
                </View>
                <Flag size={14} color={priorityColor(task.priority)} />
              </View>
            ))}
            {canvasDueToday.map(a => (
              <View key={a.id} style={[styles.taskCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.priorityDot, { backgroundColor: '#f59e0b' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.taskTitle, { color: colors.text }]} numberOfLines={1}>{a.name}</Text>
                  <Text style={[styles.taskDue, { color: colors.textSecondary }]}>{courseMap.get(a.course_id)?.course_code || 'Canvas'} · Due today</Text>
                </View>
                <BookOpen size={14} color="#f59e0b" />
              </View>
            ))}
          </>
        )}

        {/* 7-day schedule */}
        {nextWeek.length > 0 && (
          <>
            <View style={[styles.sectionHeader, { marginTop: 8 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Calendar size={15} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Next 7 Days</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/canvas')} style={styles.seeAll}>
                <Text style={[styles.seeAllText, { color: colors.primary }]}>Canvas</Text>
                <ChevronRight size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>
            {nextWeek.slice(0, 5).map(a => {
              const course = courseMap.get(a.course_id);
              const label  = a.due_at ? dayLabel(a.due_at) : '';
              const isUrgent = a.due_at && (new Date(a.due_at).getTime() - now.getTime()) < 2 * 86400000;
              return (
                <View key={a.id} style={[styles.scheduleRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.dateChip, { backgroundColor: isUrgent ? '#f59e0b20' : colors.primaryLight }]}>
                    <Text style={[styles.dateChipText, { color: isUrgent ? '#f59e0b' : colors.primary }]}>{label}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.taskTitle, { color: colors.text }]} numberOfLines={1}>{a.name}</Text>
                    {course && <Text style={[styles.taskDue, { color: colors.textSecondary }]}>{course.course_code} · {a.points_possible}pts</Text>}
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* Recent notes */}
        <View style={[styles.sectionHeader, { marginTop: 8 }]}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Recent Notes</Text>
          <TouchableOpacity onPress={() => router.push('/notes')} style={styles.seeAll}>
            <Text style={[styles.seeAllText, { color: colors.primary }]}>See all</Text>
            <ChevronRight size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>
        {recentNotes.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No notes yet — create your first!</Text>
          </View>
        ) : (
          recentNotes.map(note => (
            <TouchableOpacity key={note.id} onPress={() => router.push({ pathname: '/notes/editor', params: { id: note.id } })}>
              <View style={[styles.noteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.noteIcon, { backgroundColor: colors.primaryLight }]}>
                  <BookOpen size={14} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.noteTitle, { color: colors.text }]} numberOfLines={1}>{note.title}</Text>
                  <Text style={[styles.noteExcerpt, { color: colors.textSecondary }]} numberOfLines={1}>{note.excerpt}</Text>
                </View>
                <Text style={[styles.noteDate, { color: colors.textTertiary }]}>{fmt.relative(note.updatedAt)}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Pending tasks */}
        {pendingTasks.length > 0 && (
          <>
            <View style={[styles.sectionHeader, { marginTop: 8 }]}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Pending Tasks</Text>
              <TouchableOpacity onPress={() => router.push('/tasks')} style={styles.seeAll}>
                <Text style={[styles.seeAllText, { color: colors.primary }]}>See all</Text>
                <ChevronRight size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>
            {pendingTasks.map(task => (
              <View key={task.id} style={[styles.taskCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.priorityDot, { backgroundColor: priorityColor(task.priority) }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.taskTitle, { color: colors.text }]} numberOfLines={1}>{task.title}</Text>
                  {task.dueDate && <Text style={[styles.taskDue, { color: colors.textSecondary }]}>{fmt.dueDate(task.dueDate)?.label}</Text>}
                </View>
                <Badge variant={task.priority === 'critical' ? 'error' : task.priority === 'high' ? 'warning' : 'neutral'} size="sm">
                  {task.priority}
                </Badge>
              </View>
            ))}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <TabBar />
      {/* FAB */}
      <TouchableOpacity onPress={() => router.push('/notes/editor')}
        style={[styles.fab, { backgroundColor: colors.primary }]}>
        <Plus size={24} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll:        { padding: 16 },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting:      { fontSize: 14 },
  name:          { fontSize: 24, fontWeight: '800' },
  avatar:        { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText:    { color: '#fff', fontWeight: '700', fontSize: 17 },
  alert:         { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 12, marginBottom: 16 },
  alertText:     { color: '#fff', fontSize: 13, fontWeight: '500' },
  statsRow:      { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statCard:      { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 0.5 },
  statValue:     { fontSize: 22, fontWeight: '800' },
  statLabel:     { fontSize: 10, marginTop: 2 },
  qaRow:         { flexDirection: 'row', gap: 10, marginBottom: 20 },
  qa:            { flex: 1, alignItems: 'center', padding: 14, borderRadius: 12 },
  qaLabel:       { fontSize: 11, fontWeight: '600', marginTop: 6 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle:  { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  seeAll:        { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText:    { fontSize: 13, fontWeight: '500' },
  emptyCard:     { borderRadius: 12, borderWidth: 0.5, padding: 16, marginBottom: 8 },
  emptyText:     { textAlign: 'center', fontSize: 14 },
  taskCard:      { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 0.5, marginBottom: 8, gap: 10 },
  priorityDot:   { width: 10, height: 10, borderRadius: 5 },
  taskTitle:     { fontSize: 14, fontWeight: '500' },
  taskDue:       { fontSize: 12, marginTop: 2 },
  scheduleRow:   { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 0.5, marginBottom: 8, gap: 10 },
  dateChip:      { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  dateChipText:  { fontSize: 11, fontWeight: '700' },
  noteCard:      { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 0.5, marginBottom: 8, gap: 12 },
  noteIcon:      { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  noteTitle:     { fontSize: 14, fontWeight: '600' },
  noteExcerpt:   { fontSize: 12, marginTop: 2 },
  noteDate:      { fontSize: 11 },
  fab:           { position: 'absolute', bottom: 90, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8 },
});
