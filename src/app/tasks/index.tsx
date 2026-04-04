import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, TextInput, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, CheckCircle, Circle, Trash2, Flag, Clock, X, ChevronDown } from 'lucide-react-native';
import { useTasksStore, Priority, Task } from '../../store/tasks';
import { Card, Badge, EmptyState, Button } from '../../components/ui';
import TabBar from '../../components/layout/TabBar';
import { colors } from '../../lib/theme';
import { fmt, priorityColor } from '../../utils/helpers';

type Filter = 'all' | 'todo' | 'in_progress' | 'done';

export default function TasksScreen() {
  const { tasks, createTask, completeTask, deleteTask, updateTask } = useTasksStore();
  const [filter, setFilter] = useState<Filter>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [newDue, setNewDue] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    if (filter === 'all') return tasks;
    return tasks.filter(t => t.status === filter);
  }, [tasks, filter]);

  const grouped = useMemo(() => {
    const overdue = filtered.filter(t => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < new Date());
    const today = filtered.filter(t => t.status !== 'done' && t.dueDate && new Date(t.dueDate).toDateString() === new Date().toDateString());
    const upcoming = filtered.filter(t => t.status !== 'done' && (!t.dueDate || new Date(t.dueDate) > new Date()) && !today.includes(t));
    const done = filtered.filter(t => t.status === 'done');
    return { overdue, today, upcoming, done };
  }, [filtered]);

  const handleAdd = async () => {
    if (!newTitle.trim()) { Alert.alert('Title required'); return; }
    setSaving(true);
    try {
      createTask({ title: newTitle.trim(), description: newDesc.trim() || undefined, priority: newPriority, dueDate: newDue || undefined });
      setNewTitle(''); setNewDesc(''); setNewPriority('medium'); setNewDue('');
      setShowAdd(false);
    } finally { setSaving(false); }
  };

  const handleDelete = (task: Task) => {
    Alert.alert('Delete Task', `Delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTask(task.id) }
    ]);
  };

  const TaskRow = ({ item }: { item: Task }) => {
    const due = item.dueDate ? fmt.dueDate(item.dueDate) : null;
    return (
      <Card style={styles.taskCard} padding={false}>
        <View style={styles.taskRow}>
          <TouchableOpacity onPress={() => item.status === 'done' ? updateTask(item.id, { status: 'todo' }) : completeTask(item.id)}>
            {item.status === 'done' ? <CheckCircle size={22} color={colors.success} fill={colors.success + '30'} /> : <Circle size={22} color={colors.border} />}
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.taskTitle, item.status === 'done' && styles.done]} numberOfLines={1}>{item.title}</Text>
            {item.description && <Text style={styles.taskDesc} numberOfLines={1}>{item.description}</Text>}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, alignItems: 'center' }}>
              {due && <Text style={[styles.dueText, { color: due.color }]}>{due.label}</Text>}
              <Badge variant={item.priority === 'critical' ? 'error' : item.priority === 'high' ? 'warning' : item.priority === 'medium' ? 'info' : 'success'} size="sm">
                {item.priority}
              </Badge>
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

  const Section = ({ title, items, color }: { title: string; items: Task[]; color: string }) => {
    if (!items.length) return null;
    return (
      <View style={{ marginBottom: 16 }}>
        <View style={[styles.sectionHeader, { backgroundColor: color + '15' }]}>
          <Text style={[styles.sectionTitle, { color }]}>{title} ({items.length})</Text>
        </View>
        {items.map(item => <TaskRow key={item.id} item={item} />)}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Tasks</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Text style={styles.count}>{tasks.filter(t => t.status !== 'done').length} pending</Text>
          <TouchableOpacity onPress={() => setShowAdd(true)} style={styles.addBtn}>
            <Plus size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter tabs */}
      <View style={styles.filters}>
        {(['all','todo','in_progress','done'] as Filter[]).map(f => (
          <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[styles.filterTab, filter === f && styles.filterTabActive]}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          <View style={{ padding: 16 }}>
            <Section title="⚠️ Overdue" items={grouped.overdue} color={colors.error} />
            <Section title="📅 Due Today" items={grouped.today} color={colors.warning} />
            <Section title="📋 Upcoming" items={grouped.upcoming} color={colors.primary} />
            <Section title="✅ Completed" items={grouped.done} color={colors.success} />
            {filtered.length === 0 && (
              <EmptyState icon={<CheckCircle size={48} color={colors.textTertiary} />} title="No tasks" message="Tap + to add a task" action={{ label: 'Add Task', onPress: () => setShowAdd(true) }} />
            )}
            <View style={{ height: 100 }} />
          </View>
        }
      />

      <TabBar />
      <TouchableOpacity onPress={() => setShowAdd(true)} style={styles.fab}>
        <Plus size={24} color="#fff" />
      </TouchableOpacity>

      {/* Add Modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Task</Text>
              <TouchableOpacity onPress={() => setShowAdd(false)}><X size={22} color={colors.textSecondary} /></TouchableOpacity>
            </View>

            <TextInput style={styles.modalInput} placeholder="Task title *" placeholderTextColor={colors.textTertiary} value={newTitle} onChangeText={setNewTitle} autoFocus />
            <TextInput style={[styles.modalInput, { height: 72 }]} placeholder="Description (optional)" placeholderTextColor={colors.textTertiary} value={newDesc} onChangeText={setNewDesc} multiline />
            <TextInput style={styles.modalInput} placeholder="Due date (YYYY-MM-DD, optional)" placeholderTextColor={colors.textTertiary} value={newDue} onChangeText={setNewDue} />

            <Text style={styles.priorityLabel}>Priority</Text>
            <View style={styles.priorities}>
              {(['low','medium','high','critical'] as Priority[]).map(p => (
                <TouchableOpacity key={p} onPress={() => setNewPriority(p)}
                  style={[styles.priorityBtn, { borderColor: priorityColor(p), backgroundColor: newPriority === p ? priorityColor(p) + '20' : 'transparent' }]}>
                  <Flag size={12} color={priorityColor(p)} />
                  <Text style={[styles.priorityText, { color: priorityColor(p) }]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button variant="primary" onPress={handleAdd} loading={saving} fullWidth style={{ marginTop: 16 }}>Add Task</Button>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  count: { fontSize: 13, color: colors.textSecondary, alignSelf: 'center' },
  addBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  filters: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 4 },
  filterTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#fff', borderWidth: 0.5, borderColor: colors.border },
  filterTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 12, fontWeight: '500', color: colors.textSecondary },
  filterTextActive: { color: '#fff' },
  sectionHeader: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700' },
  taskCard: { marginBottom: 8 },
  taskRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  taskTitle: { fontSize: 14, fontWeight: '500', color: colors.text },
  done: { textDecorationLine: 'line-through', opacity: 0.5 },
  taskDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  dueText: { fontSize: 11, fontWeight: '500' },
  fab: { position: 'absolute', bottom: 90, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 8 },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  modalInput: { borderWidth: 0.5, borderColor: colors.border, borderRadius: 10, padding: 12, fontSize: 15, color: colors.text, marginBottom: 12 },
  priorityLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 },
  priorities: { flexDirection: 'row', gap: 8 },
  priorityBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 8, borderRadius: 8, borderWidth: 1 },
  priorityText: { fontSize: 12, fontWeight: '600' },
});
