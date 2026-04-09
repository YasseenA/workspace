import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Play, Pause, RotateCcw, Settings, Coffee, Brain, Flame } from 'lucide-react-native';
import { useFocusStore } from '../../store/focus';
import { Card, Button } from '../../components/ui';
import TabBar from '../../components/layout/TabBar';
import { useColors, colors } from '../../lib/theme';
import { showAlert } from '../../utils/helpers';

type Mode = 'work' | 'break';

export default function FocusScreen() {
  const colors = useColors();
  const { workMinutes, breakMinutes, sessions, totalFocusMinutes, streak, setWorkMinutes, setBreakMinutes, recordSession } = useFocusStore();
  const [mode, setMode] = useState<Mode>('work');
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(workMinutes * 60);
  const [showSettings, setShowSettings] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
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
      recordSession(workMinutes);
      setCompletedSessions(c => c + 1);
      showAlert('Work session complete! 🎉', 'Time for a break.', [
        { text: 'Start Break', onPress: () => { setMode('break'); setSeconds(breakMinutes * 60); setRunning(true); } },
        { text: 'Skip', style: 'cancel', onPress: () => { setMode('work'); setSeconds(workMinutes * 60); } }
      ]);
    } else {
      showAlert('Break over!', 'Ready for another session?', [
        { text: 'Start Working', onPress: () => { setMode('work'); setSeconds(workMinutes * 60); setRunning(true); } },
        { text: 'Not yet', style: 'cancel' }
      ]);
    }
  };

  const reset = () => { setRunning(false); setSeconds((mode === 'work' ? workMinutes : breakMinutes) * 60); };
  const toggle = () => setRunning(!running);
  const switchMode = (m: Mode) => { setRunning(false); setMode(m); setSeconds((m === 'work' ? workMinutes : breakMinutes) * 60); };

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const totalSeconds = (mode === 'work' ? workMinutes : breakMinutes) * 60;
  const progress = totalSeconds > 0 ? (totalSeconds - seconds) / totalSeconds : 0;
  const R = 110;
  const circumference = 2 * Math.PI * R;
  const strokeDashoffset = circumference * (1 - progress);
  const ringColor = mode === 'work' ? colors.primary : colors.success;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <Text style={[styles.title, { color: colors.text }]}>Focus Timer</Text>

        {/* Mode toggle */}
        <View style={styles.modeRow}>
          <TouchableOpacity onPress={() => switchMode('work')}
            style={[styles.modeBtn, { backgroundColor: mode === 'work' ? colors.primary : colors.card, borderColor: mode === 'work' ? colors.primary : colors.border }]}>
            <Brain size={14} color={mode === 'work' ? '#fff' : colors.textSecondary} />
            <Text style={[styles.modeBtnText, { color: mode === 'work' ? '#fff' : colors.textSecondary }]}>Work</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => switchMode('break')}
            style={[styles.modeBtn, { backgroundColor: mode === 'break' ? colors.success : colors.card, borderColor: mode === 'break' ? colors.success : colors.border }]}>
            <Coffee size={14} color={mode === 'break' ? '#fff' : colors.textSecondary} />
            <Text style={[styles.modeBtnText, { color: mode === 'break' ? '#fff' : colors.textSecondary }]}>Break</Text>
          </TouchableOpacity>
        </View>

        {/* Timer circle */}
        <View style={styles.timerWrap}>
          <View style={styles.svgWrap}>
            {/* SVG progress ring (web) or border ring (native) */}
            {Platform.OS === 'web' ? (
              <svg
                width="240"
                height="240"
                style={{ position: 'absolute', top: 0, left: 0 } as any}
              >
                <circle
                  cx="120" cy="120" r={R}
                  fill="none"
                  stroke={colors.border}
                  strokeWidth="6"
                />
                <circle
                  cx="120" cy="120" r={R}
                  fill="none"
                  stroke={ringColor}
                  strokeWidth="6"
                  strokeDasharray={`${circumference} ${circumference}`}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  transform="rotate(-90 120 120)"
                  style={{ transition: 'stroke-dashoffset 0.8s ease' } as any}
                />
              </svg>
            ) : (
              <View style={[styles.outerRing, { borderColor: ringColor }]} />
            )}

            <View style={[styles.innerCircle, { backgroundColor: mode === 'work' ? colors.primaryLight : colors.success + '20' }]}>
              <Text style={[styles.timerText, { color: mode === 'work' ? colors.primary : colors.success }]}>
                {String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}
              </Text>
              <Text style={[styles.timerMode, { color: colors.textSecondary }]}>{mode === 'work' ? 'Focus Time' : 'Break Time'}</Text>
              {running && (
                <Text style={[styles.progressPct, { color: ringColor }]}>{Math.round(progress * 100)}%</Text>
              )}
            </View>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity onPress={reset} style={[styles.iconControl, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <RotateCcw size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={toggle} style={[styles.playBtn, { backgroundColor: mode === 'work' ? colors.primary : colors.success }]}>
            {running ? <Pause size={30} color="#fff" /> : <Play size={30} color="#fff" fill="#fff" />}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowSettings(!showSettings)} style={[styles.iconControl, { backgroundColor: showSettings ? colors.primaryLight : colors.card, borderColor: colors.border }]}>
            <Settings size={22} color={showSettings ? colors.primary : colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Settings panel */}
        {showSettings && (
          <Card style={styles.settingsCard}>
            <Text style={[styles.settingTitle, { color: colors.textSecondary }]}>Work duration</Text>
            <View style={styles.settingRow}>
              {[15,20,25,30,45,60].map(m => (
                <TouchableOpacity key={m} onPress={() => setWorkMinutes(m)}
                  style={[styles.durBtn, { borderColor: workMinutes === m ? colors.primary : colors.border, backgroundColor: workMinutes === m ? colors.primary : colors.card }]}>
                  <Text style={[styles.durText, { color: workMinutes === m ? '#fff' : colors.textSecondary }]}>{m}m</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.settingTitle, { color: colors.textSecondary }]}>Break duration</Text>
            <View style={styles.settingRow}>
              {[5,10,15,20].map(m => (
                <TouchableOpacity key={m} onPress={() => setBreakMinutes(m)}
                  style={[styles.durBtn, { borderColor: breakMinutes === m ? colors.success : colors.border, backgroundColor: breakMinutes === m ? colors.success : colors.card }]}>
                  <Text style={[styles.durText, { color: breakMinutes === m ? '#fff' : colors.textSecondary }]}>{m}m</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        )}

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Flame size={18} color={colors.warning} />
            <Text style={[styles.statValue, { color: colors.text }]}>{streak}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Day streak</Text>
          </View>
          <View style={styles.statItem}>
            <Brain size={18} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>{sessions}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Sessions</Text>
          </View>
          <View style={styles.statItem}>
            <Coffee size={18} color={colors.success} />
            <Text style={[styles.statValue, { color: colors.text }]}>{Math.round(totalFocusMinutes / 60 * 10) / 10}h</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Total focus</Text>
          </View>
          <View style={styles.statItem}>
            <Play size={18} color={colors.accent} />
            <Text style={[styles.statValue, { color: colors.text }]}>{completedSessions}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Today</Text>
          </View>
        </View>

        {/* Session dots */}
        {completedSessions > 0 && (
          <View style={styles.dots}>
            {Array.from({ length: Math.min(completedSessions, 8) }).map((_, i) => (
              <View key={i} style={[styles.dot, { backgroundColor: colors.primary }]} />
            ))}
          </View>
        )}
      </View>
      <TabBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, alignItems: 'center', padding: 24, paddingTop: 8, paddingBottom: 80 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 16 },
  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 32 },
  modeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  modeBtnText: { fontSize: 13, fontWeight: '600' },
  timerWrap: { marginBottom: 32 },
  svgWrap: { width: 240, height: 240, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  outerRing: { position: 'absolute', width: 240, height: 240, borderRadius: 120, borderWidth: 6 },
  innerCircle: { width: 200, height: 200, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  timerText: { fontSize: 52, fontWeight: '800', letterSpacing: 2 },
  timerMode: { fontSize: 13, marginTop: 4 },
  progressPct: { fontSize: 11, fontWeight: '600', marginTop: 4 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 24, marginBottom: 24 },
  iconControl: { width: 48, height: 48, borderRadius: 24, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  playBtn: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6 },
  settingsCard: { width: '100%', marginBottom: 16 },
  settingTitle: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  settingRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  durBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  durText: { fontSize: 13, fontWeight: '500' },
  stats: { flexDirection: 'row', gap: 20, marginTop: 8 },
  statItem: { alignItems: 'center', gap: 4 },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11 },
  dots: { flexDirection: 'row', gap: 6, marginTop: 16 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
