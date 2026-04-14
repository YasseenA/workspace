import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Platform, ScrollView, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  BookOpen, CheckSquare, Zap, Timer, Link2, ArrowRight, ChevronLeft,
  Search, GraduationCap,
} from 'lucide-react-native';
import { useAuthStore } from '../../store/auth';
import { useColors } from '../../lib/theme';
import { SCHOOLS, findSchool, type School } from '../../lib/schools';

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

// ── School Picker ─────────────────────────────────────────────────────────────
function SchoolPicker({ onSelect }: { onSelect: (s: School) => void }) {
  const colors = useColors();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<School | null>(null);
  const results = findSchool(query).slice(0, 20);
  const IS_WEB = Platform.OS === 'web';

  return (
    <View style={{ flex: 1, paddingHorizontal: 24 }}>
      {/* Header */}
      <View style={{ alignItems: 'center', marginBottom: 28, marginTop: 8 }}>
        <View style={[styles.schoolIconBg, { backgroundColor: '#7c3aed18' }]}>
          <GraduationCap size={40} color="#7c3aed" strokeWidth={1.5} />
        </View>
        <Text style={[styles.schoolTitle, { color: colors.text }]}>What school do you go to?</Text>
        <Text style={[styles.schoolSubtitle, { color: colors.textSecondary }]}>
          We'll connect your Canvas account to the right portal.
        </Text>
      </View>

      {/* Search */}
      <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Search size={16} color={colors.textTertiary} />
        {IS_WEB ? (
          <input
            value={query}
            onChange={(e: any) => setQuery(e.target.value)}
            placeholder="Search your school…"
            autoFocus
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontSize: 15, color: colors.text, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              minWidth: 0,
            } as any}
          />
        ) : (
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search your school…"
            placeholderTextColor={colors.textTertiary}
            autoFocus
            style={{ flex: 1, fontSize: 15, color: colors.text }}
          />
        )}
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Text style={{ color: colors.textTertiary, fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Results list */}
      <ScrollView
        style={{ flex: 1, marginTop: 10 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {results.map(school => {
          const isSelected = selected?.canvasUrl === school.canvasUrl;
          return (
            <TouchableOpacity
              key={school.canvasUrl}
              onPress={() => setSelected(school)}
              style={[
                styles.schoolRow,
                {
                  backgroundColor: isSelected ? '#7c3aed18' : colors.card,
                  borderColor: isSelected ? '#7c3aed60' : colors.border,
                },
              ]}
            >
              <Text style={{ fontSize: 22 }}>{school.emoji}</Text>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{school.name}</Text>
                <Text style={{ fontSize: 12, color: colors.textTertiary }}>{school.location}</Text>
              </View>
              {isSelected && (
                <View style={[styles.checkBadge, { backgroundColor: '#7c3aed' }]}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {results.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 32 }}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>🔍</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center' }}>
              No match found.{'\n'}You can still continue — connect Canvas later in Settings.
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* CTA */}
      <View style={{ paddingBottom: 40, paddingTop: 12 }}>
        {selected ? (
          <TouchableOpacity
            onPress={() => onSelect(selected)}
            style={[styles.cta, { backgroundColor: '#7c3aed' }]}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaText}>{selected.name}</Text>
            <ArrowRight size={18} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => onSelect({ name: 'Other', shortName: 'Other', canvasUrl: 'https://canvas.instructure.com', location: '', emoji: '🏫' })}
            style={[styles.skipBtn, { borderColor: colors.border }]}
          >
            <Text style={{ color: colors.textTertiary, fontSize: 15, fontWeight: '600' }}>
              My school isn't listed — skip for now
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Main Onboarding ───────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const [schoolDone, setSchoolDone] = useState(false);
  const [step, setStep]  = useState(0);
  const router           = useRouter();
  const colors           = useColors();
  const { completeOnboarding, updateAppData } = useAuthStore();
  const fadeAnim  = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const finish = () => { completeOnboarding(); router.replace('/home'); };

  const handleSchoolSelect = (school: School) => {
    updateAppData({ school: school.name, canvasBaseUrl: school.canvasUrl });
    // Animate into the slides
    Animated.timing(fadeAnim, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => {
      setSchoolDone(true);
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    });
  };

  const goTo = (next: number, direction: 1 | -1 = 1) => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 0,               duration: 120, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -30 * direction,  duration: 120, useNativeDriver: true }),
    ]).start(() => {
      setStep(next);
      slideAnim.setValue(30 * direction);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  };

  // ── School picker screen ──────────────────────────────────────────────────
  if (!schoolDone) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <SchoolPicker onSelect={handleSchoolSelect} />
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ── Feature slides ────────────────────────────────────────────────────────
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
            <TouchableOpacity onPress={() => setSchoolDone(false)} style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ChevronLeft size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}

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
          <View style={[styles.iconContainer, gradientStyle]}>
            <View style={[styles.iconRing, { borderColor: s.color + '40' }]}>
              <View style={[styles.iconInner, { backgroundColor: s.color + '20' }]}>
                <Icon size={52} color={s.color} strokeWidth={1.5} />
              </View>
            </View>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{s.title}</Text>
          <Text style={[styles.desc, { color: colors.textSecondary }]}>{s.desc}</Text>

          <View style={styles.chips}>
            {s.features.map((f, i) => (
              <View key={i} style={[styles.chip, { backgroundColor: s.color + '18', borderColor: s.color + '35' }]}>
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
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 16,
  },
  backBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  stepPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 0.5 },

  // School picker
  schoolIconBg: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  schoolTitle:  { fontSize: 26, fontWeight: '800', textAlign: 'center', letterSpacing: -0.4, marginBottom: 8 },
  schoolSubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22, maxWidth: 280 },
  searchBox:    { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  schoolRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  checkBadge:   { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  skipBtn:      { alignItems: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1 },

  // Feature slides
  content:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  iconContainer:{ width: 160, height: 160, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 36 },
  iconRing:     { width: 136, height: 136, borderRadius: 40, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  iconInner:    { width: 104, height: 104, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  title:        { fontSize: 30, fontWeight: '800', textAlign: 'center', marginBottom: 14, letterSpacing: -0.5 },
  desc:         { fontSize: 16, textAlign: 'center', lineHeight: 26, maxWidth: 320 },
  chips:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 28, justifyContent: 'center' },
  chip:         { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipDot:      { width: 6, height: 6, borderRadius: 3 },
  chipText:     { fontSize: 12, fontWeight: '600' },
  dots:         { flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 16 },
  dot:          { width: 8, height: 8, borderRadius: 4, transition: 'all 0.2s' } as any,
  cta:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 17, borderRadius: 20 },
  ctaText:      { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.1 },
});
