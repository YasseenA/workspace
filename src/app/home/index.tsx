import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, StyleSheet, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  FileText, CheckSquare, Zap, Timer,
  Plus, ChevronRight, Clock, BookOpen,
  Calendar, ArrowRight,
} from 'lucide-react-native';
import { useUser } from '@clerk/clerk-expo';
import { useNotesStore } from '../../store/notes';
import { useTasksStore } from '../../store/tasks';
import { useFocusStore } from '../../store/focus';
import { useCanvasStore } from '../../store/canvas';
import TabBar from '../../components/layout/TabBar';
import { useColors } from '../../lib/theme';
import { fmt, priorityColor, initials } from '../../utils/helpers';

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useUser();
  const { notes } = useNotesStore();
  const { tasks } = useTasksStore();
  const { totalFocusMinutes } = useFocusStore();
  const { assignments, courses, connected: canvasConnected } = useCanvasStore();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 800));
    setRefreshing(false);
  };

  const now      = new Date();
  const hour     = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.firstName || user?.fullName?.split(' ')[0] || 'Student';

  const dateLabel = now.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  const canvasDueToday = canvasConnected
    ? assignments.filter(a => a.due_at && new Date(a.due_at).toDateString() === now.toDateString())
    : [];

  const nextWeek = canvasConnected
    ? assignments
        .filter(a => {
          if (!a.due_at) return false;
          const d = new Date(a.due_at);
          return d > now && d.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000;
        })
        .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime())
    : [];

  const dueTodayTasks = tasks.filter(t =>
    t.status !== 'done' && t.dueDate && new Date(t.dueDate).toDateString() === now.toDateString()
  );
  const overdueTasks  = tasks.filter(t =>
    t.status !== 'done' && t.dueDate &&
    new Date(t.dueDate) < now && new Date(t.dueDate).toDateString() !== now.toDateString()
  );
  const recentNotes   = notes.slice(0, 3);
  const pendingTasks  = tasks.filter(t => t.status !== 'done').slice(0, 4);
  const courseMap     = new Map(courses.map(c => [c.id, c]));

  const heroGradient: any = Platform.OS === 'web'
    ? { background: 'linear-gradient(135deg, #7c3aed 0%, #4338ca 70%, #312e81 100%)' }
    : { backgroundColor: colors.primary };

  const dayLabel = (dateStr: string) => {
    const d    = new Date(dateStr);
    const diff = Math.round((d.getTime() - now.getTime()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const totalDue = dueTodayTasks.length + canvasDueToday.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero banner ── */}
        <View style={[styles.hero, heroGradient]}>
          <View style={styles.heroOrb} />

          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroGreeting}>{greeting}</Text>
              <Text style={styles.heroName}>{firstName} 👋</Text>
              <Text style={styles.heroDate}>{dateLabel}</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/settings')}
              style={styles.heroAvatar}
            >
              <Text style={styles.heroAvatarText}>{initials(user?.fullName || user?.firstName || 'S')}</Text>
            </TouchableOpacity>
          </View>

          {/* Mini stats inside hero */}
          <View style={styles.heroStats}>
            {[
              { value: notes.length,                              label: 'Notes',    icon: '📝' },
              { value: totalDue,                                  label: 'Due today', icon: '📋' },
              { value: Math.round(totalFocusMinutes / 60 * 10) / 10, label: 'Focus hrs', icon: '⏱' },
            ].map((s, i) => (
              <View key={i} style={[styles.heroStat, i < 2 && styles.heroStatBorder]}>
                <Text style={styles.heroStatValue}>{s.value}</Text>
                <Text style={styles.heroStatLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Overdue alert ── */}
        {overdueTasks.length > 0 && (
          <TouchableOpacity
            onPress={() => router.push('/tasks')}
            style={[styles.alert, { backgroundColor: colors.error + '12', borderColor: colors.error + '30' }]}
          >
            <Clock size={15} color={colors.error} />
            <Text style={[styles.alertText, { color: colors.error }]}>
              {overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''} — tap to view
            </Text>
            <ArrowRight size={14} color={colors.error} />
          </TouchableOpacity>
        )}

        {/* ── Quick actions ── */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
        <View style={styles.qaRow}>
          {[
            { icon: FileText,    label: 'New Note',  color: colors.primary, bg: colors.primaryLight, route: '/notes/editor' },
            { icon: CheckSquare, label: 'Add Task',  color: '#10b981',      bg: '#d1fae5',           route: '/tasks' },
            { icon: Zap,         label: 'AI Studio', color: '#f59e0b',      bg: '#fef3c7',           route: '/ai-studio' },
            { icon: Timer,       label: 'Focus',     color: '#ec4899',      bg: '#fce7f3',           route: '/focus' },
          ].map(({ icon: Icon, label, color, bg, route }) => (
            <TouchableOpacity
              key={label}
              onPress={() => router.push(route as any)}
              style={[styles.qa, { backgroundColor: colors.card, borderColor: colors.border }]}
              activeOpacity={0.75}
            >
              <View style={[styles.qaIconWrap, { backgroundColor: bg }]}>
                <Icon size={20} color={color} strokeWidth={2} />
              </View>
              <Text style={[styles.qaLabel, { color: colors.text }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Due today ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Due Today</Text>
          <TouchableOpacity onPress={() => router.push('/tasks')} style={styles.seeAll}>
            <Text style={[styles.seeAllText, { color: colors.primary }]}>See all</Text>
            <ChevronRight size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {dueTodayTasks.length === 0 && canvasDueToday.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ fontSize: 22 }}>🎉</Text>
            <Text style={[{ fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 8 }]}>All clear!</Text>
            <Text style={[{ fontSize: 13, color: colors.textTertiary, marginTop: 4 }]}>Nothing due today</Text>
          </View>
        ) : (
          <>
            {dueTodayTasks.slice(0, 3).map(task => (
              <TouchableOpacity key={task.id} onPress={() => router.push('/tasks')} activeOpacity={0.7}>
                <View style={[styles.taskCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.priorityBar, { backgroundColor: priorityColor(task.priority) }]} />
                  <View style={{ flex: 1, paddingLeft: 12 }}>
                    <Text style={[styles.taskTitle, { color: colors.text }]} numberOfLines={1}>{task.title}</Text>
                    {task.dueDate && (
                      <Text style={[styles.taskMeta, { color: colors.textSecondary }]}>
                        {fmt.dueDate(task.dueDate)?.label}
                      </Text>
                    )}
                  </View>
                  <ChevronRight size={14} color={colors.textTertiary} />
                </View>
              </TouchableOpacity>
            ))}
            {canvasDueToday.map(a => (
              <View key={a.id} style={[styles.taskCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.priorityBar, { backgroundColor: '#f59e0b' }]} />
                <View style={{ flex: 1, paddingLeft: 12 }}>
                  <Text style={[styles.taskTitle, { color: colors.text }]} numberOfLines={1}>{a.name}</Text>
                  <Text style={[styles.taskMeta, { color: colors.textSecondary }]}>
                    {courseMap.get(a.course_id)?.course_code || 'Canvas'} · Due today
                  </Text>
                </View>
                <BookOpen size={14} color={colors.textTertiary} />
              </View>
            ))}
          </>
        )}

        {/* ── Next 7 Days ── */}
        {nextWeek.length > 0 && (
          <>
            <View style={[styles.sectionHeader, { marginTop: 12 }]}>
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
              const course   = courseMap.get(a.course_id);
              const label    = a.due_at ? dayLabel(a.due_at) : '';
              const isUrgent = a.due_at && (new Date(a.due_at).getTime() - now.getTime()) < 2 * 86400000;
              return (
                <View key={a.id} style={[styles.scheduleRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.dateChip, { backgroundColor: isUrgent ? '#f59e0b18' : colors.primaryLight }]}>
                    <Text style={[styles.dateChipText, { color: isUrgent ? '#f59e0b' : colors.primary }]}>{label}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.taskTitle, { color: colors.text }]} numberOfLines={1}>{a.name}</Text>
                    {course && (
                      <Text style={[styles.taskMeta, { color: colors.textSecondary }]}>
                        {course.course_code} · {a.points_possible} pts
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* ── Recent Notes ── */}
        <View style={[styles.sectionHeader, { marginTop: 12 }]}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Recent Notes</Text>
          <TouchableOpacity onPress={() => router.push('/notes')} style={styles.seeAll}>
            <Text style={[styles.seeAllText, { color: colors.primary }]}>See all</Text>
            <ChevronRight size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {recentNotes.length === 0 ? (
          <TouchableOpacity
            onPress={() => router.push('/notes/editor')}
            style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={{ fontSize: 22 }}>📓</Text>
            <Text style={[{ fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 8 }]}>No notes yet</Text>
            <Text style={[{ fontSize: 13, color: colors.primary, marginTop: 4, fontWeight: '600' }]}>Create your first note →</Text>
          </TouchableOpacity>
        ) : (
          recentNotes.map(note => (
            <TouchableOpacity
              key={note.id}
              onPress={() => router.push({ pathname: '/notes/editor', params: { id: note.id } })}
              activeOpacity={0.7}
            >
              <View style={[styles.noteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.noteIcon, { backgroundColor: colors.primaryLight }]}>
                  <FileText size={15} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.noteTitle, { color: colors.text }]} numberOfLines={1}>{note.title}</Text>
                  <Text style={[styles.taskMeta, { color: colors.textSecondary }]} numberOfLines={1}>{note.excerpt}</Text>
                </View>
                <Text style={[styles.noteDate, { color: colors.textTertiary }]}>{fmt.relative(note.updatedAt)}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* ── Pending Tasks ── */}
        {pendingTasks.length > 0 && (
          <>
            <View style={[styles.sectionHeader, { marginTop: 12 }]}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Pending Tasks</Text>
              <TouchableOpacity onPress={() => router.push('/tasks')} style={styles.seeAll}>
                <Text style={[styles.seeAllText, { color: colors.primary }]}>See all</Text>
                <ChevronRight size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>
            {pendingTasks.map(task => (
              <TouchableOpacity key={task.id} onPress={() => router.push('/tasks')} activeOpacity={0.7}>
                <View style={[styles.taskCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.priorityBar, { backgroundColor: priorityColor(task.priority) }]} />
                  <View style={{ flex: 1, paddingLeft: 12 }}>
                    <Text style={[styles.taskTitle, { color: colors.text }]} numberOfLines={1}>{task.title}</Text>
                    {task.dueDate && (
                      <Text style={[styles.taskMeta, { color: fmt.dueDate(task.dueDate)?.color || colors.textSecondary }]}>
                        {fmt.dueDate(task.dueDate)?.label}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.priorityChip, { backgroundColor: priorityColor(task.priority) + '18' }]}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: priorityColor(task.priority) }}>
                      {task.priority}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>

      <TabBar />

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push('/notes/editor')}
        style={[styles.fab, { backgroundColor: colors.primary }]}
        activeOpacity={0.85}
      >
        <Plus size={24} color="#fff" strokeWidth={2.5} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 20 },

  /* Hero */
  hero: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  heroOrb: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -60, right: -40,
  },
  heroTop:         { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  heroGreeting:    { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
  heroName:        { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  heroDate:        { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  heroAvatar:      { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  heroAvatarText:  { color: '#fff', fontWeight: '700', fontSize: 16 },
  heroStats:       { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, overflow: 'hidden' },
  heroStat:        { flex: 1, alignItems: 'center', paddingVertical: 10 },
  heroStatBorder:  { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.2)' },
  heroStatValue:   { fontSize: 20, fontWeight: '800', color: '#fff' },
  heroStatLabel:   { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  /* Alert */
  alert: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 14, borderWidth: 1, padding: 12,
    marginHorizontal: 16, marginTop: 12,
  },
  alertText: { flex: 1, fontSize: 13, fontWeight: '500' },

  /* Sections */
  sectionHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10 },
  sectionTitle:    { fontSize: 17, fontWeight: '700', paddingHorizontal: 16, marginTop: 20, marginBottom: 10, letterSpacing: -0.2 },
  seeAll:          { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText:      { fontSize: 13, fontWeight: '600' },

  /* Quick Actions */
  qaRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 4 },
  qa: {
    flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 18,
    borderWidth: 0.5, gap: 8,
  },
  qaIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  qaLabel:    { fontSize: 11, fontWeight: '600' },

  /* Task cards */
  taskCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 8,
    borderRadius: 16, borderWidth: 0.5,
    padding: 14, overflow: 'hidden',
  },
  priorityBar:  { width: 4, height: '100%', borderRadius: 4, position: 'absolute', left: 0 },
  taskTitle:    { fontSize: 14, fontWeight: '600' },
  taskMeta:     { fontSize: 12, marginTop: 3 },
  priorityChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },

  /* Schedule row */
  scheduleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginBottom: 8,
    borderRadius: 16, borderWidth: 0.5, padding: 12,
  },
  dateChip:     { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  dateChipText: { fontSize: 11, fontWeight: '700' },

  /* Notes */
  noteCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginBottom: 8,
    borderRadius: 16, borderWidth: 0.5, padding: 14,
  },
  noteIcon:  { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  noteTitle: { fontSize: 14, fontWeight: '600' },
  noteDate:  { fontSize: 11 },

  /* Empty card */
  emptyCard: {
    alignItems: 'center', paddingVertical: 28,
    marginHorizontal: 16, marginBottom: 8,
    borderRadius: 20, borderWidth: 0.5,
  },

  /* FAB */
  fab: {
    position: 'absolute', bottom: 90, right: 20,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
});
