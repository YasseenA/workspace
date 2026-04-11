import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Modal, TextInput, StyleSheet, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Plus, CheckCircle, Circle, Trash2,
  Flag, X, BookOpen, ExternalLink,
} from 'lucide-react-native';
import { useTasksStore, Priority, Task } from '../../store/tasks';
import { useCanvasStore } from '../../store/canvas';
import { CanvasAssignment } from '../../lib/canvas';
import { Badge, EmptyState, Button } from '../../components/ui';
import TabBar from '../../components/layout/TabBar';
import { useColors } from '../../lib/theme';
import { fmt, priorityColor, showAlert } from '../../utils/helpers';

type Filter = 'week' | 'all' | 'todo' | 'done';

function getWeekRange() {
  const now   = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end   = new Date(now); end.setDate(end.getDate() + 7); end.setHours(23, 59, 59, 999);
  return { start, end };
}

export default function TasksScreen() {
  const colors = useColors();
  const { tasks, createTask, completeTask, deleteTask, updateTask } = useTasksStore();
  const { assignments, submissions, connected: canvasConnected, courses } = useCanvasStore();
  const [filter,      setFilter]      = useState<Filter>('week');
  const [showAdd,     setShowAdd]     = useState(false);
  const [newTitle,    setNewTitle]    = useState('');
  const [newDesc,     setNewDesc]     = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [newDue,      setNewDue]      = useState('');
  const [saving,      setSaving]      = useState(false);

  const submissionMap = useMemo(() => {
    const map = new Map<number, typeof submissions[0]>();
    submissions.forEach(s => map.set(s.assignment_id, s));
    return map;
  }, [submissions]);

  const courseMap = useMemo(() => new Map(courses.map(c => [c.id, c])), [courses]);
  const { start: weekStart, end: weekEnd } = getWeekRange();

  const weekCanvas = useMemo(() => {
    if (!canvasConnected) return [];
    return assignments
      .filter(a => {
        if (!a.due_at) return false;
        const d = new Date(a.due_at);
        return d >= weekStart && d <= weekEnd;
      })
      .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime());
  }, [assignments, canvasConnected, weekStart, weekEnd]);

  const filteredTasks = useMemo(() => {
    if (filter === 'week') return tasks.filter(t => t.status !== 'done' && t.dueDate && new Date(t.dueDate) >= weekStart && new Date(t.dueDate) <= weekEnd);
    if (filter === 'all')  return tasks;
    if (filter === 'todo') return tasks.filter(t => t.status !== 'done');
    return tasks.filter(t => t.status === 'done');
  }, [tasks, filter]);

  const pendingCount = tasks.filter(t => t.status !== 'done').length;

  const handleAdd = async () => {
    if (!newTitle.trim()) { showAlert('Title required'); return; }
    setSaving(true);
    try {
      createTask({
        title:       newTitle.trim(),
        description: newDesc.trim() || undefined,
        priority:    newPriority,
        dueDate:     newDue || undefined,
      });
      setNewTitle(''); setNewDesc(''); setNewPriority('medium'); setNewDue('');
      setShowAdd(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (task: Task) => {
    showAlert('Delete Task', `Delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTask(task.id) },
    ]);
  };

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'week', label: 'This Week' },
    { key: 'all',  label: 'All'       },
    { key: 'todo', label: 'Pending'   },
    { key: 'done', label: 'Done'      },
  ];

  const TaskRow = ({ item }: { item: Task }) => {
    const due  = item.dueDate ? fmt.dueDate(item.dueDate) : null;
    const done = item.status === 'done';
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => done ? updateTask(item.id, { status: 'todo' }) : completeTask(item.id)}
          style={{ padding: 2 }}
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
              {item.description}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 7, marginTop: 5, alignItems: 'center', flexWrap: 'wrap' }}>
            {due && (
              <Text style={{ fontSize: 11, fontWeight: '600', color: due.color }}>{due.label}</Text>
            )}
            <Badge
              variant={item.priority === 'critical' ? 'error' : item.priority === 'high' ? 'warning' : item.priority === 'medium' ? 'info' : 'success'}
              size="sm"
            >
              {item.priority}
            </Badge>
            {item.canvasId && <Badge variant="primary" size="sm">Canvas</Badge>}
          </View>
        </View>
        <TouchableOpacity onPress={() => handleDelete(item)} style={{ padding: 8 }}>
          <Trash2 size={15} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>
    );
  };

  const CanvasRow = ({ item }: { item: CanvasAssignment }) => {
    const sub         = submissionMap.get(item.id);
    const due         = item.due_at ? fmt.dueDate(item.due_at) : null;
    const course      = courseMap.get(item.course_id);
    const isSubmitted = sub && (sub.workflow_state === 'submitted' || sub.workflow_state === 'graded');
    const isGraded    = sub?.workflow_state === 'graded';
    const isMissing   = sub?.missing;

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={{ marginRight: 2 }}>
          {isSubmitted
            ? <CheckCircle size={22} color={colors.success} fill={colors.success + '25'} />
            : <BookOpen    size={22} color={colors.primary} />}
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{
            fontSize: 14, fontWeight: '600', color: colors.text,
            textDecorationLine: isSubmitted ? 'line-through' : 'none',
            opacity: isSubmitted ? 0.5 : 1,
          }} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
            {course?.course_code} · {item.points_possible} pts
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
            {due && (
              <Text style={{ fontSize: 11, fontWeight: '600', color: isMissing ? colors.error : due.color }}>
                {isMissing ? 'Missing' : due.label}
              </Text>
            )}
            {isGraded    && sub?.grade && <Badge variant="success" size="sm">Graded: {sub.grade}</Badge>}
            {isSubmitted && !isGraded  && <Badge variant="success" size="sm">Submitted</Badge>}
            {!isSubmitted && !isMissing && <Badge variant="neutral" size="sm">Not submitted</Badge>}
            {isMissing && <Badge variant="error" size="sm">Missing</Badge>}
          </View>
        </View>
        {item.html_url && (
          <TouchableOpacity
            onPress={() => { if (Platform.OS === 'web') (window as any).open(item.html_url, '_blank'); }}
            style={{ padding: 8 }}
          >
            <ExternalLink size={15} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const showEmpty = filteredTasks.length === 0 &&
    (filter !== 'week' || !canvasConnected || weekCanvas.length === 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.screenTitle, { color: colors.text }]}>Tasks</Text>
          {pendingCount > 0 && (
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 1 }}>
              {pendingCount} pending
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => setShowAdd(true)}
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
        >
          <Plus size={20} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 4 }}
        style={{ maxHeight: 44, marginBottom: 8 }}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[
              styles.filterPill,
              {
                backgroundColor: filter === f.key ? colors.primary : colors.card,
                borderColor:     filter === f.key ? colors.primary : colors.border,
              },
            ]}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: filter === f.key ? '#fff' : colors.textSecondary }}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Canvas section header */}
        {filter === 'week' && canvasConnected && weekCanvas.length > 0 && (
          <View style={[styles.sectionChip, { backgroundColor: colors.primaryLight }]}>
            <BookOpen size={13} color={colors.primary} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>
              Canvas — This Week ({weekCanvas.length})
            </Text>
          </View>
        )}
        {filter === 'week' && canvasConnected && weekCanvas.map(a => <CanvasRow key={a.id} item={a} />)}

        {/* Manual tasks section header */}
        {filter === 'week' && canvasConnected && weekCanvas.length > 0 && filteredTasks.length > 0 && (
          <View style={[styles.sectionChip, { backgroundColor: colors.success + '15', marginTop: 8 }]}>
            <CheckCircle size={13} color={colors.success} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.success }}>
              My Tasks — This Week ({filteredTasks.length})
            </Text>
          </View>
        )}
        {filteredTasks.map(item => <TaskRow key={item.id} item={item} />)}

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

      {/* ── Add Task Modal ── */}
      <Modal visible={showAdd} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAdd(false)}
        />
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
          <TextInput
            style={[styles.modalInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }]}
            placeholder="Due date  YYYY-MM-DD"
            placeholderTextColor={colors.textTertiary}
            value={newDue}
            onChangeText={setNewDue}
          />

          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 10 }}>Priority</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
            {(['low', 'medium', 'high', 'critical'] as Priority[]).map(p => (
              <TouchableOpacity
                key={p}
                onPress={() => setNewPriority(p)}
                style={{
                  flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: 4, paddingVertical: 9, borderRadius: 12, borderWidth: 1.5,
                  borderColor:     priorityColor(p),
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
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 0.5,
  },

  card: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: 18, borderWidth: 0.5, marginBottom: 10,
  },
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
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  closeBtn:    { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modalInput: {
    borderWidth: 1, borderRadius: 12, padding: 13,
    fontSize: 15, marginBottom: 12,
  },
});
