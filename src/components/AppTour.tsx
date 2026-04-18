import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import {
  MessageCircle, BookOpen, CheckSquare, Timer, Brain,
  GraduationCap, Sparkles, Layers, Calendar, ArrowRight
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOUR_KEY = 'workspace_tour_complete';
const { width: W, height: H } = Dimensions.get('window');

interface TourStep {
  title: string;
  description: string;
  icon: any;
  iconColor: string;
  route?: string;
}

const STEPS: TourStep[] = [
  {
    title: 'Study Buddy',
    description: 'Your AI study companion. Ask questions, get explanations, and work through problems together.',
    icon: MessageCircle,
    iconColor: '#7c3aed',
    route: '/study-buddy',
  },
  {
    title: 'Canvas Integration',
    description: 'Connect your Canvas LMS to see courses, assignments, grades, and submit work — all from Workspace.',
    icon: GraduationCap,
    iconColor: '#e74c3c',
    route: '/canvas',
  },
  {
    title: 'Notes',
    description: 'Rich notes with images, drawings, and notebooks. Your thoughts, organized and synced.',
    icon: BookOpen,
    iconColor: '#3b82f6',
    route: '/notes',
  },
  {
    title: 'Tasks',
    description: 'Track your to-dos with priorities, due dates, and Canvas assignment imports.',
    icon: CheckSquare,
    iconColor: '#10b981',
    route: '/tasks',
  },
  {
    title: 'Focus Timer',
    description: 'Pomodoro-style sessions to stay productive. Track your focus streaks and study hours.',
    icon: Timer,
    iconColor: '#f59e0b',
    route: '/focus',
  },
  {
    title: 'Flashcards',
    description: 'Create decks and review with spaced repetition. AI can generate cards from your notes.',
    icon: Brain,
    iconColor: '#ec4899',
    route: '/flashcards',
  },
  {
    title: 'AI Studio',
    description: 'Claude and GPT at your fingertips. Summarize readings, brainstorm essays, or debug code.',
    icon: Sparkles,
    iconColor: '#8b5cf6',
    route: '/ai-studio',
  },
  {
    title: 'Calendar',
    description: 'See all your deadlines in one view. Canvas assignments auto-populate here.',
    icon: Calendar,
    iconColor: '#06b6d4',
    route: '/calendar',
  },
];

export default function AppTour({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const router = useRouter();
  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      finish();
    } else {
      setStep(s => s + 1);
    }
  };

  const finish = async () => {
    if (Platform.OS === 'web') {
      try { localStorage.setItem(TOUR_KEY, '1'); } catch {}
    } else {
      await AsyncStorage.setItem(TOUR_KEY, '1');
    }
    onComplete();
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        {/* Progress dots */}
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === step ? current.iconColor : 'rgba(255,255,255,0.2)' },
                i === step && { width: 20 },
              ]}
            />
          ))}
        </View>

        {/* Icon */}
        <View style={[styles.iconBox, { backgroundColor: current.iconColor + '20' }]}>
          <Icon size={36} color={current.iconColor} />
        </View>

        {/* Content */}
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.desc}>{current.description}</Text>

        {/* Step counter */}
        <Text style={styles.counter}>{step + 1} of {STEPS.length}</Text>

        {/* Buttons */}
        <View style={styles.btns}>
          <TouchableOpacity onPress={finish} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip Tour</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleNext}
            style={[styles.nextBtn, { backgroundColor: current.iconColor }]}
          >
            <Text style={styles.nextText}>{isLast ? 'Get Started' : 'Next'}</Text>
            <ArrowRight size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export async function shouldShowTour(): Promise<boolean> {
  if (Platform.OS === 'web') {
    try { return !localStorage.getItem(TOUR_KEY); } catch { return false; }
  }
  const v = await AsyncStorage.getItem(TOUR_KEY);
  return !v;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    ...(Platform.OS === 'web' ? { position: 'fixed' as any } : {}),
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 24,
    padding: 32,
    width: Math.min(W - 48, 380),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  dots: { flexDirection: 'row', gap: 6, marginBottom: 28 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  iconBox: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 10, textAlign: 'center' },
  desc: { fontSize: 15, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  counter: { fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 24 },
  btns: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%' },
  skipBtn: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  skipText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '500' },
  nextBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 14 },
  nextText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
