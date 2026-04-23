import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Trash2, BookOpen, Send } from 'lucide-react-native';
import { useUser } from '@clerk/clerk-expo';
import { useColors } from '../../lib/theme';
import { claude } from '../../lib/claude';
import { useStudyBuddyStore } from '../../store/studyBuddy';
import { useCanvasStore } from '../../store/canvas';
import { useTeamsStore } from '../../store/teams';
import { useTasksStore } from '../../store/tasks';
import { useNotesStore } from '../../store/notes';
import { useAuthStore } from '../../store/auth';
import { initials } from '../../utils/helpers';
import TopBar from '../../components/layout/TopBar';

/* Jumping dots */
function ThinkingDots({ color }: { color: string }) {
  if (Platform.OS === 'web') {
    return (
      <>
        <style>{`
          @keyframes sbDot {
            0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
            30% { transform: translateY(-6px); opacity: 1; }
          }
          .sbd1 { animation: sbDot 1.1s ease-in-out infinite; animation-delay: 0s; }
          .sbd2 { animation: sbDot 1.1s ease-in-out infinite; animation-delay: 0.18s; }
          .sbd3 { animation: sbDot 1.1s ease-in-out infinite; animation-delay: 0.36s; }
        `}</style>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '2px 0' }}>
          {['sbd1', 'sbd2', 'sbd3'].map(cls => (
            <div key={cls} className={cls} style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: color }} />
          ))}
        </div>
      </>
    );
  }
  return <ActivityIndicator size="small" color={color} style={{ alignSelf: 'flex-start' }} />;
}

/* Build system prompt from app context */
function buildSystemPrompt(
  courses: any[],
  assignments: any[],
  teamsAssignments: any[],
  tasks: any[],
  notes: any[],
  submissions: any[],
  userName: string,
  school: string = 'your school'
): string {
  const now = new Date();
  const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const subMap = new Map(submissions.map((s: any) => [s.assignment_id, s]));

  // Canvas upcoming
  const upcomingCanvas = assignments
    .filter(a => a.due_at && new Date(a.due_at) > now && new Date(a.due_at) <= twoWeeks)
    .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime())
    .slice(0, 6)
    .map(a => {
      const sub = subMap.get(a.id);
      let status = '';
      if (sub?.workflow_state === 'graded') status = ` [GRADED: ${sub.score}/${a.points_possible}]`;
      else if (sub?.workflow_state === 'submitted') status = ' [TURNED IN]';
      else if (sub?.workflow_state === 'pending_review') status = ' [TURNED IN - pending review]';
      else status = ' [NOT SUBMITTED]';
      return `- [Canvas] ${a.name} (due ${new Date(a.due_at!).toLocaleDateString()})${status}`;
    })
    .join('\n');

  // Teams upcoming
  const upcomingTeams = teamsAssignments
    .filter(a => a.dueDateTime && new Date(a.dueDateTime) > now && new Date(a.dueDateTime) <= twoWeeks)
    .sort((a, b) => new Date(a.dueDateTime!).getTime() - new Date(b.dueDateTime!).getTime())
    .slice(0, 6)
    .map(a => `- [Teams/${a.className}] ${a.displayName} (due ${new Date(a.dueDateTime!).toLocaleDateString()})`)
    .join('\n');

  const upcomingAll = [upcomingCanvas, upcomingTeams].filter(Boolean).join('\n');

  const pendingTasks = tasks
    .filter(t => t.status !== 'done')
    .slice(0, 6)
    .map(t => `- ${t.title}${t.dueDate ? ` (due ${new Date(t.dueDate).toLocaleDateString()})` : ''}`)
    .join('\n');

  const notesList = notes
    .slice(0, 5)
    .map(n => `- ${n.title}: ${n.content?.slice(0, 100) || '(no content)'}`)
    .join('\n');

  const coursesList = courses.map(c => c.name).join(', ') || 'No Canvas courses';
  const teamsCourseList = [...new Set(teamsAssignments.map((a: any) => a.className))].join(', ');

  const gradeSummary = courses
    .map(c => {
      const enroll = c.enrollments?.[0];
      const score  = enroll?.computed_current_score;
      return score != null ? `${c.course_code}: ${Math.round(score)}%` : null;
    })
    .filter(Boolean)
    .slice(0, 6)
    .join(', ');

  return `You are a friendly, knowledgeable Study Buddy for ${userName}, a student at ${school}. You help with homework, studying, questions about their courses, time management, and anything academic.

Current date: ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}

Student context:
Canvas courses: ${coursesList}
${teamsCourseList ? `Teams classes: ${teamsCourseList}` : ''}
${gradeSummary ? `Current grades: ${gradeSummary}` : ''}

${upcomingAll ? `Assignments due in the next 2 weeks:\n${upcomingAll}` : 'No assignments due in the next 2 weeks.'}

${pendingTasks ? `Pending tasks:\n${pendingTasks}` : 'No pending tasks.'}

${notesList ? `Recent notes:\n${notesList}` : 'No notes yet.'}

Guidelines:
- Be warm, encouraging, and concise
- When helping with coursework, break things down step by step
- If asked about a specific assignment, use the context above to give relevant advice
- Keep responses focused — don't pad with unnecessary disclaimers
- If you don't know something specific about a course, say so honestly`;
}

export default function StudyBuddyScreen() {
  const router   = useRouter();
  const colors   = useColors();
  const isWeb    = Platform.OS === 'web';
  const { user } = useUser();

  const { messages, addMessage, appendToLast, clearHistory } = useStudyBuddyStore();
  const { courses, assignments, submissions } = useCanvasStore();
  const { assignments: teamsAssignments } = useTeamsStore();
  const { tasks } = useTasksStore();
  const { notes } = useNotesStore();
  const { appData } = useAuthStore();

  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const scroll = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);

  const userName = user?.firstName || user?.fullName?.split(' ')[0] || 'Student';
  const schoolName = appData.school || 'your school';
  const accentColor = '#7c3aed';

  // Scroll to bottom when messages change
  useEffect(() => { scroll(); }, [messages.length]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    addMessage({ role: 'user', text });
    setLoading(true);
    scroll();

    // Add empty assistant placeholder
    addMessage({ role: 'assistant', text: '' });
    scroll();

    try {
      const system = buildSystemPrompt(courses, assignments, teamsAssignments, tasks, notes, submissions, userName, schoolName);
      // Build history from all messages except the empty placeholder we just added
      const history = [...messages, { role: 'user' as const, text }].map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.text,
      }));

      await claude.chat(system, history, chunk => {
        appendToLast(chunk);
        scroll();
      });
    } catch (e: any) {
      appendToLast(e.message?.includes('fetch') || e.message?.includes('Failed to fetch')
        ? 'AI service temporarily unavailable. Please try again in a moment.'
        : e.message || 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
      scroll();
    }
  };

  const userInitials = initials(user?.fullName || user?.firstName || 'S');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, marginTop: Platform.OS === 'web' ? 50 : 0 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={[styles.avatarSmall, { backgroundColor: accentColor }]}>
          <BookOpen size={16} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Study Buddy</Text>
          <Text style={[styles.headerSub, { color: colors.textTertiary }]}>
            {courses.length > 0 ? `${courses.length} courses loaded` : 'Ask me anything'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={clearHistory}
          style={[styles.clearBtn, { borderColor: colors.border }]}
        >
          <Trash2 size={14} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 16, gap: 12, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 && (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: accentColor + '18' }]}>
              <BookOpen size={36} color={accentColor} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Hey {userName}! 👋</Text>
            <Text style={[styles.emptyDesc, { color: colors.textTertiary }]}>
              I'm your Study Buddy. Ask me anything about{'\n'}your courses, assignments, or study plans.
            </Text>
            {/* Suggested prompts */}
            <View style={styles.suggestions}>
              {[
                "What's due soon?",
                "Help me study for my next exam",
                "Make a study schedule for this week",
                "Explain a concept to me",
              ].map(s => (
                <TouchableOpacity
                  key={s}
                  onPress={() => { setInput(s); }}
                  style={[styles.suggestion, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <Text style={{ fontSize: 13, color: colors.text }}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {messages.map((msg, i) => {
          const isUser = msg.role === 'user';
          const isLastAssistant = !isUser && i === messages.length - 1;
          const isStreamingPlaceholder = loading && isLastAssistant && msg.text === '';

          if (isUser) {
            return (
              <View key={msg.id} style={styles.userRow}>
                <View style={[styles.userBubble, { backgroundColor: accentColor }]}>
                  <Text style={styles.userText}>{msg.text}</Text>
                </View>
                <View style={[styles.userAvatar, { backgroundColor: accentColor }]}>
                  <Text style={styles.userAvatarText}>{userInitials}</Text>
                </View>
              </View>
            );
          }

          return (
            <View key={msg.id} style={styles.assistantRow}>
              <View style={[styles.assistantAvatar, { backgroundColor: accentColor }]}>
                <BookOpen size={14} color="#fff" />
              </View>
              <View style={[styles.assistantBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {isStreamingPlaceholder
                  ? <ThinkingDots color={accentColor} />
                  : <Text style={[styles.assistantText, { color: colors.text }]}>{msg.text}</Text>
                }
                {loading && isLastAssistant && msg.text.length > 0 && (
                  <View style={{ marginTop: 6 }}>
                    <ThinkingDots color={accentColor} />
                  </View>
                )}
              </View>
            </View>
          );
        })}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Input bar */}
      <View style={[styles.inputBar, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
        <View style={[styles.inputWrap, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          {isWeb ? (
            <input
              value={input}
              onChange={(e: any) => setInput(e.target.value)}
              onKeyDown={(e: any) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Ask your Study Buddy…"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                fontSize: 15, color: colors.text, padding: '0 4px', width: '100%',
              }}
            />
          ) : null}
        </View>
        <TouchableOpacity
          onPress={sendMessage}
          disabled={loading || !input.trim()}
          style={[styles.sendBtn, { backgroundColor: input.trim() && !loading ? accentColor : colors.border }]}
        >
          {loading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Send size={16} color="#fff" />
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  backBtn:     { padding: 4 },
  avatarSmall: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  headerSub:   { fontSize: 12, marginTop: 1 },
  clearBtn:    { padding: 8, borderRadius: 10, borderWidth: 0.5 },

  emptyState:   { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyIcon:    { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle:   { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  emptyDesc:    { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  suggestions:  { gap: 8, width: '100%', maxWidth: 360 },
  suggestion:   { padding: 12, borderRadius: 14, borderWidth: 0.5 },

  userRow:         { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-end', gap: 8 },
  userBubble:      { maxWidth: '75%', borderRadius: 18, borderBottomRightRadius: 4, padding: 12 },
  userText:        { color: '#fff', fontSize: 14, lineHeight: 20 },
  userAvatar:      { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  userAvatarText:  { color: '#fff', fontWeight: '700', fontSize: 11 },

  assistantRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  assistantAvatar: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  assistantBubble: { flex: 1, borderWidth: 0.5, borderRadius: 18, borderBottomLeftRadius: 4, padding: 12 },
  assistantText:   { fontSize: 14, lineHeight: 22 },

  inputBar:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 0.5 },
  inputWrap: { flex: 1, borderWidth: 0.5, borderRadius: 24, paddingHorizontal: 14, paddingVertical: 10 },
  sendBtn:   { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});
