import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Modal, TextInput, StyleSheet, Platform, ActivityIndicator,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Plus, CheckCircle, Circle, Trash2,
  Flag, X, BookOpen, ExternalLink, Calendar,
  Clock, ChevronRight, AlertCircle, Timer, ChevronDown,
} from 'lucide-react-native';
import { useTasksStore, Priority, Task, Subtask } from '../../store/tasks';
import { useCanvasStore } from '../../store/canvas';
import { useFocusStore } from '../../store/focus';
import { CanvasAssignment } from '../../lib/canvas';
import { Badge, EmptyState, Button } from '../../components/ui';
import TabBar from '../../components/layout/TabBar';
import TopBar from '../../components/layout/TopBar';
import { useColors } from '../../lib/theme';
import { fmt, priorityColor, showAlert } from '../../utils/helpers';
import { claude } from '../../lib/claude';

type Filter = 'week' | 'all' | 'todo' | 'done';

function getWeekRange() {
  const now   = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end   = new Date(now); end.setDate(end.getDate() + 7); end.setHours(23, 59, 59, 999);
  return { start, end };
}

const stripHtml = (s: string) =>
  s.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
   .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();

/* ── TaskRow — module-level to avoid remounts ── */
type TaskRowProps = {
  item: Task;
  colors: any;
  activeFocusId: string | null;
  onComplete:  (id: string) => void;
  onRestore:   (id: string) => void;
  onDelete:    (task: Task) => void;
  onFocus:     (task: Task) => void;
  onUpdate:    (id: string, data: Partial<Task>) => void;
};
function TaskRow({ item, colors, activeFocusId, onComplete, onRestore, onDelete, onFocus, onUpdate }: TaskRowProps) {
  const due      = item.dueDate ? fmt.dueDate(item.dueDate) : null;
  const done     = item.status === 'done';
  const pc       = priorityColor(item.priority);
  const isFocused = activeFocusId === item.id;
  const [showSubs, setShowSubs] = useState(false);
  const hasSubs = item.subtasks && item.subtasks.length > 0;
  const doneSubs = hasSubs ? item.subtasks.filter(s => s.done).length : 0;
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: isFocused ? colors.primary : colors.border }]}>
      {/* Priority bar */}
      <View style={[styles.priorityStrip, { backgroundColor: isFocused ? colors.primary : pc }]} />
      <TouchableOpacity
        onPress={() => done ? onRestore(item.id) : onComplete(item.id)}
        style={{ padding: 2, marginLeft: 10 }}
      >
        {done
          ? <CheckCircle size={22} color={colors.success} fill={colors.success + '25'} />
          : <Circle      size={22} color={colors.border} />}
      </TouchableOpacity>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{
          fontSize: 14, fontWeight: '600', color: colors.text,
          textDecorationLine: done ? 'line-through' : 'none',
          opacity: done ? 0.45 : 1,
        }} numberOfLines={1}>
          {item.title}
        </Text>
        {item.description ? (
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>
            {stripHtml(item.description)}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 7, marginTop: 5, alignItems: 'center', flexWrap: 'wrap' }}>
          {due && <Text style={{ fontSize: 11, fontWeight: '600', color: due.color, flexShrink: 0 }}>{due.label}</Text>}
          <View style={{ flexShrink: 0 }}>
            <Badge
              variant={item.priority === 'critical' ? 'error' : item.priority === 'high' ? 'warning' : item.priority === 'medium' ? 'info' : 'success'}
              size="sm"
            >
              {item.priority}
            </Badge>
          </View>
          {item.canvasId && <View style={{ flexShrink: 0 }}><Badge variant="primary" size="sm">Canvas</Badge></View>}
          {isFocused && (
            <View style={[{ flexShrink: 0, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: colors.primaryLight }]}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.primary }}>FOCUSING</Text>
            </View>
          )}
          {hasSubs && (
            <TouchableOpacity
              onPress={() => setShowSubs(v => !v)}
              style={{ flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: colors.bg, borderWidth: 0.5, borderColor: colors.border }}
            >
              <Text style={{ fontSize: 10, fontWeight: '700', color: doneSubs === item.subtasks.length ? colors.success : colors.textSecondary }}>
                {doneSubs}/{item.subtasks.length}
              </Text>
              <ChevronDown size={9} color={colors.textTertiary} style={showSubs ? { transform: [{ rotate: '180deg' }] } : {}} />
            </TouchableOpacity>
          )}
        </View>
        {/* Inline subtask list */}
        {hasSubs && showSubs && (
          <View style={{ marginTop: 10, gap: 6, paddingLeft: 2 }}>
            {item.subtasks.map(st => (
              <TouchableOpacity
                key={st.id}
                onPress={() => {
                  const updated = item.subtasks.map(s => s.id === st.id ? { ...s, done: !s.done } : s);
                  onUpdate(item.id, { subtasks: updated });
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                {st.done
                  ? <CheckCircle size={15} color={colors.success} fill={colors.success + '25'} />
                  : <Circle      size={15} color={colors.border} />}
                <Text style={{ fontSize: 13, color: colors.textSecondary, textDecorationLine: st.done ? 'line-through' : 'none', opacity: st.done ? 0.5 : 1, flex: 1 }}>
                  {st.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      {!done && (
        <TouchableOpacity
          onPress={() => onFocus(item)}
          style={{ padding: 8 }}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <Timer size={16} color={isFocused ? colors.primary : colors.textTertiary} />
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={() => onDelete(item)} style={{ padding: 8 }}>
        <Trash2 size={15} color={colors.textTertiary} />
      </TouchableOpacity>
    </View>
  );
}

/* ── SwipeableTaskRow — wraps TaskRow with swipe-to-complete / swipe-to-delete on native ── */
function SwipeableTaskRow(props: TaskRowProps) {
  const swipeRef = React.useRef<Swipeable>(null);
  if (Platform.OS === 'web') return <TaskRow {...props} />;
  const isDone = props.item.status === 'done';
  return (
    <Swipeable
      ref={swipeRef}
      renderLeftActions={!isDone ? () => (
        <View style={{ backgroundColor: props.colors.success, borderRadius: 18, marginBottom: 10, justifyContent: 'center', paddingHorizontal: 22, minWidth: 80 }}>
          <CheckCircle size={22} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', marginTop: 3 }}>Done</Text>
        </View>
      ) : undefined}
      renderRightActions={() => (
        <View style={{ backgroundColor: props.colors.error, borderRadius: 18, marginBottom: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 22, minWidth: 80 }}>
          <Trash2 size={22} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', marginTop: 3 }}>Delete</Text>
        </View>
      )}
      onSwipeableOpen={(direction) => {
        if (direction === 'left' && !isDone) props.onComplete(props.item.id);
        else if (direction === 'right') props.onDelete(props.item);
        swipeRef.current?.close();
      }}
      overshootLeft={false}
      overshootRight={false}
    >
      <TaskRow {...props} />
    </Swipeable>
  );
}

/* ── CanvasRow — module-level ── */
type CanvasRowProps = {
  item:          CanvasAssignment;
  colors:        any;
  submissionMap: Map<number, any>;
  courseMap:     Map<number, any>;
  onPress:       (item: CanvasAssignment) => void;
};
function CanvasRow({ item, colors, submissionMap, courseMap, onPress }: CanvasRowProps) {
  const sub         = submissionMap.get(item.id);
  const due         = item.due_at ? fmt.dueDate(item.due_at) : null;
  const course      = courseMap.get(item.course_id);
  const isSubmitted = sub && (sub.workflow_state === 'submitted' || sub.workflow_state === 'graded');
  const isGraded    = sub?.workflow_state === 'graded';
  const isMissing   = sub?.missing;
  const isUrgent    = item.due_at && (new Date(item.due_at).getTime() - Date.now()) < 2 * 86400000 && !isSubmitted;

  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      activeOpacity={0.75}
      style={[styles.card, { backgroundColor: colors.card, borderColor: isUrgent ? colors.warning + '60' : colors.border }]}
    >
      <View style={[styles.priorityStrip, { backgroundColor: isSubmitted ? colors.success : isUrgent ? colors.warning : colors.primary }]} />
      <View style={{ marginLeft: 10, marginRight: 2 }}>
        {isSubmitted
          ? <CheckCircle size={22} color={colors.success} fill={colors.success + '25'} />
          : <BookOpen    size={22} color={isUrgent ? colors.warning : colors.primary} />}
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{
          fontSize: 14, fontWeight: '600', color: colors.text,
          textDecorationLine: isSubmitted ? 'line-through' : 'none',
          opacity: isSubmitted ? 0.5 : 1,
        }} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
          {course && (
            <View style={[styles.coursePill, { backgroundColor: colors.primaryLight }]}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.primary }}>{course.course_code}</Text>
            </View>
          )}
          <Text style={{ fontSize: 11, color: colors.textSecondary }}>{item.points_possible} pts</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
          {due && (
            <Text style={{ fontSize: 11, fontWeight: '600', color: isMissing ? colors.error : due.color, flexShrink: 0 }}>
              {isMissing ? '⚠ Missing' : due.label}
            </Text>
          )}
          {isGraded    && sub?.grade && <View style={{ flexShrink: 0 }}><Badge variant="success" size="sm">Graded: {sub.grade}</Badge></View>}
          {isSubmitted && !isGraded  && <View style={{ flexShrink: 0 }}><Badge variant="success" size="sm">Submitted</Badge></View>}
          {!isSubmitted && !isMissing && <View style={{ flexShrink: 0 }}><Badge variant="neutral" size="sm">Not submitted</Badge></View>}
          {isMissing && <View style={{ flexShrink: 0 }}><Badge variant="error" size="sm">Missing</Badge></View>}
        </View>
      </View>
      <ChevronRight size={16} color={colors.textTertiary} style={{ marginRight: 4 }} />
    </TouchableOpacity>
  );
}

/* ── Assignment detail modal ── */
type AssignmentModalProps = {
  item:    CanvasAssignment | null;
  visible: boolean;
  onClose: () => void;
  colors:  any;
  courseMap: Map<number, any>;
  submissionMap: Map<number, any>;
};
function AssignmentModal({ item, visible, onClose, colors, courseMap, submissionMap }: AssignmentModalProps) {
  const [briefText,    setBriefText]    = useState('');
  const [briefLoading, setBriefLoading] = useState(false);
  const briefItemId = useRef<number | null>(null);

  useEffect(() => {
    if (!visible || !item) { setBriefText(''); return; }
    if (briefItemId.current === item.id) return;
    briefItemId.current = item.id;
    setBriefText('');
    setBriefLoading(true);
    const desc = item.description ? stripHtml(item.description).slice(0, 400) : '';
    const due  = item.due_at ? new Date(item.due_at).toLocaleDateString() : 'No due date';
    let full = '';
    claude.assignmentBrief(item.name, desc, item.points_possible || 0, due, chunk => {
      full += chunk;
      setBriefText(full);
    }).catch(() => {}).finally(() => setBriefLoading(false));
  }, [visible, item?.id]);

  if (!item) return null;
  const course      = courseMap.get(item.course_id);
  const sub         = submissionMap.get(item.id);
  const due         = item.due_at ? fmt.dueDate(item.due_at) : null;
  const isSubmitted = sub && (sub.workflow_state === 'submitted' || sub.workflow_state === 'graded');
  const isGraded    = sub?.workflow_state === 'graded';
  const isMissing   = sub?.missing;
  const desc        = item.description ? stripHtml(item.description).slice(0, 600) : '';

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose} />
      <View style={[styles.detailSheet, { backgroundColor: colors.card }]}>
        <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
        <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.bg, position: 'absolute', top: 20, right: 20 }]}>
          <X size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

        {/* Status icon */}
        <View style={{ alignItems: 'center', marginBottom: 14 }}>
          <View style={[styles.detailIcon, { backgroundColor: isSubmitted ? colors.success + '20' : colors.primaryLight }]}>
            {isSubmitted
              ? <CheckCircle size={28} color={colors.success} />
              : <BookOpen    size={28} color={colors.primary} />}
          </View>
        </View>

        {/* Title */}
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center', letterSpacing: -0.3, marginBottom: 4, paddingHorizontal: 40 }}>
          {item.name}
        </Text>

        {/* Course pill */}
        {course && (
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View style={[styles.coursePill, { backgroundColor: colors.primaryLight, paddingHorizontal: 14, paddingVertical: 5 }]}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>{course.name}</Text>
            </View>
          </View>
        )}

        {/* Meta row */}
        <View style={[styles.metaRow, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          <View style={styles.metaItem}>
            <Calendar size={14} color={colors.textTertiary} />
            <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: '500' }}>
              {due ? due.label : 'No due date'}
            </Text>
          </View>
          <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
          <View style={styles.metaItem}>
            <Flag size={14} color={colors.textTertiary} />
            <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: '500' }}>
              {item.points_possible} pts
            </Text>
          </View>
          <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
          <View style={styles.metaItem}>
            <Clock size={14} color={colors.textTertiary} />
            <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: '500' }}>
              {isGraded ? `Graded: ${sub?.grade}` : isSubmitted ? 'Submitted' : isMissing ? 'Missing' : 'Pending'}
            </Text>
          </View>
        </View>

        {/* AI Brief */}
        {(briefLoading || briefText.length > 0) && (
          <View style={[styles.briefBox, { backgroundColor: colors.primaryLight, borderColor: colors.primary + '30' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                AI Summary
              </Text>
              {briefLoading && <ActivityIndicator size="small" color={colors.primary} />}
            </View>
            <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
              {briefText || ' '}
            </Text>
          </View>
        )}

        {/* Description */}
        {desc ? (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
              Description
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 21 }}>
              {desc}{item.description && item.description.length > 600 ? '…' : ''}
            </Text>
          </View>
        ) : null}

        {/* Grade info */}
        {isGraded && sub?.score != null && (
          <View style={[styles.gradeBox, { backgroundColor: colors.success + '15', borderColor: colors.success + '40' }]}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.success }}>
              Score: {sub.score} / {item.points_possible} · {sub.grade}
            </Text>
          </View>
        )}

        {/* Open in Canvas */}
        {item.html_url && Platform.OS === 'web' && (
          <TouchableOpacity
            onPress={() => (window as any).open(item.html_url, '_blank')}
            style={[styles.canvasBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
          >
            <ExternalLink size={16} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Open in Canvas</Text>
          </TouchableOpacity>
        )}
        </ScrollView>
      </View>
    </Modal>
  );
}

/* ── Main screen ── */
export default function TasksScreen() {
  const router = useRouter();
  const colors = useColors();
  const { tasks, createTask, completeTask, deleteTask, updateTask } = useTasksStore();
  const [newSubtasks, setNewSubtasks] = useState<Subtask[]>([]);
  const { assignments, submissions, connected: canvasConnected, courses } = useCanvasStore();
  const { focusTaskId, setFocusTask } = useFocusStore();
  const [filter,      setFilter]      = useState<Filter>('week');
  const [showAdd,     setShowAdd]     = useState(false);
  const [newTitle,    setNewTitle]    = useState('');
  const [newDesc,     setNewDesc]     = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [newDue,      setNewDue]      = useState('');
  const [saving,      setSaving]      = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<CanvasAssignment | null>(null);

  const submissionMap = useMemo(() => {
    const map = new Map<number, typeof submissions[0]>();
    submissions.forEach(s => map.set(s.assignment_id, s));
    return map;
  }, [submissions]);

  const courseMap = useMemo(() => new Map(courses.map(c => [c.id, c])), [courses]);
  const { start: weekStart, end: weekEnd } = getWeekRange();

// Manual tasks only (never include canvas-imported ones — they live in the Canvas section)
  const manualTasks = useMemo(() => tasks.filter(t => !t.canvasId), [tasks]);

  const filteredTasks = useMemo(() => {
    if (filter === 'week') return manualTasks.filter(t => t.status !== 'done' && t.dueDate && new Date(t.dueDate) >= weekStart && new Date(t.dueDate) <= weekEnd);
    if (filter === 'all')  return manualTasks;
    if (filter === 'todo') return manualTasks.filter(t => t.status !== 'done');
    return manualTasks.filter(t => t.status === 'done');
  }, [manualTasks, filter]);

  // Canvas assignments to show per filter (live from Canvas, never duplicates)
  const visibleCanvas = useMemo(() => {
    if (!canvasConnected) return [];
    if (filter === 'week') {
      return assignments
        .filter(a => { if (!a.due_at) return false; const d = new Date(a.due_at); return d >= weekStart && d <= weekEnd; })
        .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime());
    }
    if (filter === 'todo') {
      return assignments
        .filter(a => { const s = submissionMap.get(a.id); return !s || (s.workflow_state !== 'submitted' && s.workflow_state !== 'graded'); })
        .sort((a, b) => (a.due_at && b.due_at ? new Date(a.due_at).getTime() - new Date(b.due_at).getTime() : 0));
    }
    if (filter === 'done') {
      return assignments
        .filter(a => { const s = submissionMap.get(a.id); return s && (s.workflow_state === 'submitted' || s.workflow_state === 'graded'); });
    }
    if (filter === 'all') {
      return [...assignments].sort((a, b) => (a.due_at && b.due_at ? new Date(a.due_at).getTime() - new Date(b.due_at).getTime() : 0));
    }
    return [];
  }, [assignments, canvasConnected, filter, submissionMap, weekStart, weekEnd]);

  const pendingCount = manualTasks.filter(t => t.status !== 'done').length;
  const doneToday    = manualTasks.filter(t => t.status === 'done' && t.dueDate && new Date(t.dueDate).toDateString() === new Date().toDateString()).length;

  const handleAdd = async () => {
    if (!newTitle.trim()) { showAlert('Title required'); return; }
    setSaving(true);
    try {
      createTask({ title: newTitle.trim(), description: newDesc.trim() || undefined, priority: newPriority, dueDate: newDue || undefined, subtasks: newSubtasks.filter(s => s.title.trim()) });
      setNewTitle(''); setNewDesc(''); setNewPriority('medium'); setNewDue(''); setNewSubtasks([]);
      setShowAdd(false);
    } finally { setSaving(false); }
  };

  const handleDelete = (task: Task) => {
    showAlert('Delete Task', `Delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTask(task.id) },
    ]);
  };

  const handleFocus = (task: Task) => {
    setFocusTask(task.id, task.title);
    router.push('/focus');
  };

  const FILTERS: { key: Filter; label: string; count?: number }[] = [
    { key: 'week', label: 'This Week', count: filteredTasks.length + visibleCanvas.length },
    { key: 'all',  label: 'All',       count: manualTasks.length + (canvasConnected ? assignments.length : 0) },
    { key: 'todo', label: 'Pending',   count: pendingCount },
    { key: 'done', label: 'Done',      count: manualTasks.filter(t => t.status === 'done').length },
  ];

  const showEmpty = filteredTasks.length === 0 && visibleCanvas.length === 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar />
      {Platform.OS === 'web' && <View style={{ height: 50 }} />}

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.screenTitle, { color: colors.text }]}>Tasks</Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 1 }}>
            {pendingCount > 0 ? `${pendingCount} pending` : 'All caught up 🎉'}
            {doneToday > 0 ? ` · ${doneToday} done today` : ''}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowAdd(true)}
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
        >
          <Plus size={20} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* ── Filter pills ── */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8, height: 42, alignItems: 'center' }}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[
              styles.filterPill,
              { backgroundColor: filter === f.key ? colors.primary : colors.card, borderColor: filter === f.key ? colors.primary : colors.border },
            ]}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: filter === f.key ? '#fff' : colors.textSecondary }}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Content ── */}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>

        {/* Canvas section — shown for all filters when connected */}
        {canvasConnected && visibleCanvas.length > 0 && (
          <View style={[styles.sectionChip, { backgroundColor: colors.primaryLight }]}>
            <BookOpen size={13} color={colors.primary} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>
              Canvas — {filter === 'week' ? 'This Week' : filter === 'todo' ? 'Pending' : filter === 'done' ? 'Submitted' : 'All'} ({visibleCanvas.length})
            </Text>
          </View>
        )}
        {canvasConnected && visibleCanvas.map(a => (
          <CanvasRow
            key={a.id}
            item={a}
            colors={colors}
            submissionMap={submissionMap}
            courseMap={courseMap}
            onPress={setSelectedAssignment}
          />
        ))}

        {/* Manual tasks section header */}
        {canvasConnected && visibleCanvas.length > 0 && filteredTasks.length > 0 && (
          <View style={[styles.sectionChip, { backgroundColor: colors.success + '15', marginTop: 8 }]}>
            <CheckCircle size={13} color={colors.success} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.success }}>
              My Tasks ({filteredTasks.length})
            </Text>
          </View>
        )}
        {filteredTasks.map(item => (
          <SwipeableTaskRow
            key={item.id}
            item={item}
            colors={colors}
            activeFocusId={focusTaskId}
            onComplete={completeTask}
            onRestore={id => updateTask(id, { status: 'todo' })}
            onDelete={handleDelete}
            onFocus={handleFocus}
            onUpdate={updateTask}
          />
        ))}

        {showEmpty && (
          <EmptyState
            icon={<CheckCircle size={36} color={colors.primary} />}
            title={filter === 'week' ? 'Nothing due this week' : 'No tasks'}
            message="Tap + to add a task"
            action={{ label: 'Add Task', onPress: () => setShowAdd(true) }}
          />
        )}
      </ScrollView>

      <TabBar />

      <TouchableOpacity
        onPress={() => setShowAdd(true)}
        style={[styles.fab, { backgroundColor: colors.primary }]}
      >
        <Plus size={24} color="#fff" strokeWidth={2.5} />
      </TouchableOpacity>

      {/* ── Assignment detail modal ── */}
      <AssignmentModal
        item={selectedAssignment}
        visible={!!selectedAssignment}
        onClose={() => setSelectedAssignment(null)}
        colors={colors}
        courseMap={courseMap}
        submissionMap={submissionMap}
      />

      {/* ── Add Task Modal ── */}
      <Modal visible={showAdd} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAdd(false)} />
        <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 19, fontWeight: '700', color: colors.text }}>New Task</Text>
            <TouchableOpacity onPress={() => setShowAdd(false)} style={[styles.closeBtn, { backgroundColor: colors.bg }]}>
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <TextInput
            style={[styles.modalInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }]}
            placeholder="Task title *"
            placeholderTextColor={colors.textTertiary}
            value={newTitle}
            onChangeText={setNewTitle}
            autoFocus
          />
          <TextInput
            style={[styles.modalInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg, height: 72 }]}
            placeholder="Description (optional)"
            placeholderTextColor={colors.textTertiary}
            value={newDesc}
            onChangeText={setNewDesc}
            multiline
          />
          {Platform.OS === 'web' ? (
            // @ts-ignore
            <input
              type="date"
              value={newDue}
              onChange={(e: any) => setNewDue(e.target.value)}
              style={{
                borderRadius: 12, borderWidth: 1, borderStyle: 'solid',
                padding: '12px 14px', fontSize: 15, marginBottom: 16,
                width: '100%', boxSizing: 'border-box',
                background: 'transparent', outline: 'none',
                borderColor: colors.border, color: colors.text,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              } as any}
            />
          ) : (
            <TextInput
              style={[styles.modalInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }]}
              placeholder="Due date  YYYY-MM-DD"
              placeholderTextColor={colors.textTertiary}
              value={newDue}
              onChangeText={setNewDue}
            />
          )}

          {/* Subtasks */}
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8 }}>Subtasks</Text>
          {newSubtasks.map((st, i) => (
            <View key={st.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary }} />
              <TextInput
                style={[styles.modalInput, { flex: 1, marginBottom: 0, paddingVertical: 8, fontSize: 14, borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }]}
                placeholder={`Subtask ${i + 1}`}
                placeholderTextColor={colors.textTertiary}
                value={st.title}
                onChangeText={t => setNewSubtasks(prev => prev.map(s => s.id === st.id ? { ...s, title: t } : s))}
              />
              <TouchableOpacity onPress={() => setNewSubtasks(prev => prev.filter(s => s.id !== st.id))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={14} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            onPress={() => setNewSubtasks(prev => [...prev, { id: 's' + Date.now(), title: '', done: false }])}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, marginBottom: 16 }}
          >
            <Plus size={14} color={colors.primary} />
            <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600' }}>Add subtask</Text>
          </TouchableOpacity>

          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 10 }}>Priority</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
            {(['low', 'medium', 'high', 'critical'] as Priority[]).map(p => (
              <TouchableOpacity
                key={p}
                onPress={() => setNewPriority(p)}
                style={{
                  flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: 4, paddingVertical: 9, borderRadius: 12, borderWidth: 1.5,
                  borderColor: priorityColor(p),
                  backgroundColor: newPriority === p ? priorityColor(p) + '20' : 'transparent',
                }}
              >
                <Flag size={12} color={priorityColor(p)} />
                <Text style={{ fontSize: 12, color: priorityColor(p), fontWeight: '700' }}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Button variant="primary" onPress={handleAdd} loading={saving} fullWidth size="lg">
            Add Task
          </Button>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
  },
  screenTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  addBtn:      { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },

  filterPill: {
    height: 34, paddingHorizontal: 16, borderRadius: 17, borderWidth: 0.5,
    alignItems: 'center', justifyContent: 'center',
  },

  card: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 18, borderWidth: 0.5, marginBottom: 10,
    overflow: 'hidden', paddingRight: 8, paddingVertical: 12,
  },
  priorityStrip: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  coursePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  sectionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 10,
  },

  fab: {
    position: 'absolute', bottom: 90, right: 20,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 44,
  },
  detailSheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 44, maxHeight: '85%',
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  closeBtn:    { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modalInput: {
    borderWidth: 1, borderRadius: 12, padding: 13,
    fontSize: 15, marginBottom: 12,
  },

  detailIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  metaRow: {
    flexDirection: 'row', borderRadius: 14, borderWidth: 0.5,
    overflow: 'hidden', marginBottom: 16,
  },
  metaItem:    { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12, flexDirection: 'column' },
  metaDivider: { width: 0.5, alignSelf: 'stretch' },
  gradeBox:    { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 16, alignItems: 'center' },
  briefBox:    { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 16 },
  canvasBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 16, padding: 15, marginTop: 8,
  },
});
