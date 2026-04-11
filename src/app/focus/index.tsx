import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Platform, Vibration, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Play, Pause, RotateCcw, SlidersHorizontal, Coffee, Brain, Flame, Zap } from 'lucide-react-native';
import { useFocusStore } from '../../store/focus';
import TabBar from '../../components/layout/TabBar';
import { useColors } from '../../lib/theme';
import { showAlert } from '../../utils/helpers';

type Mode = 'work' | 'break';

export default function FocusScreen() {
  const colors = useColors();
  const { workMinutes, breakMinutes, sessions, totalFocusMinutes, streak, setWorkMinutes, setBreakMinutes, recordSession } = useFocusStore();
  const [mode,               setMode]               = useState<Mode>('work');
  const [running,            setRunning]            = useState(false);
  const [seconds,            setSeconds]            = useState(workMinutes * 60);
  const [showSettings,       setShowSettings]       = useState(false);
  const [completedSessions,  setCompletedSessions]  = useState(0);
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
      showAlert('Session complete! 🎉', 'Great work. Time for a break.', [
        { text: 'Start Break', onPress: () => { setMode('break'); setSeconds(breakMinutes * 60); setRunning(true); } },
        { text: 'Skip',        style: 'cancel', onPress: () => { setMode('work'); setSeconds(workMinutes * 60); } },
      ]);
    } else {
      showAlert('Break over!', 'Ready for another session?', [
        { text: 'Start Working', onPress: () => { setMode('work'); setSeconds(workMinutes * 60); setRunning(true); } },
        { text: 'Not yet',       style: 'cancel' },
      ]);
    }
  };

  const reset      = () => { setRunning(false); setSeconds((mode === 'work' ? workMinutes : breakMinutes) * 60); };
  const toggle     = () => setRunning(!running);
  const switchMode = (m: Mode) => { setRunning(false); setMode(m); setSeconds((m === 'work' ? workMinutes : breakMinutes) * 60); };

  const mins           = Math.floor(seconds / 60);
  const secs           = seconds % 60;
  const totalSeconds   = (mode === 'work' ? workMinutes : breakMinutes) * 60;
  const progress       = totalSeconds > 0 ? (totalSeconds - seconds) / totalSeconds : 0;
  const R              = 112;
  const circumference  = 2 * Math.PI * R;
  const dashOffset     = circumference * (1 - progress);
  const ringColor      = mode === 'work' ? colors.primary : colors.success;
  const focusHrs       = Math.round(totalFocusMinutes / 60 * 10) / 10;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={[styles.container]}
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
            <Text style={[styles.timerDisplay, { color: mode === 'work' ? colors.primary : colors.success }]}>
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </Text>
            <Text style={[styles.timerLabel, { color: colors.textSecondary }]}>
              {mode === 'work' ? 'Focus Time' : 'Break Time'}
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
          <View style={{ width: 52 }} />
        </View>

        {/* Settings panel */}
        {showSettings && (
          <View style={[styles.settingsPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>Work duration</Text>
            <View style={styles.durationRow}>
              {[15, 20, 25, 30, 45, 60].map(m => (
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
                    {m}m
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

        <View style={{ height: 100 }} />
      </ScrollView>
      <TabBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:  { alignItems: 'center', padding: 20, paddingTop: 4 },
  titleRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 20 },
  screenTitle:{ fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  settingsBtn:{ width: 40, height: 40, borderRadius: 13, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },

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

  controls:  { flexDirection: 'row', alignItems: 'center', gap: 28, marginBottom: 24 },
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

  dotsRow:  { alignItems: 'center', gap: 10 },
  dotsLabel:{ fontSize: 12, fontWeight: '500' },
  dot:      { width: 10, height: 10, borderRadius: 5 },
});
