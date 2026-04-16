import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, Platform, FlatList, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft, Search, FileText, CheckSquare,
  BookOpen, X, Clock,
} from 'lucide-react-native';
import { useNotesStore } from '../../store/notes';
import { useTasksStore } from '../../store/tasks';
import { useCanvasStore } from '../../store/canvas';
import { useTeamsStore }  from '../../store/teams';
import { useColors } from '../../lib/theme';
import TopBar from '../../components/layout/TopBar';
import { fmt } from '../../utils/helpers';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ResultKind = 'note' | 'task' | 'assignment' | 'teams';

interface SearchResult {
  id: string;
  kind: ResultKind;
  title: string;
  subtitle: string;
  meta?: string;
}

const RECENT_KEY = 'search_recent';
const MAX_RECENT = 8;

async function loadRecent(): Promise<string[]> {
  try {
    const raw = Platform.OS === 'web'
      ? (typeof localStorage !== 'undefined' ? localStorage.getItem(RECENT_KEY) : null)
      : await AsyncStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function persistRecent(list: string[]) {
  const data = JSON.stringify(list);
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(RECENT_KEY, data);
    } else {
      await AsyncStorage.setItem(RECENT_KEY, data);
    }
  } catch {}
}

async function saveRecent(query: string, prev: string[]): Promise<string[]> {
  const updated = [query, ...prev.filter(q => q !== query)].slice(0, MAX_RECENT);
  await persistRecent(updated);
  return updated;
}

async function removeRecent(query: string, prev: string[]): Promise<string[]> {
  const updated = prev.filter(q => q !== query);
  await persistRecent(updated);
  return updated;
}

const KIND_COLORS: Record<ResultKind, string> = {
  note:       '#7c3aed',
  task:       '#3b82f6',
  assignment: '#10b981',
  teams:      '#5865f2',
};

const KIND_LABELS: Record<ResultKind, string> = {
  note:       'Note',
  task:       'Task',
  assignment: 'Canvas',
  teams:      'Teams',
};

function highlight(text: string, query: string, textColor: string, accentColor: string): React.ReactNode {
  if (!query || Platform.OS !== 'web') return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      <Text style={{ color: textColor }}>{text.slice(0, idx)}</Text>
      <Text style={{ color: accentColor, fontWeight: '700' }}>{text.slice(idx, idx + query.length)}</Text>
      <Text style={{ color: textColor }}>{text.slice(idx + query.length)}</Text>
    </>
  );
}

export default function SearchScreen() {
  const router = useRouter();
  const colors = useColors();
  const { notes } = useNotesStore();
  const { tasks } = useTasksStore();
  const { assignments, connected: canvasConnected } = useCanvasStore();
  const { assignments: teamsAssignments, connected: teamsConnected } = useTeamsStore();

  const [query,   setQuery]   = useState('');
  const [recent,  setRecent]  = useState<string[]>([]);
  const [activeKind, setActiveKind] = useState<ResultKind | null>(null);

  useEffect(() => { loadRecent().then(setRecent); }, []);

  const inputRef = useRef<any>(null);

  useEffect(() => {
    // Auto-focus on mount
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const results: SearchResult[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const out: SearchResult[] = [];

    // Notes
    notes.forEach(n => {
      if (
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q)
      ) {
        out.push({
          id: n.id,
          kind: 'note',
          title: n.title || 'Untitled',
          subtitle: n.excerpt || n.content.slice(0, 80) || 'No content',
          meta: fmt.relative(n.updatedAt),
        });
      }
    });

    // Tasks
    tasks.forEach(t => {
      if (
        t.title.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q)
      ) {
        out.push({
          id: t.id,
          kind: 'task',
          title: t.title,
          subtitle: t.status === 'done' ? 'Completed' : t.dueDate ? `Due ${new Date(t.dueDate).toLocaleDateString()}` : 'No due date',
          meta: t.status,
        });
      }
    });

    // Canvas assignments
    if (canvasConnected) {
      assignments.forEach(a => {
        if (a.name.toLowerCase().includes(q)) {
          out.push({
            id: String(a.id),
            kind: 'assignment',
            title: a.name,
            subtitle: a.due_at ? `Due ${new Date(a.due_at).toLocaleDateString()}` : 'No due date',
          });
        }
      });
    }

    // Teams assignments
    if (teamsConnected) {
      teamsAssignments.forEach(a => {
        if (a.displayName.toLowerCase().includes(q)) {
          out.push({
            id: a.id,
            kind: 'teams',
            title: a.displayName,
            subtitle: a.dueDateTime ? `Due ${new Date(a.dueDateTime).toLocaleDateString()}` : 'No due date',
            meta: a.className,
          });
        }
      });
    }

    return out;
  }, [query, notes, tasks, assignments, canvasConnected]);

  const filtered = useMemo(() =>
    activeKind ? results.filter(r => r.kind === activeKind) : results,
    [results, activeKind]
  );

  const counts = useMemo(() => ({
    note:       results.filter(r => r.kind === 'note').length,
    task:       results.filter(r => r.kind === 'task').length,
    assignment: results.filter(r => r.kind === 'assignment').length,
  }), [results]);

  const handleSubmit = () => {
    const q = query.trim();
    if (!q) return;
    saveRecent(q, recent).then(setRecent);
  };

  const handleResultPress = (item: SearchResult) => {
    const q = query.trim();
    if (q) saveRecent(q, recent).then(setRecent);
    if (item.kind === 'note') {
      router.push({ pathname: '/notes/editor', params: { id: item.id } });
    } else if (item.kind === 'task') {
      router.push('/tasks');
    } else {
      router.push('/tasks');
    }
  };

  const kindOrder: ResultKind[] = ['note', 'task', 'assignment', 'teams'];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar />
      {Platform.OS === 'web' && <View style={{ height: 50 }} />}

      {/* Search bar row */}
      <View style={[styles.bar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search size={16} color={colors.textTertiary} />
          {Platform.OS === 'web' ? (
            <input
              ref={inputRef}
              value={query}
              onChange={(e: any) => setQuery(e.target.value)}
              onKeyDown={(e: any) => { if (e.key === 'Enter') handleSubmit(); }}
              placeholder="Search notes, tasks, assignments…"
              autoFocus
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontSize: 15, color: colors.text, padding: '0 4px', width: '100%',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            />
          ) : null}
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={15} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter chips (only shown when there are results) */}
      {results.length > 0 && (
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginTop: 10, marginBottom: 6, height: 38, alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => setActiveKind(null)}
            style={[styles.chip, { backgroundColor: activeKind === null ? colors.primary : colors.card, borderColor: activeKind === null ? colors.primary : colors.border }]}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: activeKind === null ? '#fff' : colors.textSecondary }}>
              All {results.length}
            </Text>
          </TouchableOpacity>
          {kindOrder.map(k => counts[k] > 0 && (
            <TouchableOpacity
              key={k}
              onPress={() => setActiveKind(activeKind === k ? null : k)}
              style={[styles.chip, { backgroundColor: activeKind === k ? KIND_COLORS[k] : colors.card, borderColor: activeKind === k ? KIND_COLORS[k] : colors.border }]}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: activeKind === k ? '#fff' : colors.textSecondary }}>
                {KIND_LABELS[k]} {counts[k]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Results / empty state / recent searches */}
      {query.trim() === '' ? (
        /* Recent searches */
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }}>
          {recent.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>Recent Searches</Text>
              {recent.map(q => (
                <View key={q} style={[styles.recentRow, { borderBottomColor: colors.border }]}>
                  <TouchableOpacity
                    onPress={() => setQuery(q)}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 }}
                  >
                    <Clock size={15} color={colors.textTertiary} />
                    <Text style={{ fontSize: 14, color: colors.text }}>{q}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => removeRecent(q, recent).then(setRecent)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={14} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}

          {/* Content stats */}
          <View style={[styles.statsRow, { marginTop: recent.length > 0 ? 24 : 0 }]}>
            {[
              { icon: <FileText size={18} color={colors.primary} />, label: 'Notes', count: notes.length },
              { icon: <CheckSquare size={18} color='#3b82f6' />, label: 'Tasks', count: tasks.length },
              { icon: <BookOpen size={18} color='#10b981' />, label: 'Assignments', count: assignments.length },
            ].map((s, i) => (
              <View key={i} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {s.icon}
                <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 4 }}>{s.count}</Text>
                <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2 }}>{s.label}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Search size={40} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No results</Text>
          <Text style={[styles.emptyDesc, { color: colors.textTertiary }]}>
            Nothing matched "{query.trim()}"
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={r => `${r.kind}-${r.id}`}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const accent = KIND_COLORS[item.kind];
            return (
              <TouchableOpacity
                onPress={() => handleResultPress(item)}
                style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                activeOpacity={0.7}
              >
                {/* Kind color strip */}
                <View style={[styles.resultStrip, { backgroundColor: accent }]} />

                <View style={{ flex: 1, paddingLeft: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <View style={[styles.kindBadge, { backgroundColor: accent + '1a' }]}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: accent }}>
                        {KIND_LABELS[item.kind].toUpperCase()}
                      </Text>
                    </View>
                    {item.meta && (
                      <Text style={{ fontSize: 11, color: colors.textTertiary }}>{item.meta}</Text>
                    )}
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  backBtn:  { padding: 4 },
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 0.5, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 10,
  },

  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 0.5 },

  sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  recentRow:    { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 0.5 },

  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, borderRadius: 16, borderWidth: 0.5,
    alignItems: 'center', paddingVertical: 16,
  },

  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyDesc:  { fontSize: 14 },

  resultCard: {
    flexDirection: 'row', alignItems: 'stretch',
    borderRadius: 14, borderWidth: 0.5,
    marginBottom: 10, overflow: 'hidden',
    paddingVertical: 12,
  },
  resultStrip: { width: 4 },
  kindBadge:   { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
});
