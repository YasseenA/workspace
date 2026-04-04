import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Play, Pause, RotateCcw, Settings, Coffee, Brain, Flame } from 'lucide-react-native';
import { useFocusStore } from '../../store/focus';
import { Card, Button } from '../../components/ui';
import { colors } from '../../lib/theme';

type Mode = 'work' | 'break';

export default function FocusScreen() {
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
    Vibration.vibrate([500, 200, 500]);
    if (mode === 'work') {
      recordSession(workMinutes);
      setCompletedSessions(c => c + 1);
      Alert.alert('Work session complete! 🎉', 'Time for a break.', [
        { text: 'Start Break', onPress: () => { setMode('break'); setSeconds(breakMinutes * 60); setRunning(true); } },
        { text: 'Skip', onPress: () => { setMode('work'); setSeconds(workMinutes * 60); } }
      ]);
    } else {
      Alert.alert('Break over!', 'Ready for another session?', [
        { text: 'Start Working', onPress: () => { setMode('work'); setSeconds(workMinutes * 60); setRunning(true); } },
        { text: 'Not yet' }
      ]);
    }
  };

  const reset = () => { setRunning(false); setSeconds((mode === 'work' ? workMinutes : breakMinutes) * 60); };
  const toggle = () => setRunning(!running);
  const switchMode = (m: Mode) => { setRunning(false); setMode(m); setSeconds((m === 'work' ? workMinutes : breakMinutes) * 60); };

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const totalSeconds = (mode === 'work' ? workMinutes : breakMinutes) * 60;
  const progress = (totalSeconds - seconds) / totalSeconds;
  const circumference = 2 * Math.PI * 110;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Focus Timer</Text>

        {/* Mode toggle */}
        <View style={styles.modeRow}>
          <TouchableOpacity onPress={() => switchMode('work')} style={[styles.modeBtn, mode === 'work' && styles.modeBtnActive]}>
            <Brain size={14} color={mode === 'work' ? '#fff' : colors.textSecondary} />
            <Text style={[styles.modeBtnText, mode === 'work' && styles.modeBtnTextActive]}>Work</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => switchMode('break')} style={[styles.modeBtn, mode === 'break' && { backgroundColor: colors.success, borderColor: colors.success }]}>
            <Coffee size={14} color={mode === 'break' ? '#fff' : colors.textSecondary} />
            <Text style={[styles.modeBtnText, mode === 'break' && styles.modeBtnTextActive]}>Break</Text>
          </TouchableOpacity>
        </View>

        {/* Timer circle */}
        <View style={styles.timerWrap}>
          <View style={styles.svgWrap}>
            {/* Background circle using View */}
            <View style={[styles.outerRing, { borderColor: colors.border }]} />
            <View style={[styles.innerCircle, { backgroundColor: mode === 'work' ? colors.primaryLight : '#d1fae5' }]}>
              <Text style={[styles.timerText, { color: mode === 'work' ? colors.primary : colors.success }]}>
                {String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}
              </Text>
              <Text style={styles.timerMode}>{mode === 'work' ? 'Focus Time' : 'Break Time'}</Text>
            </View>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity onPress={reset} style={styles.iconControl}>
            <RotateCcw size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={toggle} style={[styles.playBtn, { backgroundColor: mode === 'work' ? colors.primary : colors.success }]}>
            {running ? <Pause size={30} color="#fff" /> : <Play size={30} color="#fff" fill="#fff" />}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowSettings(!showSettings)} style={styles.iconControl}>
            <Settings size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Settings panel */}
        {showSettings && (
          <Card style={styles.settingsCard}>
            <Text style={styles.settingTitle}>Work duration</Text>
            <View style={styles.settingRow}>
              {[15,20,25,30,45,60].map(m => (
                <TouchableOpacity key={m} onPress={() => setWorkMinutes(m)} style={[styles.durBtn, workMinutes === m && styles.durBtnActive]}>
                  <Text style={[styles.durText, workMinutes === m && { color: '#fff' }]}>{m}m</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.settingTitle}>Break duration</Text>
            <View style={styles.settingRow}>
              {[5,10,15,20].map(m => (
                <TouchableOpacity key={m} onPress={() => setBreakMinutes(m)} style={[styles.durBtn, breakMinutes === m && { backgroundColor: colors.success, borderColor: colors.success }]}>
                  <Text style={[styles.durText, breakMinutes === m && { color: '#fff' }]}>{m}m</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        )}

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Flame size={18} color={colors.warning} />
            <Text style={styles.statValue}>{streak}</Text>
            <Text style={styles.statLabel}>Day streak</Text>
          </View>
          <View style={styles.statItem}>
            <Brain size={18} color={colors.primary} />
            <Text style={styles.statValue}>{sessions}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.statItem}>
            <Coffee size={18} color={colors.success} />
            <Text style={styles.statValue}>{Math.round(totalFocusMinutes / 60 * 10) / 10}h</Text>
            <Text style={styles.statLabel}>Total focus</Text>
          </View>
          <View style={styles.statItem}>
            <Play size={18} color={colors.accent} />
            <Text style={styles.statValue}>{completedSessions}</Text>
            <Text style={styles.statLabel}>Today</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, alignItems: 'center', padding: 24, paddingTop: 8 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 16 },
  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 32 },
  modeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff' },
  modeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  modeBtnText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  modeBtnTextActive: { color: '#fff' },
  timerWrap: { marginBottom: 32 },
  svgWrap: { width: 240, height: 240, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  outerRing: { position: 'absolute', width: 240, height: 240, borderRadius: 120, borderWidth: 4 },
  innerCircle: { width: 200, height: 200, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  timerText: { fontSize: 52, fontWeight: '800', letterSpacing: 2 },
  timerMode: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 24, marginBottom: 24 },
  iconControl: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', borderWidth: 0.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  playBtn: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6 },
  settingsCard: { width: '100%', marginBottom: 16 },
  settingTitle: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 },
  settingRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  durBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff' },
  durBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  durText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  stats: { flexDirection: 'row', gap: 20, marginTop: 8 },
  statItem: { alignItems: 'center', gap: 4 },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textTertiary },
  dots: { flexDirection: 'row', gap: 6, marginTop: 16 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
