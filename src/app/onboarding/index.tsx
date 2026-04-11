import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BookOpen, CheckSquare, Zap, Timer, Link2, ArrowRight } from 'lucide-react-native';
import { useAuthStore } from '../../store/auth';
import { useColors } from '../../lib/theme';

const STEPS = [
  {
    icon: BookOpen,
    title: 'Smart Notes',
    desc: 'Take notes, tag them, organize by class, and use AI to summarize or generate study guides instantly.',
    color: '#6366f1',
    features: ['Rich text editor', 'AI summarization', 'Tag & organize'],
  },
  {
    icon: CheckSquare,
    title: 'Task Manager',
    desc: 'Manage assignments, set priorities, and never miss a deadline — synced directly from Canvas LMS.',
    color: '#10b981',
    features: ['Canvas sync', 'Priority levels', 'Due date tracking'],
  },
  {
    icon: Link2,
    title: 'Canvas Integration',
    desc: 'Connect your Bellevue College Canvas account to automatically pull in all your assignments and courses.',
    color: '#f59e0b',
    features: ['Live assignment sync', 'Course overview', 'Grade tracking'],
  },
  {
    icon: Zap,
    title: 'AI Studio',
    desc: 'Powered by Claude — summarize notes, create flashcards, generate quizzes, and improve your writing.',
    color: '#8b5cf6',
    features: ['7 AI tools', 'Drag & drop files', 'Interactive quizzes'],
  },
  {
    icon: Timer,
    title: 'Focus Timer',
    desc: 'Beat procrastination with Pomodoro sessions. Track your study streak and total focus hours.',
    color: '#ec4899',
    features: ['Pomodoro timer', 'Study streak', 'Session tracking'],
  },
];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const router = useRouter();
  const colors = useColors();
  const { completeOnboarding } = useAuthStore();
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const finish = () => { completeOnboarding(); router.replace('/home'); };

  const goTo = (next: number) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setStep(next);
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  const s = STEPS[step];
  const Icon = s.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, justifyContent: 'space-between' }}>

        {/* Skip */}
        <View style={{ paddingHorizontal: 24, paddingTop: 16, flexDirection: 'row', justifyContent: 'flex-end' }}>
          <TouchableOpacity onPress={finish}>
            <Text style={{ fontSize: 14, color: colors.textSecondary, fontWeight: '500' }}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <Animated.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, opacity: fadeAnim }}>
          {/* Icon */}
          <View style={[styles.iconOuter, { backgroundColor: s.color + '15', shadowColor: s.color }]}>
            <View style={[styles.iconInner, { backgroundColor: s.color + '25' }]}>
              <Icon size={48} color={s.color} strokeWidth={1.5} />
            </View>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{s.title}</Text>
          <Text style={[styles.desc, { color: colors.textSecondary }]}>{s.desc}</Text>

          {/* Feature chips */}
          <View style={styles.chips}>
            {s.features.map((f, i) => (
              <View key={i} style={[styles.chip, { backgroundColor: s.color + '15', borderColor: s.color + '30' }]}>
                <Text style={[styles.chipText, { color: s.color }]}>{f}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Step dots */}
        <View style={styles.dots}>
          {STEPS.map((st, i) => (
            <TouchableOpacity key={i} onPress={() => goTo(i)}>
              <View style={[styles.dot,
                { backgroundColor: i === step ? s.color : colors.border },
                i === step && styles.dotActive
              ]} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Actions */}
        <View style={{ padding: 24, paddingBottom: 40, gap: 12 }}>
          <TouchableOpacity
            onPress={isLast ? finish : () => goTo(step + 1)}
            style={[styles.primaryBtn, { backgroundColor: s.color }]}>
            <Text style={styles.primaryBtnText}>{isLast ? 'Get Started' : 'Next'}</Text>
            <ArrowRight size={18} color="#fff" />
          </TouchableOpacity>

          {step > 0 && (
            <TouchableOpacity onPress={() => goTo(step - 1)} style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: colors.textSecondary }}>Back</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  iconOuter: { width: 140, height: 140, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 32, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  iconInner: { width: 100, height: 100, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  title:     { fontSize: 30, fontWeight: '800', textAlign: 'center', marginBottom: 14 },
  desc:      { fontSize: 16, textAlign: 'center', lineHeight: 25, maxWidth: 320 },
  chips:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 24, justifyContent: 'center' },
  chip:      { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipText:  { fontSize: 12, fontWeight: '600' },
  dots:      { flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 8 },
  dot:       { width: 8, height: 8, borderRadius: 4 },
  dotActive: { width: 28 },
  primaryBtn:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
