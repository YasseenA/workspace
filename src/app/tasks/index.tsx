import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, CheckCircle, Circle, Trash2, Flag, X, BookOpen, ExternalLink } from 'lucide-react-native';
import { useTasksStore, Priority, Task } from '../../store/tasks';
import { useCanvasStore } from '../../store/canvas';
import { CanvasAssignment } from '../../lib/canvas';
import { Card, Badge, EmptyState, Button } from '../../components/ui';
import TabBar from '../../components/layout/TabBar';
import { useColors } from '../../lib/theme';
import { fmt, priorityColor, showAlert } from '../../utils/helpers';
import { Platform } from 'react-native';

type Filter = 'week' | 'all' | 'todo' | 'done';

function getWeekRange() {
  const now = new Date();
  const start = new Date(now); start.setHours(0,0,0,0);
  const end = new Date(now); end.setDate(end.getDate() + 7); end.setHours(23,59,59,999);
  return { start, end };
}

export default function TasksScreen() {
  const colors = useColors();
  const { tasks, createTask, completeTask, deleteTask, updateTask } = useTasksStore();
  const { assignments, submissions, connected: canvasConnected, courses } = useCanvasStore();
  const [filter, setFilter] = useState<Filter>('week');
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [newDue, setNewDue] = useState('');
  const [saving, setSaving] = useState(false);

  const submissionMap = useMemo(() => {
    const map = new Map<number, typeof submissions[0]>();
    submissions.forEach(s => map.set(s.assignment_id, s));
    return map;
  }, [submissions]);

  const courseMap = useMemo(() => new Map(courses.map(c => [c.id, c])), [courses]);

  const { start: weekStart, end: weekEnd } = getWeekRange();

  // Canvas assignments due this week
  const weekCanvasAssignments = useMemo(() => {
    if (!canvasConnected) return [];
    return assignments.filter(a => {
      if (!a.due_at) return false;
      const d = new Date(a.due_at);
      return d >= weekStart && d <= weekEnd;
    }).sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime());
  }, [assignments, canvasConnected, weekStart, weekEnd]);

  const filteredTasks = useMemo(() => {
    if (filter === 'week') return tasks.filter(t => t.status !== 'done' && t.dueDate && new Date(t.dueDate) >= weekStart && new Date(t.dueDate) <= weekEnd);
    if (filter === 'all') return tasks;
    if (filter === 'todo') return tasks.filter(t => t.status !== 'done');
    return tasks.filter(t => t.status === 'done');
  }, [tasks, filter]);

  const handleAdd = async () => {
    if (!newTitle.trim()) { showAlert('Title required'); return; }
    setSaving(true);
    try {
      createTask({ title: newTitle.trim(), description: newDesc.trim() || undefined, priority: newPriority, dueDate: newDue || undefined });
      setNewTitle(''); setNewDesc(''); setNewPriority('medium'); setNewDue('');
      setShowAdd(false);
    } finally { setSaving(false); }
  };

  const handleDelete = (task: Task) => {
    showAlert('Delete Task', `Delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTask(task.id) }
    ]);
  };

  const TaskRow = ({ item }: { item: Task }) => {
    const due = item.dueDate ? fmt.dueDate(item.dueDate) : null;
    return (
      <Card style={{ marginBottom: 8 }} padding={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}>
          <TouchableOpacity onPress={() => item.status === 'done' ? updateTask(item.id, { status: 'todo' }) : completeTask(item.id)}>
            {item.status === 'done'
              ? <CheckCircle size={22} color={colors.success} fill={colors.success + '30'} />
              : <Circle size={22} color={colors.border} />}
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text, textDecorationLine: item.status === 'done' ? 'line-through' : 'none', opacity: item.status === 'done' ? 0.5 : 1 }} numberOfLines={1}>{item.title}</Text>
            {item.description ? <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }} numberOfLines={1}>{item.description}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, alignItems: 'center' }}>
              {due && <Text style={{ fontSize: 11, fontWeight: '500', color: due.color }}>{due.label}</Text>}
              <Badge variant={item.priority === 'critical' ? 'error' : item.priority === 'high' ? 'warning' : item.priority === 'medium' ? 'info' : 'success'} size="sm">{item.priority}</Badge>
              {item.canvasId && <Badge variant="primary" size="sm">Canvas</Badge>}
            </View>
          </View>
          <TouchableOpacity onPress={() => handleDelete(item)} style={{ padding: 6 }}>
            <Trash2 size={15} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  const CanvasRow = ({ item }: { item: CanvasAssignment }) => {
    const sub = submissionMap.get(item.id);
    const due = item.due_at ? fmt.dueDate(item.due_at) : null;
    const course = courseMap.get(item.course_id);
    const isSubmitted = sub && (sub.workflow_state === 'submitted' || sub.workflow_state === 'graded');
    const isGraded = sub?.workflow_state === 'graded';
    const isMissing = sub?.missing;

    return (
      <Card style={{ marginBottom: 8 }} padding={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}>
          <View style={{ marginRight: 12 }}>
            {isSubmitted
              ? <CheckCircle size={22} color={colors.success} fill={colors.success + '30'} />
              : <BookOpen size={22} color={colors.primary} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text, textDecorationLine: isSubmitted ? 'line-through' : 'none', opacity: isSubmitted ? 0.6 : 1 }} numberOfLines={1}>{item.name}</Text>
            <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>{course?.course_code} · {item.points_possible}pts</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
              {due && <Text style={{ fontSize: 11, fontWeight: '500', color: isMissing ? colors.error : due.color }}>{isMissing ? 'Missing' : due.label}</Text>}
              {isGraded && sub?.grade && <Badge variant="success" size="sm">Graded: {sub.grade}</Badge>}
              {isSubmitted && !isGraded && <Badge variant="success" size="sm">Submitted</Badge>}
              {!isSubmitted && !isMissing && <Badge variant="neutral" size="sm">Not submitted</Badge>}
              {isMissing && <Badge variant="error" size="sm">Missing</Badge>}
            </View>
          </View>
          {item.html_url && (
            <TouchableOpacity onPress={() => { if (Platform.OS === 'web') window.open(item.html_url, '_blank'); }} style={{ padding: 6 }}>
              <ExternalLink size={15} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </Card>
    );
  };

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'week', label: 'This Week' },
    { key: 'all', label: 'All' },
    { key: 'todo', label: 'Pending' },
    { key: 'done', label: 'Done' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 8 }}>
        <Text style={{ fontSize: 28, fontWeight: '800', color: colors.text }}>Tasks</Text>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>{tasks.filter(t => t.status !== 'done').length} pending</Text>
          <TouchableOpacity onPress={() => setShowAdd(true)} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Plus size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 4 }}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)}
            style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: filter === f.key ? colors.primary : colors.card, borderWidth: 0.5, borderColor: filter === f.key ? colors.primary : colors.border }}>
            <Text style={{ fontSize: 12, fontWeight: '500', color: filter === f.key ? '#fff' : colors.textSecondary }}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          <View style={{ padding: 16 }}>
            {/* Canvas assignments this week */}
            {filter === 'week' && canvasConnected && weekCanvasAssignments.length > 0 && (
              <>
                <View style={{ backgroundColor: colors.primary + '15', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>📚 Canvas — This Week ({weekCanvasAssignments.length})</Text>
                </View>
                {weekCanvasAssignments.map(a => <CanvasRow key={a.id} item={a} />)}
                {filteredTasks.length > 0 && (
                  <View style={{ backgroundColor: colors.success + '15', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 8, marginTop: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.success }}>✅ My Tasks — This Week ({filteredTasks.length})</Text>
                  </View>
                )}
              </>
            )}

            {/* Manual tasks */}
            {filteredTasks.map(item => <TaskRow key={item.id} item={item} />)}

            {filteredTasks.length === 0 && (filter !== 'week' || !canvasConnected || weekCanvasAssignments.length === 0) && (
              <EmptyState
                icon={<CheckCircle size={48} color={colors.textTertiary} />}
                title={filter === 'week' ? 'Nothing due this week' : 'No tasks'}
                message="Tap + to add a task"
                action={{ label: 'Add Task', onPress: () => setShowAdd(true) }}
              />
            )}
            <View style={{ height: 100 }} />
          </View>
        }
      />

      <TabBar />
      <TouchableOpacity onPress={() => setShowAdd(true)} style={{ position: 'absolute', bottom: 90, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 8 }}>
        <Plus size={24} color="#fff" />
      </TouchableOpacity>

      {/* Add Modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>New Task</Text>
              <TouchableOpacity onPress={() => setShowAdd(false)}><X size={22} color={colors.textSecondary} /></TouchableOpacity>
            </View>
            <TextInput style={{ borderWidth: 0.5, borderColor: colors.border, borderRadius: 10, padding: 12, fontSize: 15, color: colors.text, marginBottom: 12, backgroundColor: colors.bg }} placeholder="Task title *" placeholderTextColor={colors.textTertiary} value={newTitle} onChangeText={setNewTitle} autoFocus />
            <TextInput style={{ borderWidth: 0.5, borderColor: colors.border, borderRadius: 10, padding: 12, fontSize: 15, color: colors.text, marginBottom: 12, height: 72, backgroundColor: colors.bg }} placeholder="Description (optional)" placeholderTextColor={colors.textTertiary} value={newDesc} onChangeText={setNewDesc} multiline />
            <TextInput style={{ borderWidth: 0.5, borderColor: colors.border, borderRadius: 10, padding: 12, fontSize: 15, color: colors.text, marginBottom: 12, backgroundColor: colors.bg }} placeholder="Due date (YYYY-MM-DD)" placeholderTextColor={colors.textTertiary} value={newDue} onChangeText={setNewDue} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>Priority</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {(['low','medium','high','critical'] as Priority[]).map(p => (
                <TouchableOpacity key={p} onPress={() => setNewPriority(p)}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: priorityColor(p), backgroundColor: newPriority === p ? priorityColor(p) + '20' : 'transparent' }}>
                  <Flag size={12} color={priorityColor(p)} />
                  <Text style={{ fontSize: 12, color: priorityColor(p), fontWeight: '600' }}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Button variant="primary" onPress={handleAdd} loading={saving} fullWidth>Add Task</Button>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
