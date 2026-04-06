import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BookOpen, CheckSquare, Zap, ChevronRight } from 'lucide-react-native';
import { useAuthStore } from '../../store/auth';
import { Button } from '../../components/ui';
import { colors } from '../../lib/theme';

const STEPS = [
  { icon: BookOpen, title: 'Smart Notes', desc: 'Take notes, annotate PDFs, organize by class — all in one place.', color: '#6366f1' },
  { icon: CheckSquare, title: 'Task Manager', desc: 'Never miss a deadline. Sync directly from Canvas LMS.', color: '#10b981' },
  { icon: Zap, title: 'AI Studio', desc: 'Summarize, generate flashcards, quiz yourself — powered by Claude.', color: '#8b5cf6' },
];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const router = useRouter();
  const { completeOnboarding } = useAuthStore();

  const finish = () => { completeOnboarding(); router.replace('/home'); };

  const s = STEPS[step];
  const Icon = s.icon;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <View style={[styles.iconBg, { backgroundColor: s.color + '20' }]}>
            <Icon size={56} color={s.color} strokeWidth={1.5} />
          </View>
          <Text style={styles.title}>{s.title}</Text>
          <Text style={styles.desc}>{s.desc}</Text>
          <View style={styles.dots}>
            {STEPS.map((_, i) => <View key={i} style={[styles.dot, i === step && styles.dotActive]} />)}
          </View>
        </View>

        <View style={styles.actions}>
          {step < STEPS.length - 1 ? (
            <>
              <Button variant="primary" fullWidth onPress={() => setStep(step + 1)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>Next</Text>
                  <ChevronRight size={16} color="#fff" />
                </View>
              </Button>
              <TouchableOpacity onPress={finish} style={{ marginTop: 14, alignItems: 'center' }}>
                <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Skip</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Button variant="primary" fullWidth onPress={finish}>Get Started</Button>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, justifyContent: 'space-between' },
  iconBg: { width: 120, height: 120, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 12 },
  desc: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  dots: { flexDirection: 'row', gap: 8, marginTop: 32 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { width: 24, backgroundColor: colors.primary },
  actions: { padding: 24, paddingBottom: 32 },
});
