import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Calendar, RefreshCw, Copy } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { useColors } from '../../lib/theme';
import { useTasksStore } from '../../store/tasks';
import { useCanvasStore } from '../../store/canvas';
import { claude } from '../../lib/claude';
import { fmt, priorityColor } from '../../utils/helpers';

const HOUR_OPTIONS = [5, 10, 15, 20, 25, 30];

export default function PlannerScreen() {
  const router = useRouter();
  const colors = useColors();
  const { tasks } = useTasksStore();
  const { assignments } = useCanvasStore();

  const [hours,   setHours]   = useState(15);
  const [plan,    setPlan]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [copied,  setCopied]  = useState(false);

  // Pending tasks only, sorted by due date
  const pendingTasks = tasks
    .filter(t => t.status !== 'done')
    .sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    })
    .slice(0, 20);

  // Upcoming Canvas assignments (next 14 days) not already in tasks
  const now = new Date();
  const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const taskCanvasIds = new Set(tasks.map(t => t.canvasId).filter(Boolean));
  const upcomingCanvas = assignments
    .filter(a => a.due_at && new Date(a.due_at) > now && new Date(a.due_at) <= twoWeeks && !taskCanvasIds.has(String(a.id)))
    .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime())
    .slice(0, 10);

  const allItems = [
    ...pendingTasks.map(t => `${t.title}${t.dueDate ? ` (due ${new Date(t.dueDate).toLocaleDateString()})` : ''}${t.priority === 'critical' || t.priority === 'high' ? ' [HIGH PRIORITY]' : ''}`),
    ...upcomingCanvas.map(a => `${a.name} (due ${new Date(a.due_at!).toLocaleDateString()}) [Canvas]`),
  ];

  async function generate() {
    if (allItems.length === 0) {
      setError('No pending tasks found. Add some tasks first.');
      return;
    }
    setError('');
    setLoading(true);
    setPlan('');
    try {
      const result = await claude.weeklyPlanner(allItems, hours);
      setPlan(result);
    } catch (e: any) {
      setError(e.message || 'Failed to generate plan.');
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    await Clipboard.setStringAsync(plan);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Calendar size={18} color="#7c3aed" />
          <Text style={[styles.headerText, { color: colors.text }]}>Weekly Planner</Text>
        </View>
        {plan ? (
          <TouchableOpacity onPress={() => { setPlan(''); setError(''); }} activeOpacity={0.7}>
            <RefreshCw size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        ) : <View style={{ width: 20 }} />}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Available hours selector */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>AVAILABLE HOURS THIS WEEK</Text>
        <View style={styles.hourPills}>
          {HOUR_OPTIONS.map(h => {
            const active = h === hours;
            return (
              <TouchableOpacity
                key={h}
                onPress={() => setHours(h)}
                activeOpacity={0.75}
                style={[
                  styles.hourPill,
                  { borderColor: active ? '#7c3aed' : colors.border, backgroundColor: active ? '#7c3aed18' : colors.card },
                ]}
              >
                <Text style={[styles.hourPillText, { color: active ? '#7c3aed' : colors.textTertiary }]}>{h}h</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Task list preview */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary, marginTop: 20 }]}>
          TASKS TO SCHEDULE ({allItems.length})
        </Text>
        {allItems.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
              No pending tasks. Add tasks or import from Canvas first.
            </Text>
          </View>
        ) : (
          <View style={[styles.taskList, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {pendingTasks.slice(0, 8).map(task => {
              const due = task.dueDate ? fmt.dueDate(task.dueDate) : null;
              const pc = priorityColor(task.priority);
              return (
                <View key={task.id} style={[styles.taskRow, { borderBottomColor: colors.border }]}>
                  <View style={[styles.priorityDot, { backgroundColor: pc }]} />
                  <Text style={[styles.taskTitle, { color: colors.text }]} numberOfLines={1}>{task.title}</Text>
                  {due && <Text style={[styles.taskDue, { color: due.color }]}>{due.label}</Text>}
                </View>
              );
            })}
            {(upcomingCanvas.length > 0 || pendingTasks.length > 8) && (
              <Text style={[styles.moreText, { color: colors.textTertiary }]}>
                +{(pendingTasks.length > 8 ? pendingTasks.length - 8 : 0) + upcomingCanvas.length} more from Canvas
              </Text>
            )}
          </View>
        )}

        {error ? <Text style={[styles.errorText, { color: '#ef4444' }]}>{error}</Text> : null}

        {/* Generate button */}
        <TouchableOpacity
          onPress={generate}
          activeOpacity={0.85}
          disabled={loading || allItems.length === 0}
          style={[styles.generateBtn, { backgroundColor: '#7c3aed', opacity: (loading || allItems.length === 0) ? 0.6 : 1 }]}
        >
          {loading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.generateBtnText}>Generate Weekly Plan</Text>}
        </TouchableOpacity>

        {/* Plan output */}
        {plan ? (
          <View style={[styles.planBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.planHeader}>
              <Text style={[styles.sectionLabel, { color: colors.textTertiary, marginBottom: 0 }]}>YOUR PLAN</Text>
              <TouchableOpacity onPress={copy} activeOpacity={0.7} style={[styles.copyBtn, { borderColor: colors.border }]}>
                <Copy size={14} color={copied ? '#10b981' : colors.textTertiary} />
                <Text style={[styles.copyText, { color: copied ? '#10b981' : colors.textTertiary }]}>
                  {copied ? 'Copied!' : 'Copy'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.planText, { color: colors.text }]}>{plan}</Text>
          </View>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5,
  },
  backBtn:     { padding: 2 },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerText:  { fontSize: 17, fontWeight: '700' },

  scroll: { padding: 16, paddingTop: 20 },

  sectionLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, marginBottom: 10 },

  hourPills:    { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  hourPill:     { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  hourPillText: { fontSize: 14, fontWeight: '600' },

  emptyBox:   { borderWidth: 1, borderRadius: 12, padding: 16 },
  emptyText:  { fontSize: 14, textAlign: 'center' },

  taskList:    { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  taskRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 0.5, gap: 10 },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  taskTitle:   { flex: 1, fontSize: 14, fontWeight: '500' },
  taskDue:     { fontSize: 12, fontWeight: '500' },
  moreText:    { fontSize: 12, padding: 12, textAlign: 'center' },

  errorText: { fontSize: 13, marginTop: 10 },

  generateBtn:     { marginTop: 16, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  generateBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  planBox:    { marginTop: 20, borderWidth: 1, borderRadius: 12, padding: 16 },
  planHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  copyBtn:    { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  copyText:   { fontSize: 13, fontWeight: '500' },
  planText:   { fontSize: 14, lineHeight: 22 },
});
