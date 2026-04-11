import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BookOpen, CheckSquare, Zap, Timer, Link2, ArrowRight, ChevronLeft } from 'lucide-react-native';
import { useAuthStore } from '../../store/auth';
import { useColors } from '../../lib/theme';

const STEPS = [
  {
    icon:     BookOpen,
    title:    'Smart Notes',
    desc:     'Take notes, tag them, organize by class, and use AI to summarize or generate study guides instantly.',
    color:    '#7c3aed',
    features: ['Rich text editor', 'AI summarization', 'Tag & organize'],
  },
  {
    icon:     CheckSquare,
    title:    'Task Manager',
    desc:     'Manage assignments, set priorities, and never miss a deadline — synced directly from Canvas LMS.',
    color:    '#10b981',
    features: ['Canvas sync', 'Priority levels', 'Due date tracking'],
  },
  {
    icon:     Link2,
    title:    'Canvas Integration',
    desc:     'Connect your Canvas account to automatically pull in all your assignments and courses.',
    color:    '#f59e0b',
    features: ['Live assignment sync', 'Course overview', 'Grade tracking'],
  },
  {
    icon:     Zap,
    title:    'AI Studio',
    desc:     'Powered by Claude — summarize notes, create flashcards, generate quizzes, and improve your writing.',
    color:    '#7c3aed',
    features: ['7 AI tools', 'Drag & drop files', 'Interactive quizzes'],
  },
  {
    icon:     Timer,
    title:    'Focus Timer',
    desc:     'Beat procrastination with Pomodoro sessions. Track your study streak and total focus hours.',
    color:    '#ec4899',
    features: ['Pomodoro timer', 'Study streak', 'Session tracking'],
  },
];

export default function OnboardingScreen() {
  const [step, setStep]  = useState(0);
  const router           = useRouter();
  const colors           = useColors();
  const { completeOnboarding } = useAuthStore();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const finish = () => { completeOnboarding(); router.replace('/home'); };

  const goTo = (next: number, direction: 1 | -1 = 1) => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 0,              duration: 120, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -30 * direction, duration: 120, useNativeDriver: true }),
    ]).start(() => {
      setStep(next);
      slideAnim.setValue(30 * direction);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  };

  const s      = STEPS[step];
  const Icon   = s.icon;
  const isLast = step === STEPS.length - 1;

  const gradientStyle: any =
    Platform.OS === 'web'
      ? { background: `linear-gradient(145deg, ${s.color}22, ${s.color}08)` }
      : { backgroundColor: s.color + '18' };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, justifyContent: 'space-between' }}>

        {/* Top bar */}
        <View style={styles.topBar}>
          {step > 0 ? (
            <TouchableOpacity onPress={() => goTo(step - 1, -1)} style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ChevronLeft size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 36 }} />
          )}

          {/* Step counter */}
          <View style={[styles.stepPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>{step + 1} / {STEPS.length}</Text>
          </View>

          <TouchableOpacity onPress={finish} style={{ width: 36, alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 14, color: colors.textTertiary, fontWeight: '500' }}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <Animated.View
          style={[
            styles.content,
            { opacity: fadeAnim, transform: [{ translateX: slideAnim }] },
          ]}
        >
          {/* Icon container */}
          <View style={[styles.iconContainer, gradientStyle]}>
            <View style={[styles.iconRing, { borderColor: s.color + '40' }]}>
              <View style={[styles.iconInner, { backgroundColor: s.color + '20' }]}>
                <Icon size={52} color={s.color} strokeWidth={1.5} />
              </View>
            </View>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{s.title}</Text>
          <Text style={[styles.desc, { color: colors.textSecondary }]}>{s.desc}</Text>

          {/* Feature chips */}
          <View style={styles.chips}>
            {s.features.map((f, i) => (
              <View
                key={i}
                style={[styles.chip, { backgroundColor: s.color + '18', borderColor: s.color + '35' }]}
              >
                <View style={[styles.chipDot, { backgroundColor: s.color }]} />
                <Text style={[styles.chipText, { color: s.color }]}>{f}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Progress dots */}
        <View style={styles.dots}>
          {STEPS.map((st, i) => (
            <TouchableOpacity key={i} onPress={() => goTo(i, i > step ? 1 : -1)}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: i === step ? s.color : colors.border },
                  i === step && { width: 24 },
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* CTA */}
        <View style={{ paddingHorizontal: 24, paddingBottom: 40 }}>
          <TouchableOpacity
            onPress={isLast ? finish : () => goTo(step + 1)}
            style={[styles.cta, { backgroundColor: s.color }]}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaText}>{isLast ? 'Get Started' : 'Continue'}</Text>
            <ArrowRight size={18} color="#fff" />
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12, borderWidth: 0.5,
    alignItems: 'center', justifyContent: 'center',
  },
  stepPill: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 0.5,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 160, height: 160, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 36,
  },
  iconRing: {
    width: 136, height: 136, borderRadius: 40,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  iconInner: {
    width: 104, height: 104, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
  },
  title:   { fontSize: 30, fontWeight: '800', textAlign: 'center', marginBottom: 14, letterSpacing: -0.5 },
  desc:    { fontSize: 16, textAlign: 'center', lineHeight: 26, maxWidth: 320 },
  chips:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 28, justifyContent: 'center' },
  chip:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText:{ fontSize: 12, fontWeight: '600' },
  dots:    { flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 16 },
  dot:     { width: 8, height: 8, borderRadius: 4, transition: 'all 0.2s' } as any,
  cta:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 17, borderRadius: 20 },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.1 },
});
