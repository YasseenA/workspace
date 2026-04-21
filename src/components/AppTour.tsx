import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import {
  MessageCircle, BookOpen, CheckSquare, Timer, Brain,
  GraduationCap, Sparkles, Calendar, ArrowRight, ChevronRight
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOUR_KEY = 'workspace_tour_complete';
const { width: W } = Dimensions.get('window');

interface TourStep {
  message: string;
  feature: string;
  icon: any;
  iconColor: string;
}

const STEPS: TourStep[] = [
  {
    message: "Hey! I'm Study Buddy, your AI study companion. Let me show you around Workspace real quick!",
    feature: 'Study Buddy',
    icon: MessageCircle,
    iconColor: '#7c3aed',
  },
  {
    message: "First things first — connect your Canvas account. This pulls in all your courses, assignments, grades, and deadlines automatically. The app works best with Canvas connected!",
    feature: 'Canvas Integration',
    icon: GraduationCap,
    iconColor: '#e74c3c',
  },
  {
    message: "Your notes live here. Rich text, images, drawings, notebooks — everything syncs across your devices.",
    feature: 'Notes',
    icon: BookOpen,
    iconColor: '#3b82f6',
  },
  {
    message: "Tasks keep you on track. Set priorities, due dates, and even import assignments straight from Canvas.",
    feature: 'Tasks',
    icon: CheckSquare,
    iconColor: '#10b981',
  },
  {
    message: "Need to lock in? The Focus Timer runs Pomodoro sessions and tracks your study streaks.",
    feature: 'Focus Timer',
    icon: Timer,
    iconColor: '#f59e0b',
  },
  {
    message: "Flashcards use spaced repetition so you actually remember what you study. I can even generate cards from your notes!",
    feature: 'Flashcards',
    icon: Brain,
    iconColor: '#ec4899',
  },
  {
    message: "AI Studio is where the magic happens — summarize readings, generate quizzes, check for AI writing, parse syllabi, and more.",
    feature: 'AI Studio',
    icon: Sparkles,
    iconColor: '#8b5cf6',
  },
  {
    message: "Your Calendar shows all deadlines in one place. You can even sync your Google Calendar so classes, work, and life all show up together.",
    feature: 'Calendar',
    icon: Calendar,
    iconColor: '#06b6d4',
  },
  {
    message: "That's the tour! Connect Canvas to get the most out of Workspace. I'll be here whenever you need help — just visit Study Buddy. Let's do this! 💪",
    feature: "You're all set!",
    icon: MessageCircle,
    iconColor: '#7c3aed',
  },
];

export default function AppTour({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) finish();
    else setStep(s => s + 1);
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
        {/* Study Buddy avatar */}
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <MessageCircle size={18} color="#fff" />
          </View>
          <Text style={styles.avatarName}>Study Buddy</Text>
          <View style={styles.onlineDot} />
        </View>

        {/* Chat bubble */}
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>{current.message}</Text>
        </View>

        {/* Feature card */}
        <View style={[styles.featureCard, { borderColor: current.iconColor + '40' }]}>
          <View style={[styles.featureIcon, { backgroundColor: current.iconColor + '18' }]}>
            <Icon size={22} color={current.iconColor} />
          </View>
          <Text style={[styles.featureName, { color: current.iconColor }]}>{current.feature}</Text>
        </View>

        {/* Progress */}
        <View style={styles.progressRow}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                { backgroundColor: i <= step ? current.iconColor : 'rgba(255,255,255,0.15)' },
                i === step && { width: 20 },
              ]}
            />
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.btns}>
          <TouchableOpacity onPress={finish} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleNext}
            style={[styles.nextBtn, { backgroundColor: current.iconColor }]}
          >
            <Text style={styles.nextText}>{isLast ? "Let's go!" : 'Next'}</Text>
            {isLast ? <ArrowRight size={16} color="#fff" /> : <ChevronRight size={16} color="#fff" />}
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
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    ...(Platform.OS === 'web' ? { position: 'fixed' as any } : {}),
  },
  card: {
    backgroundColor: '#13132b',
    borderRadius: 28,
    padding: 28,
    width: Math.min(W - 40, 400),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' },
  avatarName: { fontSize: 14, fontWeight: '700', color: '#fff' },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' },

  bubble: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    borderTopLeftRadius: 4,
    padding: 16,
    marginBottom: 18,
  },
  bubbleText: { fontSize: 15, color: 'rgba(255,255,255,0.85)', lineHeight: 23 },

  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  featureIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  featureName: { fontSize: 16, fontWeight: '700' },

  progressRow: { flexDirection: 'row', gap: 5, justifyContent: 'center', marginBottom: 22 },
  progressDot: { width: 8, height: 8, borderRadius: 4 },

  btns: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  skipBtn: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  skipText: { color: 'rgba(255,255,255,0.35)', fontSize: 14, fontWeight: '500' },
  nextBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 14 },
  nextText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
