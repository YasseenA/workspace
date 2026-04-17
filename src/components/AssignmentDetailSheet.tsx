import React from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  ScrollView, Platform, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  X, ExternalLink, Clock, BookOpen, CheckSquare,
  Award, AlertCircle, CheckCircle2, Circle, Timer, FileText,
} from 'lucide-react-native';
import { useColors } from '../lib/theme';
import { useFocusStore } from '../store/focus';
import { useCanvasStore } from '../store/canvas';
import { CanvasAssignment, CanvasCourse, CanvasSubmission } from '../lib/canvas';
import { TeamsAssignment } from '../lib/teams';
import { Task } from '../store/tasks';

// ── Types ────────────────────────────────────────────────────────────────────

export type SheetItem =
  | { kind: 'canvas';    data: CanvasAssignment; course?: CanvasCourse; submission?: CanvasSubmission }
  | { kind: 'teams';     data: TeamsAssignment }
  | { kind: 'task';      data: Task };

interface Props {
  item: SheetItem | null;
  onClose: () => void;
  onCompleteTask?: (id: string) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return 'No due date';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })
       + ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function daysUntil(iso: string | null | undefined): { label: string; urgent: boolean } | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (days < 0)  return { label: 'Overdue', urgent: true };
  if (days === 0) return { label: 'Due today', urgent: true };
  if (days === 1) return { label: 'Due tomorrow', urgent: true };
  return { label: `${days} days left`, urgent: days <= 3 };
}

function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// ── Sub-renderers ─────────────────────────────────────────────────────────────

function CanvasDetail({ data, course, submission, colors, onClose }: {
  data: CanvasAssignment; course?: CanvasCourse;
  submission?: CanvasSubmission; colors: any; onClose: () => void;
}) {
  const router    = useRouter();
  const { token } = useCanvasStore();
  const due       = daysUntil(data.due_at);
  const desc      = stripHtml(data.description);
  const types     = data.submission_types?.filter(t => t !== 'none') ?? [];

  const subState  = submission?.workflow_state;
  const isMissing = submission?.missing;
  const subColor =
    subState === 'graded'    ? '#10b981' :
    subState === 'submitted' ? '#3b82f6' :
    isMissing                ? '#ef4444' : colors.textTertiary;

  const subLabel =
    subState === 'graded'    ? `Graded · ${submission?.grade ?? '—'}` :
    subState === 'submitted' ? 'Submitted' :
    isMissing                ? 'Missing' : 'Not submitted';

  const canSubmit = !!token && subState !== 'submitted' && subState !== 'graded';
  const hasSubmitTypes = types.some(t => ['online_text_entry', 'online_url', 'online_upload'].includes(t));

  const goToFullPage = () => {
    onClose();
    router.push(`/canvas/assignment/${data.id}`);
  };

  return (
    <>
      {/* Course badge */}
      {course && (
        <View style={[styles.badge, { backgroundColor: '#10b98118' }]}>
          <BookOpen size={12} color="#10b981" />
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#10b981' }}>
            {course.course_code || course.name}
          </Text>
        </View>
      )}

      {/* Due date row */}
      <View style={styles.metaRow}>
        <Clock size={14} color={due?.urgent ? '#f59e0b' : colors.textTertiary} />
        <Text style={[styles.metaText, { color: due?.urgent ? '#f59e0b' : colors.textSecondary }]}>
          {fmtDate(data.due_at)}
        </Text>
        {due && (
          <View style={[styles.urgencyPill, { backgroundColor: due.urgent ? '#f59e0b18' : colors.primaryLight }]}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: due.urgent ? '#f59e0b' : colors.primary }}>
              {due.label}
            </Text>
          </View>
        )}
      </View>

      {/* Points + submission status */}
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {data.points_possible > 0 && (
          <View style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Award size={12} color={colors.primary} />
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>{data.points_possible} pts</Text>
          </View>
        )}
        {types.length > 0 && (
          <View style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
              {types.map(t => t.replace(/_/g, ' ')).join(', ')}
            </Text>
          </View>
        )}
        {submission && (
          <View style={[styles.chip, { backgroundColor: subColor + '18', borderColor: subColor + '40' }]}>
            {(subState === 'submitted' || subState === 'graded')
              ? <CheckCircle2 size={12} color={subColor} />
              : <AlertCircle size={12} color={subColor} />
            }
            <Text style={{ fontSize: 12, fontWeight: '600', color: subColor }}>{subLabel}</Text>
          </View>
        )}
      </View>

      {/* Description preview */}
      {desc.length > 0 && (
        <View style={[styles.descBox, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 20 }} numberOfLines={4}>
            {desc}
          </Text>
        </View>
      )}

      {/* Submit Assignment — full page */}
      {hasSubmitTypes && (
        <TouchableOpacity
          style={[styles.openBtn, { backgroundColor: canSubmit ? colors.primary : colors.card, borderWidth: canSubmit ? 0 : 0.5, borderColor: colors.border }]}
          onPress={goToFullPage}
          activeOpacity={0.85}
        >
          <FileText size={15} color={canSubmit ? '#fff' : colors.textSecondary} />
          <Text style={[styles.openBtnText, { color: canSubmit ? '#fff' : colors.textSecondary }]}>
            {canSubmit ? 'Submit Assignment' : 'View Submission'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Open in Canvas */}
      {data.html_url ? (
        <TouchableOpacity
          style={[styles.openBtn, { backgroundColor: hasSubmitTypes ? colors.card : '#10b981', borderWidth: hasSubmitTypes ? 0.5 : 0, borderColor: colors.border, marginTop: hasSubmitTypes ? 8 : 4 }]}
          onPress={() => Linking.openURL(data.html_url)}
          activeOpacity={0.85}
        >
          <ExternalLink size={15} color={hasSubmitTypes ? colors.textSecondary : '#fff'} />
          <Text style={[styles.openBtnText, { color: hasSubmitTypes ? colors.textSecondary : '#fff' }]}>Open in Canvas</Text>
        </TouchableOpacity>
      ) : null}
    </>
  );
}

function TeamsDetail({ data, colors }: { data: TeamsAssignment; colors: any }) {
  const due = daysUntil(data.dueDateTime);

  return (
    <>
      <View style={[styles.badge, { backgroundColor: '#5865f218' }]}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#5865f2' }}>
          {data.className}
        </Text>
      </View>

      <View style={styles.metaRow}>
        <Clock size={14} color={due?.urgent ? '#f59e0b' : colors.textTertiary} />
        <Text style={[styles.metaText, { color: due?.urgent ? '#f59e0b' : colors.textSecondary }]}>
          {fmtDate(data.dueDateTime)}
        </Text>
        {due && (
          <View style={[styles.urgencyPill, { backgroundColor: due.urgent ? '#f59e0b18' : colors.primaryLight }]}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: due.urgent ? '#f59e0b' : colors.primary }}>
              {due.label}
            </Text>
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        {data.points != null && data.points > 0 && (
          <View style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Award size={12} color={colors.primary} />
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>{data.points} pts</Text>
          </View>
        )}
        <View style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
            {data.status === 'assigned' ? 'Assigned' : data.status}
          </Text>
        </View>
      </View>

      {data.webUrl ? (
        <TouchableOpacity
          style={[styles.openBtn, { backgroundColor: '#5865f2' }]}
          onPress={() => Linking.openURL(data.webUrl)}
          activeOpacity={0.85}
        >
          <ExternalLink size={15} color="#fff" />
          <Text style={styles.openBtnText}>Open in Teams</Text>
        </TouchableOpacity>
      ) : null}
    </>
  );
}

const PRIORITY_COLOR: Record<string, string> = {
  low: '#9595b0', medium: '#3b82f6', high: '#f59e0b', critical: '#ef4444',
};
const STATUS_LABEL: Record<string, string> = {
  todo: 'To Do', in_progress: 'In Progress', done: 'Done',
};

function TaskDetail({ data, onComplete, onFocusTask, colors }: { data: Task; onComplete?: () => void; onFocusTask?: () => void; colors: any }) {
  const due   = daysUntil(data.dueDate);
  const isDone = data.status === 'done';
  const pc    = PRIORITY_COLOR[data.priority] || colors.textTertiary;

  return (
    <>
      {/* Status + priority */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <View style={[styles.chip, { backgroundColor: isDone ? '#10b98118' : colors.primaryLight, borderColor: isDone ? '#10b98140' : colors.primary + '40' }]}>
          {isDone
            ? <CheckCircle2 size={12} color="#10b981" />
            : <Circle size={12} color={colors.primary} />
          }
          <Text style={{ fontSize: 12, fontWeight: '600', color: isDone ? '#10b981' : colors.primary }}>
            {STATUS_LABEL[data.status] || data.status}
          </Text>
        </View>
        <View style={[styles.chip, { backgroundColor: pc + '18', borderColor: pc + '40' }]}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: pc, textTransform: 'capitalize' }}>
            {data.priority}
          </Text>
        </View>
      </View>

      {/* Due date */}
      {data.dueDate && (
        <View style={[styles.metaRow, { marginBottom: 12 }]}>
          <Clock size={14} color={due?.urgent ? '#f59e0b' : colors.textTertiary} />
          <Text style={[styles.metaText, { color: due?.urgent ? '#f59e0b' : colors.textSecondary }]}>
            {fmtDate(data.dueDate)}
          </Text>
          {due && (
            <View style={[styles.urgencyPill, { backgroundColor: due.urgent ? '#f59e0b18' : colors.primaryLight }]}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: due.urgent ? '#f59e0b' : colors.primary }}>
                {due.label}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Description */}
      {data.description ? (
        <View style={[styles.descBox, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 20 }}>
            {data.description}
          </Text>
        </View>
      ) : null}

      {/* Tags */}
      {data.tags.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {data.tags.map(tag => (
            <View key={tag} style={[styles.chip, { backgroundColor: colors.bg, borderColor: colors.border }]}>
              <Text style={{ fontSize: 11, color: colors.textTertiary }}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Action buttons */}
      {!isDone && (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {onFocusTask && (
            <TouchableOpacity
              style={[styles.openBtn, { flex: 1, backgroundColor: colors.primary }]}
              onPress={onFocusTask}
              activeOpacity={0.85}
            >
              <Timer size={15} color="#fff" />
              <Text style={styles.openBtnText}>Focus</Text>
            </TouchableOpacity>
          )}
          {onComplete && (
            <TouchableOpacity
              style={[styles.openBtn, { flex: 1, backgroundColor: '#10b981' }]}
              onPress={onComplete}
              activeOpacity={0.85}
            >
              <CheckSquare size={15} color="#fff" />
              <Text style={styles.openBtnText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </>
  );
}

// ── Main Sheet ────────────────────────────────────────────────────────────────

const KIND_COLOR: Record<string, string> = {
  canvas: '#10b981', teams: '#5865f2', task: '#f59e0b',
};
const KIND_LABEL: Record<string, string> = {
  canvas: 'CANVAS', teams: 'TEAMS', task: 'TASK',
};

export default function AssignmentDetailSheet({ item, onClose, onCompleteTask }: Props) {
  const router = useRouter();
  const colors = useColors();
  const { setFocusTask } = useFocusStore();

  if (!item) return null;

  const accent = KIND_COLOR[item.kind];
  const title =
    item.kind === 'canvas' ? item.data.name :
    item.kind === 'teams'  ? item.data.displayName :
    item.data.title;

  const overlay = Platform.OS === 'web'
    ? ({ position: 'fixed', inset: 0, zIndex: 999 } as any)
    : { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 };

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={[overlay, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
      />

      {/* Sheet */}
      <View
        style={[
          styles.sheet,
          { backgroundColor: colors.card, borderColor: colors.border },
          Platform.OS === 'web' ? ({ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000 } as any) : {},
        ]}
      >
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.kindBadge, { backgroundColor: accent + '18' }]}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: accent, letterSpacing: 0.5 }}>
              {KIND_LABEL[item.kind]}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={3}>
          {title}
        </Text>

        {/* Color divider */}
        <View style={[styles.divider, { backgroundColor: accent }]} />

        <ScrollView
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {item.kind === 'canvas' && (
            <CanvasDetail
              data={item.data}
              course={item.course}
              submission={item.submission}
              colors={colors}
              onClose={onClose}
            />
          )}
          {item.kind === 'teams' && (
            <TeamsDetail data={item.data} colors={colors} />
          )}
          {item.kind === 'task' && (
            <TaskDetail
              data={item.data}
              colors={colors}
              onComplete={onCompleteTask ? () => onCompleteTask(item.data.id) : undefined}
              onFocusTask={item.data.status !== 'done' ? () => {
                setFocusTask(item.data.id, item.data.title);
                onClose();
                router.push('/focus');
              } : undefined}
            />
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 0.5, borderBottomWidth: 0,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 0,
    maxHeight: '80%',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 16,
  },
  handle: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  kindBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  title: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4, marginBottom: 12, lineHeight: 26 },
  divider: { height: 3, borderRadius: 2, marginBottom: 16 },

  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, marginBottom: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  metaText: { fontSize: 13, flex: 1 },
  urgencyPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, borderWidth: 0.5 },
  descBox: { borderRadius: 12, borderWidth: 0.5, padding: 12, marginBottom: 14 },
  openBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 14, marginTop: 4 },
  openBtnText: { fontSize: 15, fontWeight: '700' },
});
