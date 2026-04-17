import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Platform, Linking, TextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft, ExternalLink, Calendar, Award, Clock,
  Send, CheckCircle2, AlertCircle, Sparkles,
  BookOpen, Upload, Zap,
} from 'lucide-react-native';
import { useCanvasStore } from '../../../store/canvas';
import { useColors } from '../../../lib/theme';
import { showAlert } from '../../../utils/helpers';
import { claude } from '../../../lib/claude';

function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function fmtDue(iso: string | null | undefined) {
  if (!iso) return 'No due date';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
       + ' at ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function daysLeft(iso: string | null | undefined) {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (days < 0)  return { label: 'Overdue',       color: '#ef4444' };
  if (days === 0) return { label: 'Due today',     color: '#f59e0b' };
  if (days === 1) return { label: 'Due tomorrow',  color: '#f97316' };
  return { label: `${days} days left`,             color: '#10b981' };
}

export default function AssignmentPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const colors  = useColors();
  const { assignments, courses, submissions, token, submitAssignment } = useCanvasStore();

  const assignment = useMemo(() => assignments.find(a => String(a.id) === id), [assignments, id]);
  const course     = useMemo(() => courses.find(c => c.id === assignment?.course_id), [courses, assignment]);
  const submission = useMemo(() => submissions.find(s => s.assignment_id === Number(id)), [submissions, id]);

  const [textInput,    setTextInput]    = useState('');
  const [urlInput,     setUrlInput]     = useState('');
  const [fileName,     setFileName]     = useState<string | null>(null);
  const [fileObj,      setFileObj]      = useState<File | null>(null);
  const [submitting,   setSubmitting]   = useState(false);
  const [submitted,    setSubmitted]    = useState(false);
  const [activeTab,    setActiveTab]    = useState<'text' | 'url' | 'file'>('text');
  const [aiSummary,    setAiSummary]    = useState('');
  const [aiLoading,    setAiLoading]    = useState(false);
  const aiLoadedRef = useRef<number | null>(null);

  const desc   = stripHtml(assignment?.description);
  const types  = assignment?.submission_types?.filter(t => t !== 'none') ?? [];
  const hasText = types.includes('online_text_entry');
  const hasUrl  = types.includes('online_url');
  const hasFile = types.includes('online_upload');

  const subState  = submission?.workflow_state;
  const alreadyIn = subState === 'submitted' || subState === 'graded' || submitted;
  const canSubmit = !!token && !alreadyIn;

  const due = daysLeft(assignment?.due_at);

  // Set default tab to first available type
  useEffect(() => {
    if (hasText) setActiveTab('text');
    else if (hasUrl) setActiveTab('url');
    else if (hasFile) setActiveTab('file');
  }, [hasText, hasUrl, hasFile]);

  // Stream AI summary when assignment loads
  useEffect(() => {
    if (!assignment || aiLoadedRef.current === assignment.id) return;
    aiLoadedRef.current = assignment.id;
    setAiSummary('');
    setAiLoading(true);
    const descSnippet = desc.slice(0, 400);
    const dueStr = assignment.due_at ? new Date(assignment.due_at).toLocaleDateString() : 'No due date';
    let full = '';
    claude.assignmentBrief(assignment.name, descSnippet, assignment.points_possible || 0, dueStr, chunk => {
      full += chunk;
      setAiSummary(full);
    }).catch(() => {}).finally(() => setAiLoading(false));
  }, [assignment?.id]);

  const handleFilePick = () => {
    if (Platform.OS !== 'web') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,image/*,.doc,.docx,.txt,.zip,.java,.py,.cpp,.c,.h,.cs';
    input.onchange = () => {
      const f = input.files?.[0];
      if (f) { setFileObj(f); setFileName(f.name); }
    };
    input.click();
  };

  const handleSubmit = async () => {
    if (!token || !assignment) return;
    let subType: 'text' | 'url' | 'file';
    let payload: string | File;

    if (activeTab === 'text') {
      if (!textInput.trim()) { showAlert('Empty submission', 'Please write something before submitting.'); return; }
      subType = 'text'; payload = textInput.trim();
    } else if (activeTab === 'url') {
      if (!urlInput.trim()) { showAlert('No URL', 'Please enter a URL.'); return; }
      subType = 'url'; payload = urlInput.trim();
    } else {
      if (!fileObj) { showAlert('No file', 'Please choose a file first.'); return; }
      subType = 'file'; payload = fileObj;
    }

    setSubmitting(true);
    try {
      await submitAssignment(assignment.course_id, assignment.id, subType, payload);
      setSubmitted(true);
      showAlert('Submitted!', 'Your assignment was submitted successfully.');
    } catch (e: any) {
      showAlert('Submission failed', e.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!assignment) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.textSecondary }}>Assignment not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const subStatusColor =
    subState === 'graded'    ? '#10b981' :
    subState === 'submitted' ? '#3b82f6' :
    submitted                ? '#3b82f6' :
    submission?.missing      ? '#ef4444' : colors.textTertiary;

  const subStatusLabel =
    subState === 'graded'    ? `Graded · ${submission?.grade ?? '—'}` :
    subState === 'submitted' ? 'Submitted' :
    submitted                ? 'Submitted' :
    submission?.missing      ? 'Missing' : 'Pending';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>

      {/* ── Top bar ── */}
      <View style={[styles.topBar, { borderBottomColor: colors.border, backgroundColor: colors.card }, Platform.OS === 'web' && { paddingTop: 60 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: colors.text }]} numberOfLines={1}>Assignment</Text>
        {assignment.html_url ? (
          <TouchableOpacity onPress={() => Linking.openURL(assignment.html_url)} style={styles.backBtn}>
            <ExternalLink size={18} color={colors.primary} />
          </TouchableOpacity>
        ) : <View style={styles.backBtn} />}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

        {/* ── Hero header ── */}
        <View style={[styles.hero, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={[styles.heroIcon, { backgroundColor: colors.primary + '18' }]}>
            <BookOpen size={28} color={colors.primary} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>{assignment.name}</Text>
          {course && (
            <View style={[styles.coursePill, { backgroundColor: colors.primary + '18' }]}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
                {course.course_code || course.name}
              </Text>
            </View>
          )}
        </View>

        {/* ── Metadata bar ── */}
        <View style={[styles.metaBar, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
          <View style={styles.metaCell}>
            <Calendar size={15} color={colors.textTertiary} />
            <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>
              {assignment.due_at
                ? new Date(assignment.due_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : 'No due date'}
            </Text>
            {due && <Text style={{ fontSize: 11, fontWeight: '700', color: due.color }}>{due.label}</Text>}
          </View>
          <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
          <View style={styles.metaCell}>
            <Award size={15} color={colors.textTertiary} />
            <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>
              {assignment.points_possible > 0 ? `${assignment.points_possible} pts` : '—'}
            </Text>
          </View>
          <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
          <View style={styles.metaCell}>
            {alreadyIn
              ? <CheckCircle2 size={15} color={subStatusColor} />
              : <Clock size={15} color={colors.textTertiary} />
            }
            <Text style={[styles.metaLabel, { color: subStatusColor, fontWeight: alreadyIn ? '700' : '400' }]}>
              {subStatusLabel}
            </Text>
          </View>
        </View>

        <View style={{ padding: 16, gap: 16 }}>

          {/* ── AI Summary ── */}
          {(aiLoading || aiSummary.length > 0) && (
            <View style={[styles.card, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Sparkles size={13} color={colors.primary} />
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 }}>AI SUMMARY</Text>
                {aiLoading && <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 4 }} />}
              </View>
              <Text style={{ fontSize: 14, color: colors.text, lineHeight: 21 }}>{aiSummary || ' '}</Text>
            </View>
          )}

          {/* ── Full description ── */}
          {desc.length > 0 && (
            <View>
              <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>DESCRIPTION</Text>
              <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 22 }}>{desc}</Text>
            </View>
          )}

          {/* ── Submission types chip ── */}
          {types.length > 0 && (
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {types.map(t => (
                <View key={t} style={[styles.typeChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>{t.replace(/_/g, ' ')}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Submission section ── */}
          {canSubmit && (hasText || hasUrl || hasFile) && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.textTertiary, marginBottom: 12 }]}>SUBMIT YOUR WORK</Text>

              {/* Tab switcher (only if multiple types) */}
              {[hasText, hasUrl, hasFile].filter(Boolean).length > 1 && (
                <View style={[styles.tabs, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  {hasText && (
                    <TouchableOpacity
                      style={[styles.tab, activeTab === 'text' && { backgroundColor: colors.primary }]}
                      onPress={() => setActiveTab('text')}
                    >
                      <Text style={[styles.tabLabel, { color: activeTab === 'text' ? '#fff' : colors.textSecondary }]}>Text</Text>
                    </TouchableOpacity>
                  )}
                  {hasUrl && (
                    <TouchableOpacity
                      style={[styles.tab, activeTab === 'url' && { backgroundColor: colors.primary }]}
                      onPress={() => setActiveTab('url')}
                    >
                      <Text style={[styles.tabLabel, { color: activeTab === 'url' ? '#fff' : colors.textSecondary }]}>URL</Text>
                    </TouchableOpacity>
                  )}
                  {hasFile && (
                    <TouchableOpacity
                      style={[styles.tab, activeTab === 'file' && { backgroundColor: colors.primary }]}
                      onPress={() => setActiveTab('file')}
                    >
                      <Text style={[styles.tabLabel, { color: activeTab === 'file' ? '#fff' : colors.textSecondary }]}>File</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Text entry */}
              {activeTab === 'text' && hasText && (
                <TextInput
                  style={[styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
                  placeholder="Write your submission here…"
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={8}
                  value={textInput}
                  onChangeText={setTextInput}
                  textAlignVertical="top"
                />
              )}

              {/* URL */}
              {activeTab === 'url' && hasUrl && (
                <TextInput
                  style={[styles.urlInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
                  placeholder="https://your-submission-link.com"
                  placeholderTextColor={colors.textTertiary}
                  value={urlInput}
                  onChangeText={setUrlInput}
                  keyboardType="url"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              )}

              {/* File upload */}
              {activeTab === 'file' && hasFile && (
                <TouchableOpacity
                  style={[styles.dropZone, { borderColor: fileObj ? colors.primary : colors.border, backgroundColor: colors.bg }]}
                  onPress={handleFilePick}
                  activeOpacity={0.8}
                >
                  <Upload size={24} color={fileObj ? colors.primary : colors.textTertiary} />
                  <Text style={{ fontSize: 14, fontWeight: '600', color: fileObj ? colors.primary : colors.textTertiary, marginTop: 8 }}>
                    {fileName || 'Click to choose a file'}
                  </Text>
                  {!fileName && (
                    <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 4 }}>
                      PDF, image, Word, zip, or code files
                    </Text>
                  )}
                </TouchableOpacity>
              )}

              {/* Submit button */}
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: submitting ? 0.7 : 1 }]}
                onPress={handleSubmit}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting
                  ? <ActivityIndicator color="#fff" />
                  : (
                    <>
                      <Send size={16} color="#fff" />
                      <Text style={styles.submitLabel}>Submit Assignment</Text>
                    </>
                  )
                }
              </TouchableOpacity>
            </View>
          )}

          {/* Already submitted banner */}
          {alreadyIn && (
            <View style={[styles.card, { backgroundColor: '#10b98110', borderColor: '#10b98130' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 size={20} color="#10b981" />
                <View>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#10b981' }}>
                    {subState === 'graded' ? `Graded: ${submission?.grade ?? '—'}` : 'Submitted'}
                  </Text>
                  {submission?.submitted_at && (
                    <Text style={{ fontSize: 12, color: '#10b981', marginTop: 2, opacity: 0.8 }}>
                      {new Date(submission.submitted_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Not connected via token — prompt */}
          {!token && (hasText || hasUrl || hasFile) && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <AlertCircle size={18} color={colors.textTertiary} />
                <Text style={{ fontSize: 13, color: colors.textSecondary, flex: 1, lineHeight: 19 }}>
                  Connect Canvas via API token to submit assignments directly from Workspace.
                </Text>
              </View>
            </View>
          )}

          {/* AI Help button */}
          <TouchableOpacity
            style={[styles.aiBtn]}
            onPress={() => {
              const p = new URLSearchParams({
                assignmentName:   assignment.name,
                assignmentDesc:   desc.slice(0, 600),
                assignmentPoints: String(assignment.points_possible || ''),
                assignmentDue:    assignment.due_at
                  ? new Date(assignment.due_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                  : '',
              });
              router.push(`/ai-studio?${p.toString()}` as any);
            }}
            activeOpacity={0.85}
          >
            <Zap size={16} color="#fff" fill="#fff" />
            <Text style={styles.submitLabel}>Get AI Help with This Assignment</Text>
          </TouchableOpacity>

          {/* Open in Canvas */}
          {assignment.html_url && (
            <TouchableOpacity
              style={[styles.openBtn, { backgroundColor: colors.card, borderWidth: 0.5, borderColor: colors.border }]}
              onPress={() => Linking.openURL(assignment.html_url)}
              activeOpacity={0.85}
            >
              <ExternalLink size={16} color={colors.textSecondary} />
              <Text style={[styles.submitLabel, { color: colors.textSecondary }]}>Open in Canvas</Text>
            </TouchableOpacity>
          )}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 0.5,
  },
  backBtn:      { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  topBarTitle:  { fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },

  hero: {
    alignItems: 'center', paddingHorizontal: 24, paddingVertical: 28,
    borderBottomWidth: 0.5, gap: 10,
  },
  heroIcon:  { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  heroTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center', letterSpacing: -0.4, lineHeight: 26 },
  coursePill:{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },

  metaBar: {
    flexDirection: 'row', borderBottomWidth: 0.5,
  },
  metaCell: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, gap: 4,
  },
  metaLabel:    { fontSize: 12, fontWeight: '500' },
  metaDivider:  { width: 0.5, marginVertical: 10 },

  sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 8 },

  card: { borderRadius: 16, borderWidth: 0.5, padding: 16 },

  typeChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 0.5 },

  tabs: {
    flexDirection: 'row', borderRadius: 12, borderWidth: 0.5,
    overflow: 'hidden', marginBottom: 12,
  },
  tab:      { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10 },
  tabLabel: { fontSize: 13, fontWeight: '600' },

  textArea: {
    borderRadius: 12, borderWidth: 0.5, padding: 14,
    fontSize: 14, minHeight: 180, marginBottom: 12, lineHeight: 21,
  },
  urlInput: {
    borderRadius: 12, borderWidth: 0.5, padding: 14,
    fontSize: 14, marginBottom: 12,
  },
  dropZone: {
    borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed',
    padding: 32, alignItems: 'center', marginBottom: 12,
  },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 14, paddingVertical: 15,
  },
  openBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 14, paddingVertical: 15,
  },
  aiBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 14, paddingVertical: 15,
    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' as any,
    backgroundColor: '#7c3aed',
  },
  submitLabel: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
