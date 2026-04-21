import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Calendar, Plus, Link2, X, RefreshCw } from 'lucide-react-native';
import { useCanvasStore } from '../../store/canvas';
import { useTeamsStore }  from '../../store/teams';
import { useTasksStore }  from '../../store/tasks';
import { useGCalStore }   from '../../store/gcal';
import { useColors }      from '../../lib/theme';
import { showAlert }      from '../../utils/helpers';
import TabBar  from '../../components/layout/TabBar';
import TopBar  from '../../components/layout/TopBar';
import AssignmentDetailSheet, { SheetItem } from '../../components/AssignmentDetailSheet';

const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

interface CalItem {
  id: string;
  title: string;
  kind: 'canvas' | 'teams' | 'task' | 'gcal';
  color: string;
  time?: string;
  // original source object for detail sheet
  source: any;
}

function toDateKey(d: Date) {
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export default function CalendarScreen() {
  const router = useRouter();
  const colors = useColors();
  const { assignments: canvasAssignments, courses, submissions } = useCanvasStore();
  const { assignments: teamsAssignments }  = useTeamsStore();
  const { tasks, completeTask } = useTasksStore();
  const { connected: gcalConnected, events: gcalEvents, connect: connectGCal, disconnect: disconnectGCal, sync: syncGCal, isSyncing: gcalSyncing } = useGCalStore();

  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string>(toDateKey(today));
  const [sheetItem, setSheetItem] = useState<SheetItem | null>(null);
  const [showGCalInput, setShowGCalInput] = useState(false);
  const [gcalUrl, setGCalUrl] = useState('');

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y+1); } else setMonth(m => m+1); };

  // Build lookup maps
  const courseMap = useMemo(() =>
    new Map(courses.map(c => [c.id, c])), [courses]);
  const subMap = useMemo(() =>
    new Map(submissions.map(s => [s.assignment_id, s])), [submissions]);

  // Build day → items map
  const itemsByDay = useMemo(() => {
    const map = new Map<string, CalItem[]>();
    const add = (key: string, item: CalItem) => {
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    };

    canvasAssignments.forEach(a => {
      if (!a.due_at) return;
      const key = toDateKey(new Date(a.due_at));
      add(key, {
        id: `c-${a.id}`, title: a.name, kind: 'canvas', color: '#10b981',
        time: new Date(a.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: a,
      });
    });

    teamsAssignments.forEach(a => {
      if (!a.dueDateTime) return;
      const key = toDateKey(new Date(a.dueDateTime));
      add(key, {
        id: `t-${a.id}`, title: a.displayName, kind: 'teams', color: '#5865f2',
        time: new Date(a.dueDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: a,
      });
    });

    tasks.filter(t => t.dueDate && t.status !== 'done').forEach(t => {
      const raw = t.dueDate!;
      const d = new Date(raw.includes('T') ? raw : raw + 'T00:00:00');
      const key = toDateKey(d);
      add(key, { id: `tk-${t.id}`, title: t.title, kind: 'task', color: '#f59e0b', source: t });
    });

    gcalEvents.forEach(e => {
      const key = toDateKey(new Date(e.start));
      add(key, {
        id: `gc-${e.id}`, title: e.title, kind: 'gcal' as any, color: '#4285f4',
        time: e.allDay ? undefined : new Date(e.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: e,
      });
    });

    return map;
  }, [canvasAssignments, teamsAssignments, tasks, gcalEvents]);

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedItems = itemsByDay.get(selected) || [];
  const selectedDate  = new Date(selected + 'T12:00:00');

  function openItem(item: CalItem) {
    if (item.kind === 'canvas') {
      const course     = courseMap.get(item.source.course_id);
      const submission = subMap.get(item.source.id);
      setSheetItem({ kind: 'canvas', data: item.source, course, submission });
    } else if (item.kind === 'teams') {
      setSheetItem({ kind: 'teams', data: item.source });
    } else {
      setSheetItem({ kind: 'task', data: item.source });
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100, paddingTop: Platform.OS === 'web' ? 50 : 0 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5 }}>Calendar</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {gcalConnected && (
              <TouchableOpacity onPress={() => syncGCal()} style={[styles.headerBtn, { borderColor: colors.border }]}>
                {gcalSyncing ? <ActivityIndicator size="small" color="#4285f4" /> : <RefreshCw size={14} color="#4285f4" />}
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => gcalConnected
                ? showAlert('Google Calendar', 'Connected via iCal feed.', [
                    { text: 'Disconnect', style: 'destructive', onPress: disconnectGCal },
                    { text: 'OK', style: 'cancel' },
                  ])
                : setShowGCalInput(true)
              }
              style={[styles.headerBtn, { borderColor: gcalConnected ? '#4285f4' : colors.border, backgroundColor: gcalConnected ? '#4285f412' : 'transparent' }]}
            >
              {gcalConnected ? <Link2 size={14} color="#4285f4" /> : <Plus size={14} color={colors.textSecondary} />}
              <Text style={{ fontSize: 12, fontWeight: '600', color: gcalConnected ? '#4285f4' : colors.textSecondary }}>
                {gcalConnected ? 'Google Cal' : 'Add Calendar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Google Calendar connect input */}
        {showGCalInput && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            <View style={[styles.gcalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Connect Google Calendar</Text>
                <TouchableOpacity onPress={() => setShowGCalInput(false)}><X size={16} color={colors.textTertiary} /></TouchableOpacity>
              </View>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 10, lineHeight: 18 }}>
                Paste your Google Calendar iCal URL.{'\n'}Google Calendar → Settings → your calendar → "Secret address in iCal format"
              </Text>
              <TextInput
                value={gcalUrl}
                onChangeText={setGCalUrl}
                placeholder="https://calendar.google.com/calendar/ical/..."
                placeholderTextColor={colors.textTertiary}
                style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, fontSize: 13, color: colors.text, backgroundColor: colors.bg, marginBottom: 10 }}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={async () => {
                  if (!gcalUrl.trim()) return;
                  try {
                    await connectGCal(gcalUrl.trim());
                    setShowGCalInput(false);
                    setGCalUrl('');
                    showAlert('Connected', 'Google Calendar events synced!');
                  } catch (e: any) {
                    showAlert('Error', e.message || 'Could not connect');
                  }
                }}
                disabled={!gcalUrl.trim() || gcalSyncing}
                style={{ backgroundColor: gcalUrl.trim() ? '#4285f4' : colors.border, borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
              >
                {gcalSyncing
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Connect</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Month nav */}
        <View style={[styles.monthNav, { borderBottomColor: colors.border, borderTopColor: colors.border }]}>
          <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
            <ChevronLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
            {MONTHS[month]} {year}
          </Text>
          <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
            <ChevronRight size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Day labels */}
        <View style={styles.dayLabels}>
          {DAYS.map(d => (
            <Text key={d} style={[styles.dayLabel, { color: colors.textTertiary }]}>{d}</Text>
          ))}
        </View>

        {/* Grid */}
        <View style={styles.grid}>
          {cells.map((day, i) => {
            if (!day) return <View key={`empty-${i}`} style={styles.cell} />;
            const key       = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const items     = itemsByDay.get(key) || [];
            const isToday   = key === toDateKey(today);
            const isSel     = key === selected;
            const dotColors = [...new Set(items.map(x => x.color))].slice(0, 3);

            return (
              <TouchableOpacity
                key={key}
                onPress={() => setSelected(key)}
                style={[
                  styles.cell,
                  isSel && { backgroundColor: colors.primary, borderRadius: 12 },
                  isToday && !isSel && { backgroundColor: colors.primaryLight, borderRadius: 12 },
                ]}
                activeOpacity={0.7}
              >
                <Text style={{
                  fontSize: 14, fontWeight: isToday || isSel ? '800' : '500',
                  color: isSel ? '#fff' : isToday ? colors.primary : colors.text,
                }}>
                  {day}
                </Text>
                {dotColors.length > 0 && (
                  <View style={{ flexDirection: 'row', gap: 2, marginTop: 3 }}>
                    {dotColors.map((c, ci) => (
                      <View key={ci} style={{ width: 5, height: 5, borderRadius: 3,
                        backgroundColor: isSel ? 'rgba(255,255,255,0.8)' : c }} />
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected day items */}
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10 }}>
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            {selectedItems.length > 0 ? ` · ${selectedItems.length} item${selectedItems.length > 1 ? 's' : ''}` : ''}
          </Text>

          {selectedItems.length === 0 ? (
            <View style={[styles.emptyDay, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Calendar size={24} color={colors.textTertiary} />
              <Text style={{ fontSize: 14, color: colors.textTertiary, marginTop: 8 }}>Nothing due this day</Text>
            </View>
          ) : (
            selectedItems.map(item => (
              <TouchableOpacity
                key={item.id}
                onPress={() => openItem(item)}
                style={[styles.itemRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                activeOpacity={0.75}
              >
                <View style={[styles.itemStrip, { backgroundColor: item.color }]} />
                <View style={{ flex: 1, paddingLeft: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <View style={[styles.kindBadge, { backgroundColor: item.color + '1a' }]}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: item.color }}>
                        {item.kind === 'canvas' ? 'CANVAS' : item.kind === 'teams' ? 'TEAMS' : item.kind === 'gcal' ? 'CALENDAR' : 'TASK'}
                      </Text>
                    </View>
                    {item.time && <Text style={{ fontSize: 11, color: colors.textTertiary }}>{item.time}</Text>}
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }} numberOfLines={2}>
                    {item.title}
                  </Text>
                </View>
                <ChevronRight size={14} color={colors.textTertiary} style={{ marginRight: 12 }} />
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Detail sheet */}
      <AssignmentDetailSheet
        item={sheetItem}
        onClose={() => setSheetItem(null)}
        onCompleteTask={(id) => { completeTask(id); setSheetItem(null); }}
      />

      <TabBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  monthNav:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 0.5, borderBottomWidth: 0.5 },
  navBtn:     { padding: 6 },
  dayLabels:  { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 8 },
  dayLabel:   { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  grid:       { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 },
  cell:       { width: `${100/7}%` as any, height: 52, alignItems: 'center', justifyContent: 'center', paddingVertical: 2 },
  emptyDay:   { borderRadius: 16, borderWidth: 0.5, padding: 32, alignItems: 'center' },
  itemRow:    { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 0.5, marginBottom: 8, overflow: 'hidden', paddingVertical: 12 },
  itemStrip:  { width: 4, alignSelf: 'stretch' },
  kindBadge:  { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  headerBtn:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  gcalCard:   { borderRadius: 16, borderWidth: 0.5, padding: 16 },
});
