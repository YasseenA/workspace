import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Platform, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft, Plus, Trash2, TrendingUp,
  BookOpen, ChevronDown, X, Zap, CheckCircle, GraduationCap,
} from 'lucide-react-native';
import { useCanvasStore } from '../../store/canvas';
import { Card, Button } from '../../components/ui';
import { useColors } from '../../lib/theme';

interface ManualAssignment { name: string; grade: string; weight: string; }
interface ManualGPACourse  { name: string; grade: string; credits: string; }

function gpaPoints(pct: number) {
  if (pct >= 93) return 4.0;
  if (pct >= 90) return 3.7;
  if (pct >= 87) return 3.3;
  if (pct >= 83) return 3.0;
  if (pct >= 80) return 2.7;
  if (pct >= 77) return 2.3;
  if (pct >= 73) return 2.0;
  if (pct >= 70) return 1.7;
  if (pct >= 67) return 1.3;
  if (pct >= 63) return 1.0;
  if (pct >= 60) return 0.7;
  return 0.0;
}

function gpaColor(gpa: number, success: string, primary: string, warning: string, error: string) {
  if (gpa >= 3.5) return success;
  if (gpa >= 3.0) return primary;
  if (gpa >= 2.0) return warning;
  return error;
}

const DEFAULT_GPA_COURSES: ManualGPACourse[] = [
  { name: 'Course 1', grade: '88', credits: '5' },
  { name: 'Course 2', grade: '92', credits: '4' },
  { name: 'Course 3', grade: '76', credits: '3' },
];

const DEFAULT_MANUAL: ManualAssignment[] = [
  { name: 'Midterm', grade: '85', weight: '30' },
  { name: 'Final',   grade: '90', weight: '40' },
  { name: 'Homework',grade: '95', weight: '30' },
];

const stripHtml = (s: string) =>
  s.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

function letterFor(pct: number) {
  if (pct >= 90) return 'A';
  if (pct >= 80) return 'B';
  if (pct >= 70) return 'C';
  if (pct >= 60) return 'D';
  return 'F';
}

export default function GradeCalculator() {
  const router = useRouter();
  const colors = useColors();
  const { courses, assignments, submissions, connected } = useCanvasStore();

  const [mode,           setMode]           = useState<'canvas' | 'manual' | 'gpa'>(connected ? 'canvas' : 'manual');
  const [selectedId,     setSelectedId]     = useState<number | null>(courses[0]?.id ?? null);
  const [showPicker,     setShowPicker]     = useState(false);
  const [whatIf,         setWhatIf]         = useState<Record<number, string>>({});
  const [manualRows,     setManualRows]     = useState<ManualAssignment[]>(DEFAULT_MANUAL);
  const [gpaCourses,     setGpaCourses]     = useState<ManualGPACourse[]>(DEFAULT_GPA_COURSES);

  const submissionMap = useMemo(() => {
    const m = new Map<number, typeof submissions[0]>();
    submissions.forEach(s => m.set(s.assignment_id, s));
    return m;
  }, [submissions]);

  const selectedCourse = courses.find(c => c.id === selectedId);

  const courseAssignments = useMemo(() =>
    assignments
      .filter(a => a.course_id === selectedId && (a.points_possible ?? 0) > 0)
      .sort((a, b) => {
        if (a.due_at && b.due_at) return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
        return 0;
      }),
    [assignments, selectedId],
  );

  // Current grade: only graded submissions
  const { currentPct, projectedPct, gradedCount, totalCount } = useMemo(() => {
    let earnedGraded = 0, possibleGraded = 0;
    let earnedProjected = 0, possibleProjected = 0;
    let graded = 0;

    for (const a of courseAssignments) {
      const sub = submissionMap.get(a.id);
      const pts = a.points_possible ?? 0;
      if (pts <= 0) continue;

      if (sub?.score != null && sub.workflow_state === 'graded') {
        earnedGraded     += sub.score;
        possibleGraded   += pts;
        earnedProjected  += sub.score;
        possibleProjected += pts;
        graded++;
      } else if (whatIf[a.id] !== undefined) {
        const h = parseFloat(whatIf[a.id]) || 0;
        earnedProjected  += Math.min(h, pts);
        possibleProjected += pts;
      }
    }

    return {
      currentPct:   possibleGraded   > 0 ? (earnedGraded   / possibleGraded)   * 100 : 0,
      projectedPct: possibleProjected > 0 ? (earnedProjected / possibleProjected) * 100 : 0,
      gradedCount:  graded,
      totalCount:   courseAssignments.length,
    };
  }, [courseAssignments, submissionMap, whatIf]);

  // Manual mode
  const manualTotal   = manualRows.reduce((s, a) => s + (parseFloat(a.weight) || 0), 0);
  const manualWeighted= manualRows.reduce((s, a) => s + (parseFloat(a.grade) || 0) * (parseFloat(a.weight) || 0) / 100, 0);
  const manualGrade   = manualTotal > 0 ? (manualWeighted / manualTotal) * 100 : 0;

  const displayPct  = mode === 'canvas' ? (gradedCount > 0 ? currentPct : 0) : manualGrade;
  const gradeColor  = displayPct >= 90 ? colors.success : displayPct >= 80 ? colors.primary : displayPct >= 70 ? colors.warning : colors.error;
  const hasWhatIf   = Object.keys(whatIf).length > 0;

  // GPA mode — Canvas courses
  const canvasGpaRows = useMemo(() => {
    return courses.map(c => {
      const enroll = c.enrollments?.[0];
      const score  = enroll?.computed_current_score;
      return { id: c.id, name: c.name, code: c.course_code, score: score ?? null };
    });
  }, [courses]);

  const canvasGpa = useMemo(() => {
    const rows = canvasGpaRows.filter(r => r.score != null);
    if (rows.length === 0) return null;
    const total = rows.reduce((s, r) => s + gpaPoints(r.score!), 0);
    return total / rows.length;
  }, [canvasGpaRows]);

  // GPA mode — manual
  const { manualGpaVal, manualGpaTotal } = useMemo(() => {
    let weighted = 0, credits = 0;
    for (const c of gpaCourses) {
      const g = parseFloat(c.grade);
      const cr = parseFloat(c.credits);
      if (!isNaN(g) && !isNaN(cr) && cr > 0) {
        weighted += gpaPoints(g) * cr;
        credits  += cr;
      }
    }
    return { manualGpaVal: credits > 0 ? weighted / credits : 0, manualGpaTotal: credits };
  }, [gpaCourses]);

  const addGpaCourse    = () => setGpaCourses([...gpaCourses, { name: '', grade: '', credits: '' }]);
  const removeGpaCourse = (i: number) => setGpaCourses(gpaCourses.filter((_, idx) => idx !== i));
  const updateGpaCourse = (i: number, f: keyof ManualGPACourse, v: string) => {
    const a = [...gpaCourses]; a[i] = { ...a[i], [f]: v }; setGpaCourses(a);
  };

  const addManual   = () => setManualRows([...manualRows, { name: '', grade: '', weight: '' }]);
  const removeManual= (i: number) => setManualRows(manualRows.filter((_, idx) => idx !== i));
  const updateManual= (i: number, f: keyof ManualAssignment, v: string) => {
    const a = [...manualRows]; a[i] = { ...a[i], [f]: v }; setManualRows(a);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>

      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
        >
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Grade Calculator</Text>
          <Text style={{ fontSize: 12, color: colors.textTertiary }}>
            {mode === 'canvas' ? 'From Canvas data' : 'Weighted average'}
          </Text>
        </View>
        <TrendingUp size={20} color={colors.primary} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

        {/* ── Mode toggle ── */}
        <View style={[styles.modeRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {([
            { key: 'canvas', label: 'Canvas',   icon: <BookOpen      size={13} /> },
            { key: 'manual', label: 'Manual',   icon: <TrendingUp    size={13} /> },
            { key: 'gpa',    label: 'GPA',      icon: <GraduationCap size={13} /> },
          ] as const).map(m => (
            <TouchableOpacity
              key={m.key}
              onPress={() => setMode(m.key)}
              style={[styles.modeBtn, mode === m.key && { backgroundColor: colors.primary }]}
            >
              {React.cloneElement(m.icon, { color: mode === m.key ? '#fff' : colors.textSecondary })}
              <Text style={{ fontSize: 13, fontWeight: '600', color: mode === m.key ? '#fff' : colors.textSecondary }}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Canvas mode ── */}
        {mode === 'canvas' && (
          <>
            {!connected ? (
              <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <BookOpen size={32} color={colors.textTertiary} />
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 12 }}>Canvas not connected</Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4, textAlign: 'center' }}>
                  Connect Canvas in Settings → Integrations to see real grades
                </Text>
              </View>
            ) : (
              <>
                {/* Course picker */}
                <TouchableOpacity
                  onPress={() => setShowPicker(true)}
                  style={[styles.coursePicker, { backgroundColor: colors.card, borderColor: colors.primary }]}
                >
                  <BookOpen size={16} color={colors.primary} />
                  <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: colors.text }}>
                    {selectedCourse?.name ?? 'Select a course'}
                  </Text>
                  <View style={[styles.courseCode, { backgroundColor: colors.primaryLight }]}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>
                      {selectedCourse?.course_code ?? '—'}
                    </Text>
                  </View>
                  <ChevronDown size={16} color={colors.textTertiary} />
                </TouchableOpacity>

                {/* Grade summary card */}
                {selectedCourse && (
                  <>
                    <View style={[styles.gradeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      {/* Current grade */}
                      <View style={{ alignItems: 'center', flex: 1 }}>
                        <Text style={{ fontSize: 42, fontWeight: '800', color: gradeColor, letterSpacing: -1 }}>
                          {gradedCount > 0 ? `${Math.round(currentPct * 10) / 10}%` : '—'}
                        </Text>
                        <Text style={{ fontSize: 28, fontWeight: '800', color: gradeColor + 'aa' }}>
                          {gradedCount > 0 ? letterFor(currentPct) : '—'}
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2 }}>Current Grade</Text>
                        <Text style={{ fontSize: 11, color: colors.textTertiary }}>
                          {gradedCount}/{totalCount} graded
                        </Text>
                      </View>

                      {hasWhatIf && (
                        <>
                          <View style={[styles.divider, { backgroundColor: colors.border }]} />
                          <View style={{ alignItems: 'center', flex: 1 }}>
                            <Text style={{ fontSize: 42, fontWeight: '800', color: colors.primary, letterSpacing: -1 }}>
                              {`${Math.round(projectedPct * 10) / 10}%`}
                            </Text>
                            <Text style={{ fontSize: 28, fontWeight: '800', color: colors.primary + 'aa' }}>
                              {letterFor(projectedPct)}
                            </Text>
                            <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2 }}>Projected</Text>
                            <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '600' }}>with what-ifs</Text>
                          </View>
                        </>
                      )}
                    </View>

                    {/* Progress bar */}
                    <View style={{ marginBottom: 16 }}>
                      <View style={{ height: 7, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' }}>
                        <View style={{ height: 7, borderRadius: 4, backgroundColor: gradeColor, width: `${Math.min(gradedCount > 0 ? currentPct : 0, 100)}%` as any }} />
                      </View>
                      {hasWhatIf && (
                        <View style={{ height: 4, borderRadius: 4, backgroundColor: colors.primaryLight, overflow: 'hidden', marginTop: 3 }}>
                          <View style={{ height: 4, borderRadius: 4, backgroundColor: colors.primary + '60', width: `${Math.min(projectedPct, 100)}%` as any }} />
                        </View>
                      )}
                    </View>

                    {/* What-if hint */}
                    {!hasWhatIf && courseAssignments.some(a => !submissionMap.get(a.id)?.score) && (
                      <View style={[styles.hintBox, { backgroundColor: colors.primaryLight, borderColor: colors.primary + '30' }]}>
                        <Zap size={13} color={colors.primary} />
                        <Text style={{ fontSize: 12, color: colors.primary, flex: 1 }}>
                          Tap <Text style={{ fontWeight: '700' }}>What If?</Text> on ungraded assignments to project your grade
                        </Text>
                      </View>
                    )}

                    {/* Clear what-if */}
                    {hasWhatIf && (
                      <TouchableOpacity
                        onPress={() => setWhatIf({})}
                        style={[styles.hintBox, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '30' }]}
                      >
                        <X size={13} color={colors.warning} />
                        <Text style={{ fontSize: 12, color: colors.warning, flex: 1, fontWeight: '600' }}>
                          Clear {Object.keys(whatIf).length} what-if scenario{Object.keys(whatIf).length > 1 ? 's' : ''}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* Assignment list */}
                    <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>ASSIGNMENTS</Text>
                    {courseAssignments.length === 0 ? (
                      <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 0 }]}>
                        <Text style={{ fontSize: 13, color: colors.textSecondary }}>No assignments found for this course</Text>
                      </View>
                    ) : (
                      courseAssignments.map(a => {
                        const sub     = submissionMap.get(a.id);
                        const graded  = sub?.workflow_state === 'graded' && sub?.score != null;
                        const missing = sub?.missing;
                        const pts     = a.points_possible ?? 0;
                        const pct     = graded ? (sub!.score! / pts) * 100 : null;
                        const gc      = pct != null ? (pct >= 90 ? colors.success : pct >= 80 ? colors.primary : pct >= 70 ? colors.warning : colors.error) : colors.textTertiary;
                        const wi      = whatIf[a.id];

                        return (
                          <View key={a.id} style={[styles.assignCard, { backgroundColor: colors.card, borderColor: graded ? colors.border : missing ? colors.error + '40' : colors.border }]}>
                            {/* Left strip */}
                            <View style={[styles.strip, { backgroundColor: graded ? gc : missing ? colors.error : colors.border }]} />

                            <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 10 }}>
                              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }} numberOfLines={2}>
                                {a.name}
                              </Text>
                              <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2 }}>
                                {pts} pts
                                {a.due_at ? ` · Due ${new Date(a.due_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
                              </Text>
                            </View>

                            <View style={{ alignItems: 'flex-end', paddingRight: 12, paddingVertical: 10, minWidth: 90 }}>
                              {graded ? (
                                <>
                                  <Text style={{ fontSize: 17, fontWeight: '800', color: gc }}>
                                    {sub!.score}/{pts}
                                  </Text>
                                  <Text style={{ fontSize: 12, color: gc, fontWeight: '600' }}>
                                    {sub?.grade ?? `${Math.round(pct!)}%`}
                                  </Text>
                                </>
                              ) : missing ? (
                                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.error }}>Missing</Text>
                              ) : wi !== undefined ? (
                                <View style={{ alignItems: 'flex-end' }}>
                                  <View style={[styles.wiInputWrap, { borderColor: colors.primary }]}>
                                    {Platform.OS === 'web' ? (
                                      // @ts-ignore
                                      <input
                                        type="number"
                                        value={wi}
                                        onChange={(e: any) => setWhatIf({ ...whatIf, [a.id]: e.target.value })}
                                        placeholder="0"
                                        min={0}
                                        max={pts}
                                        autoFocus
                                        style={{
                                          width: 52, textAlign: 'center', background: 'transparent',
                                          border: 'none', outline: 'none', fontSize: 15, fontWeight: '700',
                                          color: colors.primary,
                                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                                        } as any}
                                      />
                                    ) : (
                                      <TextInput
                                        value={wi}
                                        onChangeText={v => setWhatIf({ ...whatIf, [a.id]: v })}
                                        placeholder="0"
                                        keyboardType="decimal-pad"
                                        style={{ width: 52, textAlign: 'center', fontSize: 15, fontWeight: '700', color: colors.primary }}
                                        autoFocus
                                      />
                                    )}
                                  </View>
                                  <Text style={{ fontSize: 10, color: colors.textTertiary }}>/ {pts} pts</Text>
                                  <TouchableOpacity onPress={() => { const w = { ...whatIf }; delete w[a.id]; setWhatIf(w); }}>
                                    <Text style={{ fontSize: 10, color: colors.error, marginTop: 2 }}>remove</Text>
                                  </TouchableOpacity>
                                </View>
                              ) : (
                                <TouchableOpacity
                                  onPress={() => setWhatIf({ ...whatIf, [a.id]: '' })}
                                  style={[styles.wiBtn, { borderColor: colors.primary + '50', backgroundColor: colors.primaryLight }]}
                                >
                                  <Zap size={11} color={colors.primary} />
                                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>What if?</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        );
                      })
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* ── Manual mode ── */}
        {mode === 'manual' && (
          <>
            {/* Result card */}
            <View style={[styles.gradeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ fontSize: 48, fontWeight: '800', color: gradeColor, letterSpacing: -1 }}>
                  {Math.round(manualGrade * 10) / 10}%
                </Text>
                <Text style={{ fontSize: 28, fontWeight: '800', color: gradeColor + 'aa' }}>
                  {letterFor(manualGrade)}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2 }}>
                  {manualGrade >= 90 ? 'Excellent work!' : manualGrade >= 80 ? 'Good job!' : manualGrade >= 70 ? 'Keep going!' : 'Needs improvement'}
                </Text>
              </View>
            </View>

            {/* Progress bar */}
            <View style={{ marginBottom: 16 }}>
              <View style={{ height: 7, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' }}>
                <View style={{ height: 7, borderRadius: 4, backgroundColor: gradeColor, width: `${Math.min(manualGrade, 100)}%` as any }} />
              </View>
            </View>

            {Math.abs(manualTotal - 100) > 0.1 && (
              <View style={[styles.hintBox, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '30', marginBottom: 12 }]}>
                <Text style={{ fontSize: 12, color: colors.warning }}>
                  ⚠️ Weights total {Math.round(manualTotal)}% — should add up to 100%
                </Text>
              </View>
            )}

            <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>ASSIGNMENTS</Text>
            {manualRows.map((a, i) => (
              <View key={i} style={[styles.assignCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.strip, { backgroundColor: a.grade ? (parseFloat(a.grade) >= 90 ? colors.success : parseFloat(a.grade) >= 80 ? colors.primary : parseFloat(a.grade) >= 70 ? colors.warning : colors.error) : colors.border }]} />
                <View style={{ flex: 1, paddingLeft: 12, paddingVertical: 10 }}>
                  {Platform.OS === 'web' ? (
                    // @ts-ignore
                    <input
                      value={a.name}
                      onChange={(e: any) => updateManual(i, 'name', e.target.value)}
                      placeholder="Assignment name"
                      style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 14, fontWeight: '600', color: colors.text, width: '100%', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' } as any}
                    />
                  ) : (
                    <TextInput
                      value={a.name}
                      onChangeText={v => updateManual(i, 'name', v)}
                      placeholder="Assignment name"
                      placeholderTextColor={colors.textTertiary}
                      style={{ fontSize: 14, fontWeight: '600', color: colors.text }}
                    />
                  )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 8, paddingVertical: 10 }}>
                  <View style={[styles.numBox, { borderColor: colors.border, backgroundColor: colors.bg }]}>
                    {Platform.OS === 'web' ? (
                      // @ts-ignore
                      <input
                        type="number"
                        value={a.grade}
                        onChange={(e: any) => updateManual(i, 'grade', e.target.value)}
                        placeholder="—"
                        style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 14, textAlign: 'center', fontWeight: '700', color: colors.text, width: 44, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' } as any}
                      />
                    ) : (
                      <TextInput
                        value={a.grade}
                        onChangeText={v => updateManual(i, 'grade', v)}
                        placeholder="—"
                        keyboardType="decimal-pad"
                        placeholderTextColor={colors.textTertiary}
                        style={{ fontSize: 14, textAlign: 'center', fontWeight: '700', color: colors.text, width: 44 }}
                      />
                    )}
                  </View>
                  <Text style={{ fontSize: 11, color: colors.textTertiary }}>% ×</Text>
                  <View style={[styles.numBox, { borderColor: colors.border, backgroundColor: colors.bg }]}>
                    {Platform.OS === 'web' ? (
                      // @ts-ignore
                      <input
                        type="number"
                        value={a.weight}
                        onChange={(e: any) => updateManual(i, 'weight', e.target.value)}
                        placeholder="—"
                        style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 14, textAlign: 'center', fontWeight: '700', color: colors.text, width: 44, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' } as any}
                      />
                    ) : (
                      <TextInput
                        value={a.weight}
                        onChangeText={v => updateManual(i, 'weight', v)}
                        placeholder="—"
                        keyboardType="decimal-pad"
                        placeholderTextColor={colors.textTertiary}
                        style={{ fontSize: 14, textAlign: 'center', fontWeight: '700', color: colors.text, width: 44 }}
                      />
                    )}
                  </View>
                  <Text style={{ fontSize: 11, color: colors.textTertiary }}>%</Text>
                  <TouchableOpacity onPress={() => removeManual(i)} style={{ padding: 6, marginLeft: 2 }}>
                    <Trash2 size={14} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <Button
              variant="outline"
              onPress={addManual}
              leftIcon={<Plus size={15} color={colors.primary} />}
              fullWidth
              style={{ marginTop: 4 }}
            >
              Add Assignment
            </Button>
          </>
        )}

        {/* ── GPA mode ── */}
        {mode === 'gpa' && (
          <>
            {/* Canvas GPA if connected */}
            {connected && canvasGpaRows.length > 0 ? (
              <>
                {/* GPA summary */}
                <View style={[styles.gradeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={{ alignItems: 'center', flex: 1, paddingHorizontal: 16 }}>
                    <Text style={{ fontSize: 48, fontWeight: '800', letterSpacing: -1,
                      color: canvasGpa != null ? gpaColor(canvasGpa, colors.success, colors.primary, colors.warning, colors.error) : colors.textTertiary }}>
                      {canvasGpa != null ? canvasGpa.toFixed(2) : '—'}
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.textTertiary, marginTop: 2 }}>
                      Cumulative GPA · {canvasGpaRows.filter(r => r.score != null).length} courses
                    </Text>
                    {canvasGpa != null && (
                      <Text style={{ fontSize: 13, fontWeight: '700', marginTop: 4,
                        color: gpaColor(canvasGpa, colors.success, colors.primary, colors.warning, colors.error) }}>
                        {canvasGpa >= 3.7 ? 'Dean\'s List' : canvasGpa >= 3.5 ? 'Honors' : canvasGpa >= 3.0 ? 'Good Standing' : canvasGpa >= 2.0 ? 'Satisfactory' : 'At Risk'}
                      </Text>
                    )}
                  </View>
                </View>

                {/* GPA bar */}
                <View style={{ marginBottom: 16 }}>
                  <View style={{ height: 7, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' }}>
                    <View style={{ height: 7, borderRadius: 4,
                      backgroundColor: canvasGpa != null ? gpaColor(canvasGpa, colors.success, colors.primary, colors.warning, colors.error) : colors.border,
                      width: `${Math.min((canvasGpa ?? 0) / 4 * 100, 100)}%` as any }} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 }}>
                    {['0.0','1.0','2.0','3.0','4.0'].map(v => (
                      <Text key={v} style={{ fontSize: 10, color: colors.textTertiary }}>{v}</Text>
                    ))}
                  </View>
                </View>

                <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>COURSES</Text>
                {canvasGpaRows.map(c => {
                  const pts = c.score != null ? gpaPoints(c.score) : null;
                  const gc  = pts != null ? gpaColor(pts, colors.success, colors.primary, colors.warning, colors.error) : colors.textTertiary;
                  return (
                    <View key={c.id} style={[styles.assignCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <View style={[styles.strip, { backgroundColor: pts != null ? gc : colors.border }]} />
                      <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 11 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }} numberOfLines={1}>{c.name}</Text>
                        <Text style={{ fontSize: 11, color: colors.textTertiary }}>{c.code}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', paddingRight: 14, paddingVertical: 11 }}>
                        {c.score != null ? (
                          <>
                            <Text style={{ fontSize: 17, fontWeight: '800', color: gc }}>{pts?.toFixed(1)}</Text>
                            <Text style={{ fontSize: 11, color: gc, fontWeight: '600' }}>{Math.round(c.score)}% · {letterFor(c.score)}</Text>
                          </>
                        ) : (
                          <Text style={{ fontSize: 12, color: colors.textTertiary }}>No grade</Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </>
            ) : (
              <>
                {/* Manual GPA */}
                <View style={[styles.gradeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={{ alignItems: 'center', flex: 1, paddingHorizontal: 16 }}>
                    <Text style={{ fontSize: 48, fontWeight: '800', letterSpacing: -1,
                      color: manualGpaTotal > 0 ? gpaColor(manualGpaVal, colors.success, colors.primary, colors.warning, colors.error) : colors.textTertiary }}>
                      {manualGpaTotal > 0 ? manualGpaVal.toFixed(2) : '—'}
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.textTertiary, marginTop: 2 }}>
                      Weighted GPA · {manualGpaTotal} total credits
                    </Text>
                    {manualGpaTotal > 0 && (
                      <Text style={{ fontSize: 13, fontWeight: '700', marginTop: 4,
                        color: gpaColor(manualGpaVal, colors.success, colors.primary, colors.warning, colors.error) }}>
                        {manualGpaVal >= 3.7 ? 'Dean\'s List' : manualGpaVal >= 3.5 ? 'Honors' : manualGpaVal >= 3.0 ? 'Good Standing' : manualGpaVal >= 2.0 ? 'Satisfactory' : 'At Risk'}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={{ marginBottom: 16 }}>
                  <View style={{ height: 7, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' }}>
                    <View style={{ height: 7, borderRadius: 4,
                      backgroundColor: manualGpaTotal > 0 ? gpaColor(manualGpaVal, colors.success, colors.primary, colors.warning, colors.error) : colors.border,
                      width: `${Math.min(manualGpaVal / 4 * 100, 100)}%` as any }} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 }}>
                    {['0.0','1.0','2.0','3.0','4.0'].map(v => (
                      <Text key={v} style={{ fontSize: 10, color: colors.textTertiary }}>{v}</Text>
                    ))}
                  </View>
                </View>

                <View style={[styles.hintBox, { backgroundColor: colors.primaryLight, borderColor: colors.primary + '30', marginBottom: 12 }]}>
                  <Text style={{ fontSize: 12, color: colors.primary, flex: 1 }}>
                    Enter your % grade and credit hours per course. GPA is weighted by credits.
                  </Text>
                </View>

                <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>COURSES</Text>
                {gpaCourses.map((c, i) => {
                  const g   = parseFloat(c.grade);
                  const pts = !isNaN(g) ? gpaPoints(g) : null;
                  const gc  = pts != null ? gpaColor(pts, colors.success, colors.primary, colors.warning, colors.error) : colors.border;
                  return (
                    <View key={i} style={[styles.assignCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <View style={[styles.strip, { backgroundColor: pts != null ? gc : colors.border }]} />
                      <View style={{ flex: 1, paddingLeft: 12, paddingVertical: 10 }}>
                        {Platform.OS === 'web' ? (
                          <input
                            value={c.name}
                            onChange={(e: any) => updateGpaCourse(i, 'name', e.target.value)}
                            placeholder="Course name"
                            style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 14, fontWeight: '600', color: colors.text, width: '100%', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' } as any}
                          />
                        ) : (
                          <TextInput value={c.name} onChangeText={v => updateGpaCourse(i, 'name', v)} placeholder="Course name" placeholderTextColor={colors.textTertiary} style={{ fontSize: 14, fontWeight: '600', color: colors.text }} />
                        )}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 8, paddingVertical: 10 }}>
                        <View style={[styles.numBox, { borderColor: colors.border, backgroundColor: colors.bg }]}>
                          {Platform.OS === 'web' ? (
                            <input type="number" value={c.grade} onChange={(e: any) => updateGpaCourse(i, 'grade', e.target.value)} placeholder="—"
                              style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 14, textAlign: 'center', fontWeight: '700', color: colors.text, width: 44, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' } as any} />
                          ) : (
                            <TextInput value={c.grade} onChangeText={v => updateGpaCourse(i, 'grade', v)} placeholder="—" keyboardType="decimal-pad" placeholderTextColor={colors.textTertiary} style={{ fontSize: 14, textAlign: 'center', fontWeight: '700', color: colors.text, width: 44 }} />
                          )}
                        </View>
                        <Text style={{ fontSize: 11, color: colors.textTertiary }}>% ×</Text>
                        <View style={[styles.numBox, { borderColor: colors.border, backgroundColor: colors.bg }]}>
                          {Platform.OS === 'web' ? (
                            <input type="number" value={c.credits} onChange={(e: any) => updateGpaCourse(i, 'credits', e.target.value)} placeholder="cr"
                              style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 14, textAlign: 'center', fontWeight: '700', color: colors.text, width: 44, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' } as any} />
                          ) : (
                            <TextInput value={c.credits} onChangeText={v => updateGpaCourse(i, 'credits', v)} placeholder="cr" keyboardType="decimal-pad" placeholderTextColor={colors.textTertiary} style={{ fontSize: 14, textAlign: 'center', fontWeight: '700', color: colors.text, width: 44 }} />
                          )}
                        </View>
                        <Text style={{ fontSize: 11, color: colors.textTertiary }}>cr</Text>
                        {pts != null && (
                          <Text style={{ fontSize: 13, fontWeight: '800', color: gc, minWidth: 28, textAlign: 'right' }}>{pts.toFixed(1)}</Text>
                        )}
                        <TouchableOpacity onPress={() => removeGpaCourse(i)} style={{ padding: 6 }}>
                          <Trash2 size={14} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
                <Button variant="outline" onPress={addGpaCourse} leftIcon={<Plus size={15} color={colors.primary} />} fullWidth style={{ marginTop: 4 }}>
                  Add Course
                </Button>
              </>
            )}

            {/* GPA scale */}
            <Text style={[styles.sectionLabel, { color: colors.textTertiary, marginTop: 24 }]}>GPA SCALE</Text>
            <View style={[styles.scaleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {[
                { range: '93–100%', gpa: '4.0', letter: 'A',  color: colors.success },
                { range: '90–92%',  gpa: '3.7', letter: 'A−', color: colors.success },
                { range: '87–89%',  gpa: '3.3', letter: 'B+', color: colors.primary },
                { range: '83–86%',  gpa: '3.0', letter: 'B',  color: colors.primary },
                { range: '80–82%',  gpa: '2.7', letter: 'B−', color: colors.primary },
                { range: '70–79%',  gpa: '2.0', letter: 'C',  color: colors.warning },
                { range: '60–69%',  gpa: '1.0', letter: 'D',  color: colors.error   },
                { range: 'Below 60%', gpa: '0.0', letter: 'F', color: '#94a3b8'     },
              ].map((row, i, arr) => (
                <View key={row.letter} style={{
                  flexDirection: 'row', alignItems: 'center', padding: 10, gap: 10,
                  borderBottomWidth: i < arr.length - 1 ? 0.5 : 0, borderBottomColor: colors.border,
                }}>
                  <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: row.color + '20', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: row.color }}>{row.letter}</Text>
                  </View>
                  <Text style={{ fontSize: 13, color: colors.text, flex: 1 }}>{row.range}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: row.color }}>{row.gpa}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Grade scale (Canvas + Manual only) ── */}
        {mode !== 'gpa' && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textTertiary, marginTop: 24 }]}>GRADE SCALE</Text>
            <View style={[styles.scaleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {[
                { range: '90–100%', letter: 'A', color: colors.success },
                { range: '80–89%',  letter: 'B', color: colors.primary },
                { range: '70–79%',  letter: 'C', color: colors.warning },
                { range: '60–69%',  letter: 'D', color: colors.error   },
                { range: 'Below 60%', letter: 'F', color: '#94a3b8'    },
              ].map((row, i, arr) => {
                const active = letterFor(displayPct) === row.letter && displayPct > 0;
                return (
                  <View key={row.letter} style={{
                    flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12,
                    borderBottomWidth: i < arr.length - 1 ? 0.5 : 0,
                    borderBottomColor: colors.border,
                    backgroundColor: active ? row.color + '10' : 'transparent',
                  }}>
                    <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: row.color + '20', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: row.color }}>{row.letter}</Text>
                    </View>
                    <Text style={{ fontSize: 14, color: colors.text, flex: 1 }}>{row.range}</Text>
                    {active && <Text style={{ fontSize: 11, color: row.color, fontWeight: '700' }}>← You</Text>}
                  </View>
                );
              })}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Course picker modal ── */}
      <Modal visible={showPicker} transparent animationType="slide">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowPicker(false)} />
        <View style={[styles.pickerSheet, { backgroundColor: colors.card }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Select Course</Text>
            <TouchableOpacity onPress={() => setShowPicker(false)} style={[styles.closeBtn, { backgroundColor: colors.bg }]}>
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {courses.map(c => {
              const enroll  = c.enrollments?.[0];
              const score   = enroll?.computed_current_score;
              const grade   = enroll?.computed_current_grade;
              const selected = c.id === selectedId;
              const gc = score != null ? (score >= 90 ? colors.success : score >= 80 ? colors.primary : score >= 70 ? colors.warning : colors.error) : colors.textTertiary;
              return (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => { setSelectedId(c.id); setWhatIf({}); setShowPicker(false); }}
                  style={[styles.courseRow, {
                    backgroundColor: selected ? colors.primaryLight : 'transparent',
                    borderColor: selected ? colors.primary : colors.border,
                  }]}
                >
                  <View style={[styles.courseIcon, { backgroundColor: selected ? colors.primary : colors.primaryLight }]}>
                    <BookOpen size={16} color={selected ? '#fff' : colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }} numberOfLines={1}>{c.name}</Text>
                    <Text style={{ fontSize: 12, color: colors.textTertiary }}>{c.course_code}</Text>
                  </View>
                  {score != null && (
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 17, fontWeight: '800', color: gc }}>{grade ?? `${Math.round(score)}%`}</Text>
                      <Text style={{ fontSize: 11, color: gc }}>{letterFor(score)}</Text>
                    </View>
                  )}
                  {selected && <CheckCircle size={18} color={colors.primary} style={{ marginLeft: 8 }} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 0.5 },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 0.5 },

  modeRow: { flexDirection: 'row', borderRadius: 16, borderWidth: 0.5, padding: 4, marginBottom: 16 },
  modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 13 },

  coursePicker: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderRadius: 16, borderWidth: 1.5, marginBottom: 14,
  },
  courseCode: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },

  gradeCard: {
    flexDirection: 'row', borderRadius: 20, borderWidth: 0.5,
    paddingVertical: 24, marginBottom: 14, overflow: 'hidden',
  },
  divider: { width: 0.5, alignSelf: 'stretch' },

  hintBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, borderWidth: 1, padding: 10, marginBottom: 14,
  },

  sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },

  assignCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, borderWidth: 0.5, marginBottom: 8, overflow: 'hidden',
  },
  strip: { width: 4, alignSelf: 'stretch' },

  wiBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  wiInputWrap: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 4, minWidth: 64, alignItems: 'center' },
  numBox: { borderWidth: 0.5, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 5 },

  emptyBox: {
    alignItems: 'center', padding: 32, borderRadius: 20,
    borderWidth: 0.5, marginBottom: 16, gap: 4,
  },

  scaleCard: { borderRadius: 18, borderWidth: 0.5, overflow: 'hidden' },

  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  pickerSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 44, maxHeight: '70%' },
  handle:      { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  closeBtn:    { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  courseRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 0.5, marginBottom: 8 },
  courseIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
