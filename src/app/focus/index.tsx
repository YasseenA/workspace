import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Platform, Vibration, ScrollView, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Play, Pause, RotateCcw, SlidersHorizontal, Coffee, Brain, Flame, Zap, CheckCircle2, X, BarChart2 } from 'lucide-react-native';
import { useFocusStore } from '../../store/focus';
import { useTasksStore } from '../../store/tasks';
import TabBar from '../../components/layout/TabBar';
import TopBar from '../../components/layout/TopBar';
import { useColors } from '../../lib/theme';
import { showAlert } from '../../utils/helpers';
function last7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
}

function dayLabel(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
}

type Mode = 'work' | 'break';

export default function FocusScreen() {
  const router = useRouter();
  const colors = useColors();
  const {
    workMinutes, breakMinutes, sessions, totalFocusMinutes, streak,
    sessionLog,
    setWorkMinutes, setBreakMinutes, recordSession,
    focusTaskId, focusTaskTitle, setFocusTask,
  } = useFocusStore();
  const { completeTask } = useTasksStore();

  const [mode,               setMode]               = useState<Mode>('work');
  const [running,            setRunning]            = useState(false);
  const [seconds,            setSeconds]            = useState(workMinutes * 60);
  const [sessionTotal,       setSessionTotal]       = useState(workMinutes * 60);
  const [showSettings,       setShowSettings]       = useState(false);
  const [completedSessions,  setCompletedSessions]  = useState(0);
  const [isEditing,          setIsEditing]          = useState(false);
  const [editValue,          setEditValue]          = useState('');
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    setSeconds((mode === 'work' ? workMinutes : breakMinutes) * 60);
    setRunning(false);
  }, [workMinutes, breakMinutes]);


  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current);
            handleTimerEnd();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, mode]);

  const handleTimerEnd = () => {
    if (Platform.OS !== 'web') Vibration.vibrate([500, 200, 500]);
    if (mode === 'work') {
      recordSession(workMinutes, focusTaskTitle || undefined);
      setCompletedSessions(c => c + 1);

      // If working on a specific task, offer to mark it done
      if (focusTaskId && focusTaskTitle) {
        showAlert(
          'Session complete! 🎉',
          `Great work on "${focusTaskTitle}"! Mark it as done?`,
          [
            {
              text: 'Mark Done',
              onPress: () => {
                completeTask(focusTaskId);
                setFocusTask(null, null);
                showAlert('Task done! 🏆', 'Keep the momentum going.', [
                  { text: 'Start Break', onPress: () => { setMode('break'); setSeconds(breakMinutes * 60); setRunning(true); } },
                  { text: 'Next Task',   onPress: () => router.push('/tasks') },
                ]);
              },
            },
            {
              text: 'Not yet',
              onPress: () => {
                showAlert('Nice work! ☕', 'Time for a break.', [
                  { text: 'Start Break', onPress: () => { setMode('break'); setSeconds(breakMinutes * 60); setRunning(true); } },
                  { text: 'Skip',        style: 'cancel', onPress: () => { setMode('work'); setSeconds(workMinutes * 60); } },
                ]);
              },
            },
          ]
        );
      } else {
        showAlert('Session complete! 🎉', 'Great work. Time for a break.', [
          { text: 'Start Break', onPress: () => { setMode('break'); setSeconds(breakMinutes * 60); setRunning(true); } },
          { text: 'Skip',        style: 'cancel', onPress: () => { setMode('work'); setSeconds(workMinutes * 60); } },
        ]);
      }
    } else {
      showAlert('Break over!', 'Ready for another session?', [
        { text: 'Start Working', onPress: () => { setMode('work'); setSeconds(workMinutes * 60); setRunning(true); } },
        { text: 'Not yet',       style: 'cancel' },
      ]);
    }
  };

  const reset = () => {
    const base = (mode === 'work' ? workMinutes : breakMinutes) * 60;
    setRunning(false); setSeconds(base); setSessionTotal(base);
  };
  const toggle = () => {
    if (!running) setSessionTotal(seconds);
    setRunning(!running);
  };
  const switchMode = (m: Mode) => {
    const base = (m === 'work' ? workMinutes : breakMinutes) * 60;
    setRunning(false); setMode(m); setSeconds(base); setSessionTotal(base);
  };

  const startEditing = () => {
    if (running) return;
    const totalMins = Math.round(seconds / 60);
    if (totalMins >= 60) {
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      setEditValue(`${h}:${String(m).padStart(2, '0')}`);
    } else {
      setEditValue(String(totalMins));
    }
    setIsEditing(true);
  };
  const commitEdit = () => {
    const raw = editValue.trim();
    let totalSecs = 0;
    if (raw.includes(':')) {
      const parts = raw.split(':').map(p => parseInt(p) || 0);
      if (parts.length === 3) {
        totalSecs = parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else {
        totalSecs = parts[0] * 3600 + parts[1] * 60;
      }
    } else {
      totalSecs = Math.round(parseFloat(raw) * 60);
    }
    if (totalSecs > 0 && totalSecs <= 28800) { setSeconds(totalSecs); setSessionTotal(totalSecs); }
    setIsEditing(false);
  };

  const hrs            = Math.floor(seconds / 3600);
  const mins           = Math.floor((seconds % 3600) / 60);
  const secs           = seconds % 60;
  const timeLabel      = hrs > 0
    ? `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const progress       = sessionTotal > 0 ? Math.max(0, Math.min(1, (sessionTotal - seconds) / sessionTotal)) : 0;
  const R              = 112;
  const circumference  = 2 * Math.PI * R;
  const dashOffset     = circumference * (1 - progress);
  const ringColor      = mode === 'work' ? colors.primary : colors.success;
  const focusHrs       = Math.round(totalFocusMinutes / 60 * 10) / 10;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar />
      <ScrollView
        contentContainerStyle={[styles.container, Platform.OS === 'web' && { paddingTop: 54 }]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Screen title */}
        <View style={styles.titleRow}>
          <Text style={[styles.screenTitle, { color: colors.text }]}>Focus</Text>
          <TouchableOpacity
            onPress={() => setShowSettings(!showSettings)}
            style={[
              styles.settingsBtn,
              {
                backgroundColor: showSettings ? colors.primary : colors.card,
                borderColor:     showSettings ? colors.primary : colors.border,
              },
            ]}
          >
            <SlidersHorizontal size={17} color={showSettings ? '#fff' : colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Active task banner */}
        {focusTaskTitle && mode === 'work' && (
          <View style={[styles.taskBanner, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '35' }]}>
            <Brain size={14} color={colors.primary} />
            <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: colors.primary }} numberOfLines={1}>
              {focusTaskTitle}
            </Text>
            {!running && (
              <TouchableOpacity
                onPress={() => setFocusTask(null, null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={14} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Mode toggle */}
        <View style={[styles.modeRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {(['work', 'break'] as Mode[]).map(m => (
            <TouchableOpacity
              key={m}
              onPress={() => switchMode(m)}
              style={[
                styles.modeBtn,
                mode === m && { backgroundColor: m === 'work' ? colors.primary : colors.success },
              ]}
            >
              {m === 'work'
                ? <Brain  size={14} color={mode === 'work'  ? '#fff' : colors.textSecondary} />
                : <Coffee size={14} color={mode === 'break' ? '#fff' : colors.textSecondary} />}
              <Text style={[styles.modeBtnText, { color: mode === m ? '#fff' : colors.textSecondary }]}>
                {m === 'work' ? 'Focus' : 'Break'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Timer circle */}
        <View style={styles.timerWrap}>
          {Platform.OS === 'web' ? (
            <svg width="256" height="256" style={{ position: 'absolute', top: 0, left: 0 } as any}>
              <circle
                cx="128" cy="128" r={R}
                fill="none"
                stroke={colors.border}
                strokeWidth="8"
              />
              <circle
                cx="128" cy="128" r={R}
                fill="none"
                stroke={ringColor}
                strokeWidth="8"
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                transform="rotate(-90 128 128)"
                style={{ transition: 'stroke-dashoffset 0.9s ease' } as any}
              />
            </svg>
          ) : (
            <View style={[styles.outerRing, { borderColor: ringColor }]} />
          )}

          <View style={[styles.innerCircle, { backgroundColor: mode === 'work' ? colors.primaryLight : colors.success + '18' }]}>
            {isEditing ? (
              Platform.OS === 'web' ? (
                // @ts-ignore
                <input
                  type="text"
                  value={editValue}
                  onChange={(e: any) => setEditValue(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={(e: any) => e.key === 'Enter' && commitEdit()}
                  autoFocus
                  placeholder="25"
                  style={{
                    fontSize: 52, fontWeight: '800', letterSpacing: -1, textAlign: 'center',
                    color: ringColor, background: 'transparent', border: 'none', outline: 'none',
                    width: 140, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  } as any}
                />
              ) : (
                <TextInput
                  value={editValue}
                  onChangeText={setEditValue}
                  onBlur={commitEdit}
                  onSubmitEditing={commitEdit}
                  autoFocus
                  style={[styles.timerDisplay, { color: ringColor, borderBottomWidth: 2, borderBottomColor: ringColor }]}
                />
              )
            ) : (
              <TouchableOpacity onPress={startEditing} disabled={running} activeOpacity={running ? 1 : 0.7}>
                <Text style={[styles.timerDisplay, { color: mode === 'work' ? colors.primary : colors.success, fontSize: hrs > 0 ? 40 : 56 }]}>
                  {timeLabel}
                </Text>
              </TouchableOpacity>
            )}
            <Text style={[styles.timerLabel, { color: colors.textSecondary }]}>
              {isEditing ? 'mins or H:MM · enter' : mode === 'work' ? 'Focus Time' : 'Break Time'}
            </Text>
            {running && (
              <View style={[styles.progressBadge, { backgroundColor: ringColor + '20' }]}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: ringColor }}>{Math.round(progress * 100)}%</Text>
              </View>
            )}
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            onPress={reset}
            style={[styles.sideBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <RotateCcw size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={toggle}
            style={[styles.playBtn, { backgroundColor: ringColor }]}
            activeOpacity={0.85}
          >
            {running
              ? <Pause size={32} color="#fff" />
              : <Play  size={32} color="#fff" fill="#fff" />}
          </TouchableOpacity>
          {/* Pick task button (only in work mode, not running) */}
          {!running && mode === 'work' ? (
            <TouchableOpacity
              onPress={() => router.push('/tasks')}
              style={[styles.sideBtn, { backgroundColor: focusTaskId ? colors.primaryLight : colors.card, borderColor: focusTaskId ? colors.primary : colors.border }]}
            >
              <CheckCircle2 size={22} color={focusTaskId ? colors.primary : colors.textSecondary} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 52 }} />
          )}
        </View>

        {/* Pick task hint */}
        {!running && mode === 'work' && !focusTaskTitle && (
          <TouchableOpacity onPress={() => router.push('/tasks')} activeOpacity={0.7}>
            <Text style={{ fontSize: 13, color: colors.textTertiary, marginBottom: 16 }}>
              Tap <Text style={{ color: colors.primary }}>✓</Text> to choose a task to focus on
            </Text>
          </TouchableOpacity>
        )}

        {/* Settings panel */}
        {showSettings && (
          <View style={[styles.settingsPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>Work duration</Text>
            <View style={styles.durationRow}>
              {[15, 20, 25, 30, 45, 60, 90, 120].map(m => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setWorkMinutes(m)}
                  style={[
                    styles.durBtn,
                    {
                      borderColor:     workMinutes === m ? colors.primary : colors.border,
                      backgroundColor: workMinutes === m ? colors.primary : 'transparent',
                    },
                  ]}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: workMinutes === m ? '#fff' : colors.textSecondary }}>
                    {m >= 60 ? `${m / 60}h` : `${m}m`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.settingLabel, { color: colors.textSecondary, marginTop: 8 }]}>Break duration</Text>
            <View style={styles.durationRow}>
              {[5, 10, 15, 20].map(m => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setBreakMinutes(m)}
                  style={[
                    styles.durBtn,
                    {
                      borderColor:     breakMinutes === m ? colors.success : colors.border,
                      backgroundColor: breakMinutes === m ? colors.success : 'transparent',
                    },
                  ]}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: breakMinutes === m ? '#fff' : colors.textSecondary }}>
                    {m}m
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Stats */}
        <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { icon: <Flame  size={16} color={colors.warning} />, value: streak,            label: 'Day streak' },
            { icon: <Brain  size={16} color={colors.primary} />, value: sessions,          label: 'Sessions'   },
            { icon: <Zap    size={16} color={colors.success} />, value: focusHrs + 'h',    label: 'Total focus' },
            { icon: <Coffee size={16} color={colors.accent}  />, value: completedSessions, label: 'Today'      },
          ].map((s, i) => (
            <View key={i} style={[styles.statItem, i < 3 && { borderRightWidth: 0.5, borderRightColor: colors.border }]}>
              {s.icon}
              <Text style={[styles.statValue, { color: colors.text }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Session dots */}
        {completedSessions > 0 && (
          <View style={styles.dotsRow}>
            <Text style={[styles.dotsLabel, { color: colors.textTertiary }]}>Today's sessions</Text>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
              {Array.from({ length: Math.min(completedSessions, 8) }).map((_, i) => (
                <View key={i} style={[styles.dot, { backgroundColor: colors.primary }]} />
              ))}
              {completedSessions > 8 && (
                <Text style={{ fontSize: 11, color: colors.textTertiary }}>+{completedSessions - 8}</Text>
              )}
            </View>
          </View>
        )}

        {/* Weekly analytics */}
        {sessionLog.length > 0 && (() => {
          const days  = last7Days();
          const byDay: Record<string, number> = {};
          const byLabel: Record<string, number> = {};
          for (const e of sessionLog) {
            byDay[e.date]   = (byDay[e.date]   || 0) + e.minutes;
            byLabel[e.label]= (byLabel[e.label] || 0) + e.minutes;
          }
          const maxMins = Math.max(...days.map(d => byDay[d] || 0), 1);
          const topSubjects = Object.entries(byLabel)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4);
          return (
            <View style={[styles.analyticsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 14 }}>
                <BarChart2 size={14} color={colors.primary} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Last 7 Days</Text>
              </View>
              {/* Bar chart */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 60, marginBottom: 6 }}>
                {days.map(d => {
                  const mins = byDay[d] || 0;
                  const h    = Math.max(3, (mins / maxMins) * 56);
                  return (
                    <View key={d} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                      <View style={{ width: '100%', height: h, borderRadius: 5, backgroundColor: d === days[6] ? colors.primary : colors.primary + '55' }} />
                    </View>
                  );
                })}
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {days.map(d => (
                  <View key={d} style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontSize: 9, color: colors.textTertiary }}>{dayLabel(d)}</Text>
                  </View>
                ))}
              </View>
              {/* Subject breakdown */}
              {topSubjects.length > 0 && (
                <View style={{ marginTop: 14, gap: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Top Subjects (30 days)</Text>
                  {topSubjects.map(([label, mins]) => {
                    const pct = mins / (topSubjects[0][1] || 1);
                    return (
                      <View key={label} style={{ gap: 3 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 12, color: colors.text, fontWeight: '500' }} numberOfLines={1}>{label}</Text>
                          <Text style={{ fontSize: 12, color: colors.textTertiary }}>{Math.round(mins / 60 * 10) / 10}h</Text>
                        </View>
                        <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.border }}>
                          <View style={{ height: 4, borderRadius: 2, width: `${pct * 100}%` as any, backgroundColor: colors.primary }} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })()}

        <View style={{ height: 100 }} />
      </ScrollView>
      <TabBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:  { alignItems: 'center', padding: 20, paddingTop: 4 },
  titleRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 12 },
  screenTitle:{ fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  settingsBtn:{ width: 40, height: 40, borderRadius: 13, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },

  taskBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    width: '100%', borderRadius: 14, borderWidth: 0.5,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14,
  },

  modeRow: {
    flexDirection: 'row', borderRadius: 16, borderWidth: 0.5,
    padding: 4, marginBottom: 32, width: '100%', maxWidth: 300,
  },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 13,
  },
  modeBtnText: { fontSize: 14, fontWeight: '600' },

  timerWrap:   { width: 256, height: 256, alignItems: 'center', justifyContent: 'center', position: 'relative', marginBottom: 36 },
  outerRing:   { position: 'absolute', width: 256, height: 256, borderRadius: 128, borderWidth: 8 },
  innerCircle: { width: 208, height: 208, borderRadius: 104, alignItems: 'center', justifyContent: 'center' },
  timerDisplay:{ fontSize: 56, fontWeight: '800', letterSpacing: 2 },
  timerLabel:  { fontSize: 13, marginTop: 4 },
  progressBadge:{ marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },

  controls:  { flexDirection: 'row', alignItems: 'center', gap: 28, marginBottom: 10 },
  sideBtn:   { width: 52, height: 52, borderRadius: 26, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  playBtn:   { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 6 },

  settingsPanel: { width: '100%', borderRadius: 18, borderWidth: 0.5, padding: 16, marginBottom: 20 },
  settingLabel:  { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  durationRow:   { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  durBtn:        { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },

  statsRow: {
    flexDirection: 'row', width: '100%', borderRadius: 20, borderWidth: 0.5, overflow: 'hidden', marginBottom: 20,
  },
  statItem:  { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 4 },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10 },

  dotsRow:  { alignItems: 'center', gap: 10, marginBottom: 20 },
  dotsLabel:{ fontSize: 12, fontWeight: '500' },
  dot:      { width: 10, height: 10, borderRadius: 5 },

  analyticsCard: { width: '100%', borderRadius: 20, borderWidth: 0.5, padding: 16, marginBottom: 20 },
});
