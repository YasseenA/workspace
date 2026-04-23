import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, BookOpen, ChevronDown, ChevronRight, FileText, Link, CheckCircle2, Circle, Clock, TrendingUp, Zap } from 'lucide-react-native';
import { useCanvasStore } from '../../../store/canvas';
import { useColors } from '../../../lib/theme';
import { canvas } from '../../../lib/canvas';
import { fmt } from '../../../utils/helpers';

interface ModuleItem {
  id: number;
  title: string;
  type: 'Assignment' | 'Page' | 'File' | 'ExternalUrl' | 'Discussion' | 'Quiz' | 'SubHeader';
  html_url?: string;
  content_id?: number;
  completion_requirement?: { type: string; completed: boolean };
}

interface Module {
  id: number;
  name: string;
  position: number;
  items_count: number;
  items?: ModuleItem[];
  state?: string;
}

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const { courses, assignments, submissions, token } = useCanvasStore();

  const course = courses.find(c => c.id === Number(id));
  const courseAssignments = useMemo(() => assignments.filter(a => a.course_id === Number(id)), [assignments, id]);
  const subMap = useMemo(() => new Map(submissions.map(s => [s.assignment_id, s])), [submissions]);

  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
  const [tab, setTab] = useState<'modules' | 'assignments' | 'grades'>('modules');
  const [targetGrade, setTargetGrade] = useState<number | null>(null);

  const enrollment = course?.enrollments?.find(e => e.computed_current_score != null || e.computed_final_score != null) || course?.enrollments?.[0];
  const enrollmentScore = enrollment?.computed_current_score ?? enrollment?.computed_final_score;

  const computedScore = useMemo(() => {
    let earned = 0, possible = 0;
    for (const a of courseAssignments) {
      const sub = subMap.get(a.id);
      if (sub?.workflow_state === 'graded' && sub.score != null && a.points_possible > 0) {
        earned += sub.score;
        possible += a.points_possible;
      }
    }
    return possible > 0 ? (earned / possible) * 100 : null;
  }, [courseAssignments, subMap]);

  const score = (enrollmentScore != null && enrollmentScore > 0) ? enrollmentScore : computedScore;

  const targetCalc = useMemo(() => {
    if (targetGrade == null) return null;
    let earnedSoFar = 0, possibleSoFar = 0, remainingPossible = 0;
    for (const a of courseAssignments) {
      const sub = subMap.get(a.id);
      const pts = a.points_possible ?? 0;
      if (pts <= 0) continue;
      if (sub?.score != null && sub.workflow_state === 'graded') {
        earnedSoFar += sub.score;
        possibleSoFar += pts;
      } else {
        remainingPossible += pts;
      }
    }
    const totalPossible = possibleSoFar + remainingPossible;
    if (totalPossible === 0 || remainingPossible === 0) return null;
    const needed = (targetGrade / 100) * totalPossible - earnedSoFar;
    const neededPct = (needed / remainingPossible) * 100;
    return { neededPct, remainingPossible, totalPossible };
  }, [targetGrade, courseAssignments, subMap]);

  useEffect(() => {
    if (!token || !id) { setLoading(false); return; }
    canvas.getModules(token, id).then(mods => {
      setModules(mods);
      if (mods.length > 0) setExpandedModules(new Set([mods[0].id]));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [token, id]);

  const toggleModule = (moduleId: number) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      next.has(moduleId) ? next.delete(moduleId) : next.add(moduleId);
      return next;
    });
  };

  const itemIcon = (type: string) => {
    switch (type) {
      case 'Assignment': case 'Quiz': return CheckCircle2;
      case 'Page': return FileText;
      case 'File': return FileText;
      case 'ExternalUrl': return Link;
      case 'Discussion': return BookOpen;
      default: return Circle;
    }
  };

  const itemColor = (type: string) => {
    switch (type) {
      case 'Assignment': return '#10b981';
      case 'Quiz': return '#f59e0b';
      case 'Page': return '#3b82f6';
      case 'File': return '#8b5cf6';
      case 'Discussion': return '#ec4899';
      default: return colors.textTertiary;
    }
  };

  if (!course) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }, Platform.OS === 'web' && { paddingTop: 60 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{course.name}</Text>
          <Text style={{ fontSize: 12, color: colors.textTertiary }}>{course.course_code}</Text>
        </View>
        {score != null && (
          <View style={[styles.gradeBadge, { backgroundColor: (score >= 90 ? '#10b981' : score >= 80 ? '#3b82f6' : score >= 70 ? '#f59e0b' : '#ef4444') + '18' }]}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: score >= 90 ? '#10b981' : score >= 80 ? '#3b82f6' : score >= 70 ? '#f59e0b' : '#ef4444' }}>
              {Math.round(score)}%
            </Text>
          </View>
        )}
      </View>

      {/* Tab bar */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {(['modules', 'assignments', 'grades'] as const).map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          >
            <Text style={{ fontSize: 14, fontWeight: tab === t ? '700' : '500', color: tab === t ? colors.primary : colors.textTertiary, textTransform: 'capitalize' }}>
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Modules tab */}
        {tab === 'modules' && (
          loading ? (
            <View style={{ paddingVertical: 60, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ color: colors.textTertiary, marginTop: 12 }}>Loading modules...</Text>
            </View>
          ) : modules.length === 0 ? (
            <View style={{ paddingVertical: 60, alignItems: 'center' }}>
              <BookOpen size={32} color={colors.textTertiary} />
              <Text style={{ color: colors.textTertiary, marginTop: 12 }}>No modules found</Text>
            </View>
          ) : (
            modules.map(mod => {
              const expanded = expandedModules.has(mod.id);
              return (
                <View key={mod.id} style={[styles.moduleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <TouchableOpacity onPress={() => toggleModule(mod.id)} style={styles.moduleHeader}>
                    <ChevronDown
                      size={16}
                      color={colors.textSecondary}
                      style={{ transform: [{ rotate: expanded ? '0deg' : '-90deg' }] }}
                    />
                    <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: colors.text }}>{mod.name}</Text>
                    <Text style={{ fontSize: 12, color: colors.textTertiary }}>{mod.items_count || mod.items?.length || 0} items</Text>
                  </TouchableOpacity>

                  {expanded && mod.items && mod.items.map(item => {
                    if (item.type === 'SubHeader') {
                      return (
                        <View key={item.id} style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 }}>{item.title}</Text>
                        </View>
                      );
                    }
                    const Icon = itemIcon(item.type);
                    const ic = itemColor(item.type);
                    const completed = item.completion_requirement?.completed;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => {
                          if (item.type === 'Assignment' && item.content_id) {
                            router.push(`/canvas/assignment/${item.content_id}` as any);
                          } else if (item.html_url && Platform.OS === 'web') {
                            window.open(item.html_url, '_blank');
                          }
                        }}
                        style={[styles.moduleItem, { borderTopColor: colors.border }]}
                      >
                        <View style={[styles.itemIconBox, { backgroundColor: ic + '15' }]}>
                          <Icon size={14} color={ic} />
                        </View>
                        <Text style={{ flex: 1, fontSize: 13, color: colors.text }} numberOfLines={1}>{item.title}</Text>
                        {completed != null && (
                          completed
                            ? <CheckCircle2 size={14} color={colors.success} />
                            : <Circle size={14} color={colors.textTertiary} />
                        )}
                        <ChevronRight size={12} color={colors.textTertiary} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })
          )
        )}

        {/* Assignments tab */}
        {tab === 'assignments' && (
          courseAssignments.length === 0 ? (
            <View style={{ paddingVertical: 60, alignItems: 'center' }}>
              <Text style={{ color: colors.textTertiary }}>No assignments</Text>
            </View>
          ) : (
            courseAssignments
              .sort((a, b) => {
                if (!a.due_at && !b.due_at) return 0;
                if (!a.due_at) return 1;
                if (!b.due_at) return -1;
                return new Date(b.due_at).getTime() - new Date(a.due_at).getTime();
              })
              .map(a => {
                const sub = subMap.get(a.id);
                const isSubmitted = sub && sub.submitted_at;
                const isGraded = sub && sub.workflow_state === 'graded';
                const dueBadge = fmt.dueDate(a.due_at);
                return (
                  <TouchableOpacity
                    key={a.id}
                    onPress={() => router.push(`/canvas/assignment/${a.id}` as any)}
                    style={[styles.assignmentRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }} numberOfLines={1}>{a.name}</Text>
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                        {a.points_possible > 0 && <Text style={{ fontSize: 12, color: colors.textTertiary }}>{a.points_possible} pts</Text>}
                        {dueBadge && !isSubmitted && <Text style={{ fontSize: 12, color: dueBadge.color }}>{dueBadge.label}</Text>}
                        {isGraded && sub?.score != null && (
                          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.success }}>{sub.score}/{a.points_possible}</Text>
                        )}
                      </View>
                    </View>
                    {isSubmitted ? (
                      <View style={[styles.statusBadge, { backgroundColor: '#10b98118' }]}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#10b981' }}>{isGraded ? 'Graded' : 'Submitted'}</Text>
                      </View>
                    ) : (
                      <ChevronRight size={14} color={colors.textTertiary} />
                    )}
                  </TouchableOpacity>
                );
              })
          )
        )}

        {/* Grades tab */}
        {tab === 'grades' && (
          <View>
            {score != null && (
              <View style={[styles.gradeOverview, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={{ fontSize: 48, fontWeight: '800', color: score >= 90 ? '#10b981' : score >= 80 ? '#3b82f6' : score >= 70 ? '#f59e0b' : '#ef4444' }}>
                  {Math.round(score)}%
                </Text>
                <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>Current Grade</Text>
              </View>
            )}

            {/* What score do I need? */}
            <View style={[styles.calcCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: colors.primary + '18', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={14} color={colors.primary} />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>What score do I need?</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {[
                  { pct: 93, label: 'A (93%)' },
                  { pct: 90, label: 'A- (90%)' },
                  { pct: 83, label: 'B (83%)' },
                  { pct: 80, label: 'B- (80%)' },
                  { pct: 73, label: 'C (73%)' },
                  { pct: 70, label: 'C- (70%)' },
                ].map(({ pct, label }) => (
                  <TouchableOpacity
                    key={pct}
                    onPress={() => setTargetGrade(targetGrade === pct ? null : pct)}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
                      borderColor: targetGrade === pct ? colors.primary : colors.border,
                      backgroundColor: targetGrade === pct ? colors.primary : 'transparent',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: targetGrade === pct ? '#fff' : colors.textSecondary }}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {targetCalc && (
                <View style={{
                  borderRadius: 14, borderWidth: 1, padding: 14, alignItems: 'center',
                  backgroundColor: targetCalc.neededPct > 100 ? '#ef444415' : targetCalc.neededPct <= 0 ? '#10b98115' : '#f59e0b15',
                  borderColor: targetCalc.neededPct > 100 ? '#ef444440' : targetCalc.neededPct <= 0 ? '#10b98140' : '#f59e0b40',
                }}>
                  {targetCalc.neededPct > 100 ? (
                    <>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: '#ef4444' }}>Not achievable</Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4, textAlign: 'center' }}>
                        Even scoring 100% on remaining work ({targetCalc.remainingPossible} pts) isn't enough for {targetGrade}%.
                      </Text>
                    </>
                  ) : targetCalc.neededPct <= 0 ? (
                    <>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: '#10b981' }}>Already achieved!</Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                        Your current grade already meets {targetGrade}%.
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={{ fontSize: 13, color: colors.textSecondary }}>You need to average</Text>
                      <Text style={{
                        fontSize: 36, fontWeight: '800', letterSpacing: -1,
                        color: targetCalc.neededPct >= 90 ? '#f59e0b' : '#10b981',
                      }}>
                        {Math.round(targetCalc.neededPct)}%
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                        on remaining {targetCalc.remainingPossible} pts to finish at {targetGrade}%
                      </Text>
                    </>
                  )}
                </View>
              )}
            </View>

            {/* Full calculator link */}
            <TouchableOpacity
              onPress={() => router.push('/settings/grades')}
              style={[styles.calcLink, { backgroundColor: colors.primaryLight, borderColor: colors.primary + '30' }]}
            >
              <TrendingUp size={16} color={colors.primary} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, flex: 1 }}>Full Grade Calculator</Text>
              <Text style={{ fontSize: 12, color: colors.primary }}>What-if scenarios, GPA & more</Text>
              <ChevronRight size={14} color={colors.primary} />
            </TouchableOpacity>

            {/* Graded assignments */}
            {courseAssignments
              .filter(a => {
                const sub = subMap.get(a.id);
                return sub && sub.workflow_state === 'graded' && sub.score != null;
              })
              .sort((a, b) => {
                const sa = subMap.get(a.id)!, sb = subMap.get(b.id)!;
                return (sb.submitted_at ? new Date(sb.submitted_at).getTime() : 0) - (sa.submitted_at ? new Date(sa.submitted_at).getTime() : 0);
              })
              .map(a => {
                const sub = subMap.get(a.id)!;
                const pct = a.points_possible > 0 ? Math.round((sub.score! / a.points_possible) * 100) : 0;
                const gc = pct >= 90 ? '#10b981' : pct >= 80 ? '#3b82f6' : pct >= 70 ? '#f59e0b' : '#ef4444';
                return (
                  <View key={a.id} style={[styles.gradeItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }} numberOfLines={1}>{a.name}</Text>
                      <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 2 }}>{sub.score}/{a.points_possible} pts</Text>
                    </View>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: gc }}>{pct}%</Text>
                  </View>
                );
              })
            }
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700' },
  gradeBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },

  tabBar: { flexDirection: 'row', borderBottomWidth: 0.5 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },

  moduleCard: { borderRadius: 16, borderWidth: 0.5, overflow: 'hidden', marginBottom: 12 },
  moduleHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  moduleItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 0.5 },
  itemIconBox: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

  assignmentRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 0.5, padding: 14, marginBottom: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },

  gradeOverview: { alignItems: 'center', paddingVertical: 32, borderRadius: 16, borderWidth: 0.5, marginBottom: 16 },
  gradeItem: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 0.5, padding: 14, marginBottom: 8 },
  calcCard: { borderRadius: 18, borderWidth: 0.5, padding: 16, marginBottom: 12 },
  calcLink: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 16 },
});
