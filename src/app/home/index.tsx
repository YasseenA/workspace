import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, StyleSheet, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  FileText, CheckSquare, Zap, Timer,
  Plus, ChevronRight, Clock, BookOpen,
  Calendar, ArrowRight, MessageCircle, RefreshCw, Search, Mail, X, Layers,
} from 'lucide-react-native';
import { useUser } from '@clerk/clerk-expo';
import { useNotesStore } from '../../store/notes';
import { useTasksStore } from '../../store/tasks';
import { useFocusStore } from '../../store/focus';
import { useCanvasStore } from '../../store/canvas';
import { useTeamsStore } from '../../store/teams';
import { useAuthStore } from '../../store/auth';
import { useSettingsStore } from '../../store/settings';
import { requestPermission, notifyDueSoon, notifyOverdue } from '../../lib/notifications';
import TabBar from '../../components/layout/TabBar';
import TopBar from '../../components/layout/TopBar';
import { useColors } from '../../lib/theme';
import { claude } from '../../lib/claude';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fmt, priorityColor, initials } from '../../utils/helpers';
import AssignmentDetailSheet, { SheetItem } from '../../components/AssignmentDetailSheet';

const BRIEF_CACHE_KEY = 'home_daily_brief';
const BRIEF_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

async function loadBriefCache(): Promise<{ text: string; ts: number } | null> {
  try {
    const raw = Platform.OS === 'web'
      ? (typeof localStorage !== 'undefined' ? localStorage.getItem(BRIEF_CACHE_KEY) : null)
      : await AsyncStorage.getItem(BRIEF_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

async function saveBriefCache(text: string) {
  const data = JSON.stringify({ text, ts: Date.now() });
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(BRIEF_CACHE_KEY, data);
    } else {
      await AsyncStorage.setItem(BRIEF_CACHE_KEY, data);
    }
  } catch {}
}

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useUser();
  const { notes } = useNotesStore();
  const { tasks, completeTask } = useTasksStore();
  const { totalFocusMinutes, streak } = useFocusStore();
  const { assignments, courses, submissions, connected: canvasConnected } = useCanvasStore();
  const { assignments: teamsAssignments } = useTeamsStore();
  const { hasOnboarded } = useAuthStore();
  const { notificationsEnabled } = useSettingsStore();
  const [refreshing, setRefreshing] = useState(false);
  const [sheetItem, setSheetItem] = useState<SheetItem | null>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [installDismissed, setInstallDismissed] = useState(() => {
    try { return typeof localStorage !== 'undefined' && localStorage.getItem('pwa_install_dismissed') === '1'; }
    catch { return false; }
  });
  const subMap    = React.useMemo(() => new Map(submissions.map(s => [s.assignment_id, s])), [submissions]);

  const [briefText,    setBriefText]    = useState('');
  const [briefLoading, setBriefLoading] = useState(false);
  const briefStarted = useRef(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 800));
    setRefreshing(false);
  };

  const loadBrief = async (force = false) => {
    if (briefLoading) return;
    if (!force) {
      const cached = await loadBriefCache();
      if (cached && Date.now() - cached.ts < BRIEF_TTL_MS) {
        setBriefText(cached.text);
        return;
      }
    } else {
      await saveBriefCache(''); // invalidate
    }
    setBriefText('');
    setBriefLoading(true);
    try {
      const now = new Date();
      const firstName = user?.firstName || 'Student';
      const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const upcoming = assignments
        .filter(a => a.due_at && new Date(a.due_at) > now && new Date(a.due_at) <= sevenDays)
        .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime())
        .slice(0, 4)
        .map(a => `${a.name} (due ${new Date(a.due_at!).toLocaleDateString()})`)
        .join(', ');
      const overdue = tasks.filter(t =>
        t.status !== 'done' && t.dueDate && new Date(t.dueDate) < now
      ).map(t => t.title).slice(0, 3).join(', ');
      const context = `It's ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}. ${firstName} is a student with ${notes.length} notes and ${tasks.filter(t => t.status !== 'done').length} pending tasks.${upcoming ? ` Upcoming assignments: ${upcoming}.` : ''}${overdue ? ` Overdue tasks: ${overdue}.` : ''} Write a 2-sentence personalized daily brief about what they should focus on today.`;
      let full = '';
      await claude.dailyBrief(context, chunk => {
        full += chunk;
        setBriefText(full);
      });
      await saveBriefCache(full);
    } catch {
      setBriefText('');
    } finally {
      setBriefLoading(false);
    }
  };

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handler = (e: any) => { e.preventDefault(); setInstallPrompt(e); };
      window.addEventListener('beforeinstallprompt', handler);
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }
  }, []);

  useEffect(() => {
    if (briefStarted.current) return;
    briefStarted.current = true;
    loadBrief();

    // Request notification permission and fire due-soon alerts on web
    if (Platform.OS === 'web' && notificationsEnabled) {
      requestPermission().then(perm => {
        if (perm !== 'granted') return;
        const items = [
          ...assignments
            .filter(a => a.due_at)
            .map(a => ({
              id: `canvas-${a.id}`,
              title: a.name,
              dueAt: new Date(a.due_at!),
              kind: 'assignment' as const,
              courseName: courses.find(c => c.id === a.course_id)?.name,
            })),
          ...teamsAssignments
            .filter(a => a.dueDateTime)
            .map(a => ({
              id: `teams-${a.id}`,
              title: a.displayName,
              dueAt: new Date(a.dueDateTime!),
              kind: 'teams' as const,
              courseName: a.className,
            })),
          ...tasks
            .filter(t => t.status !== 'done' && t.dueDate)
            .map(t => ({ id: `task-${t.id}`, title: t.title, dueAt: new Date(t.dueDate!), kind: 'task' as const })),
        ];
        notifyDueSoon(items);
        notifyOverdue(items);
      });
    }
  }, []);

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

  const _hex = (h: string, f: number) => {
    const n = parseInt(h.replace('#',''), 16);
    const r = Math.max(0, Math.min(255, Math.round(((n>>16)&0xff)*f)));
    const g = Math.max(0, Math.min(255, Math.round(((n>>8)&0xff)*f)));
    const b = Math.max(0, Math.min(255, Math.round((n&0xff)*f)));
    return '#'+((r<<16)|(g<<8)|b).toString(16).padStart(6,'0');
  };
  const heroGradient: any = Platform.OS === 'web'
    ? { background: `linear-gradient(135deg, ${colors.primary} 0%, ${_hex(colors.primary,0.72)} 70%, ${_hex(colors.primary,0.52)} 100%)` }
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
      <TopBar />
      <ScrollView
        contentContainerStyle={[styles.scroll, Platform.OS === 'web' && { paddingTop: 50 }]}
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
              onPress={() => router.push('/search')}
              style={[styles.heroAvatar, { backgroundColor: 'rgba(255,255,255,0.18)' }]}
            >
              <Search size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Mini stats inside hero */}
          <View style={styles.heroStats}>
            {[
              { value: notes.length,                              label: 'Notes',     icon: '📝' },
              { value: totalDue,                                  label: 'Due today', icon: '📋' },
              { value: streak,                                    label: 'Day streak', icon: '🔥' },
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

        {/* ── PWA install banner ── */}
        {Platform.OS === 'web' && installPrompt && !installDismissed && (
          <View style={[styles.installBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ fontSize: 20 }}>📲</Text>
            <View style={{ flex: 1 }}>
              <Text style={[{ fontSize: 14, fontWeight: '700', color: colors.text }]}>Install Workspace</Text>
              <Text style={[{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }]}>Add to your home screen for quick access</Text>
            </View>
            <TouchableOpacity
              onPress={async () => {
                installPrompt.prompt();
                const { outcome } = await installPrompt.userChoice;
                if (outcome === 'accepted') setInstallPrompt(null);
              }}
              style={[styles.installBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Install</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setInstallDismissed(true);
                try { localStorage.setItem('pwa_install_dismissed', '1'); } catch {}
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Quick actions ── */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
        <View style={styles.qaRow}>
          {[
            { icon: FileText,    label: 'New Note',   color: colors.primary, bg: colors.primaryLight, route: '/notes/editor' },
            { icon: CheckSquare, label: 'Add Task',   color: '#10b981',      bg: '#d1fae5',           route: '/tasks' },
            { icon: Zap,         label: 'AI Studio',  color: '#f59e0b',      bg: '#fef3c7',           route: '/ai-studio' },
            { icon: Timer,       label: 'Focus',      color: '#ec4899',      bg: '#fce7f3',           route: '/focus' },
            { icon: Layers,      label: 'Flashcards', color: '#f97316',      bg: '#ffedd5',           route: '/flashcards' },
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

        {/* ── Study Buddy banner ── */}
        <TouchableOpacity
          onPress={() => router.push('/study-buddy' as any)}
          style={[styles.buddyCard, { borderColor: '#7c3aed30' }]}
          activeOpacity={0.85}
        >
          {Platform.OS === 'web'
            ? <div style={{ position: 'absolute', inset: 0, borderRadius: 18, background: 'linear-gradient(120deg, #7c3aed18 0%, #4338ca10 100%)' }} />
            : <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 18, backgroundColor: '#7c3aed0d' }} />
          }
          <View style={[styles.buddyIconWrap, { backgroundColor: '#7c3aed' }]}>
            <MessageCircle size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.buddyTitle, { color: colors.text }]}>Study Buddy</Text>
            <Text style={[styles.buddySub, { color: colors.textTertiary }]}>
              AI tutor that knows your courses & assignments
            </Text>
          </View>
          <ChevronRight size={16} color="#7c3aed" />
        </TouchableOpacity>

        {/* ── Email Draft + Weekly Planner row ── */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 0 }}>
          <TouchableOpacity
            onPress={() => router.push('/email' as any)}
            style={[styles.buddyCard, { flex: 1, borderColor: '#f9731630', marginBottom: 10 }]}
            activeOpacity={0.85}
          >
            {Platform.OS === 'web'
              ? <div style={{ position: 'absolute', inset: 0, borderRadius: 18, background: 'linear-gradient(120deg, #f9731618 0%, #ea580c10 100%)' }} />
              : <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 18, backgroundColor: '#f973160d' }} />
            }
            <View style={[styles.buddyIconWrap, { backgroundColor: '#f97316' }]}>
              <Mail size={18} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.buddyTitle, { color: colors.text }]}>Email Draft</Text>
              <Text style={[styles.buddySub, { color: colors.textTertiary }]}>AI-written student emails</Text>
            </View>
            <ChevronRight size={16} color="#f97316" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/calendar' as any)}
            style={[styles.buddyCard, { flex: 1, borderColor: '#10b98130', marginBottom: 10 }]}
            activeOpacity={0.85}
          >
            {Platform.OS === 'web'
              ? <div style={{ position: 'absolute', inset: 0, borderRadius: 18, background: 'linear-gradient(120deg, #10b98118 0%, #05966910 100%)' }} />
              : <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 18, backgroundColor: '#10b9810d' }} />
            }
            <View style={[styles.buddyIconWrap, { backgroundColor: '#10b981' }]}>
              <Calendar size={18} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.buddyTitle, { color: colors.text }]}>Calendar</Text>
              <Text style={[styles.buddySub, { color: colors.textTertiary }]}>Deadlines at a glance</Text>
            </View>
            <ChevronRight size={16} color="#10b981" />
          </TouchableOpacity>
        </View>

        {/* ── AI Daily Brief ── */}
        <View style={[styles.briefCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.briefHeader}>
            <View style={[styles.briefIcon, { backgroundColor: '#7c3aed18' }]}>
              <Zap size={14} color="#7c3aed" fill="#7c3aed" />
            </View>
            <Text style={[styles.briefTitle, { color: colors.text }]}>Daily Brief</Text>
            <TouchableOpacity
              onPress={() => loadBrief(true)}
              disabled={briefLoading}
              style={{ marginLeft: 'auto' as any, padding: 4 }}
            >
              <RefreshCw size={13} color={briefLoading ? colors.textTertiary : colors.primary} />
            </TouchableOpacity>
          </View>
          {briefLoading && briefText === '' ? (
            <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center', paddingVertical: 2 }}>
              <ActivityIndicator size="small" color="#7c3aed" />
              <Text style={[styles.briefBody, { color: colors.textTertiary }]}>Thinking…</Text>
            </View>
          ) : briefText.length > 0 ? (
            <Text style={[styles.briefBody, { color: colors.textSecondary }]}>{briefText}</Text>
          ) : (
            <TouchableOpacity onPress={() => loadBrief(true)} activeOpacity={0.7}>
              <Text style={[styles.briefBody, { color: colors.textTertiary }]}>
                Tap ↻ to generate your daily brief
              </Text>
            </TouchableOpacity>
          )}
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
              <TouchableOpacity
                key={task.id}
                onPress={() => setSheetItem({ kind: 'task', data: task })}
                activeOpacity={0.7}
              >
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
              <TouchableOpacity
                key={a.id}
                onPress={() => setSheetItem({ kind: 'canvas', data: a, course: courseMap.get(a.course_id), submission: subMap.get(a.id) })}
                activeOpacity={0.7}
              >
                <View style={[styles.taskCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.priorityBar, { backgroundColor: '#10b981' }]} />
                  <View style={{ flex: 1, paddingLeft: 12 }}>
                    <Text style={[styles.taskTitle, { color: colors.text }]} numberOfLines={1}>{a.name}</Text>
                    <Text style={[styles.taskMeta, { color: colors.textSecondary }]}>
                      {courseMap.get(a.course_id)?.course_code || 'Canvas'} · Due today
                    </Text>
                  </View>
                  <ChevronRight size={14} color={colors.textTertiary} />
                </View>
              </TouchableOpacity>
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
              <TouchableOpacity onPress={() => router.push('/calendar')} style={styles.seeAll}>
                <Text style={[styles.seeAllText, { color: colors.primary }]}>Calendar</Text>
                <ChevronRight size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>
            {nextWeek.slice(0, 5).map(a => {
              const course   = courseMap.get(a.course_id);
              const label    = a.due_at ? dayLabel(a.due_at) : '';
              const isUrgent = a.due_at && (new Date(a.due_at).getTime() - now.getTime()) < 2 * 86400000;
              return (
                <TouchableOpacity
                  key={a.id}
                  onPress={() => setSheetItem({ kind: 'canvas', data: a, course, submission: subMap.get(a.id) })}
                  activeOpacity={0.7}
                >
                  <View style={[styles.scheduleRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
                    <ChevronRight size={14} color={colors.textTertiary} />
                  </View>
                </TouchableOpacity>
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

        {/* ── Course Grades (Canvas) ── */}
        {canvasConnected && courses.some(c => c.enrollments?.[0]?.computed_current_score != null) && (
          <>
            <View style={[styles.sectionHeader, { marginTop: 12 }]}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>My Grades</Text>
              <TouchableOpacity onPress={() => router.push('/canvas')} style={styles.seeAll}>
                <Text style={[styles.seeAllText, { color: colors.primary }]}>Canvas</Text>
                <ChevronRight size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 }}>
              {courses
                .filter(c => c.enrollments?.[0]?.computed_current_score != null)
                .slice(0, 6)
                .map(c => {
                  const score = c.enrollments![0].computed_current_score!;
                  const grade = c.enrollments![0].computed_current_grade;
                  const gc = score >= 90 ? colors.success : score >= 80 ? colors.primary : score >= 70 ? colors.warning : colors.error;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => router.push('/canvas')}
                      style={[styles.gradeCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    >
                      <Text style={{ fontSize: 20, fontWeight: '800', color: gc }}>{grade ?? `${Math.round(score)}%`}</Text>
                      <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2 }} numberOfLines={1}>{c.course_code}</Text>
                    </TouchableOpacity>
                  );
                })}
            </View>
          </>
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

      <AssignmentDetailSheet
        item={sheetItem}
        onClose={() => setSheetItem(null)}
        onCompleteTask={(id) => { completeTask(id); setSheetItem(null); }}
      />

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

  /* Grade card */
  gradeCard: {
    width: 100, alignItems: 'center', paddingVertical: 14,
    borderRadius: 16, borderWidth: 0.5,
  },

  /* Empty card */
  emptyCard: {
    alignItems: 'center', paddingVertical: 28,
    marginHorizontal: 16, marginBottom: 8,
    borderRadius: 20, borderWidth: 0.5,
  },

  /* Study Buddy card */
  buddyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginBottom: 8, marginTop: 4,
    borderRadius: 18, borderWidth: 1, padding: 14,
    overflow: 'hidden', position: 'relative',
  },
  buddyIconWrap: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  buddyTitle:    { fontSize: 15, fontWeight: '700' },
  buddySub:      { fontSize: 12, marginTop: 2 },

  /* Daily Brief */
  briefCard: {
    marginHorizontal: 16, marginBottom: 8, marginTop: 4,
    borderRadius: 18, borderWidth: 0.5, padding: 14,
  },
  briefHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  briefIcon:   { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  briefTitle:  { fontSize: 13, fontWeight: '700' },
  briefBody:   { fontSize: 13, lineHeight: 21 },

  /* Install banner */
  installBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginBottom: 10,
    borderRadius: 16, borderWidth: 0.5, padding: 12,
  },
  installBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 10, flexShrink: 0,
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
