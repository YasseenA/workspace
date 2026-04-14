import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Key, ExternalLink, Mail, ArrowRight, X, Shield } from 'lucide-react-native';
import { useColors } from '../lib/theme';
import { useAuthStore } from '../store/auth';

const STEPS = [
  {
    icon: Shield,
    color: '#7c3aed',
    title: 'Your access token is the key',
    body: 'Canvas access tokens let Workspace securely read your real assignments, due dates, and courses — without storing your password. This is the same technology used by apps like Notion and Todoist.',
    tip: null,
  },
  {
    icon: ExternalLink,
    color: '#f59e0b',
    title: 'Open your Canvas settings',
    body: 'Tap "Open Canvas Settings" above to go to your school\'s Canvas portal. You\'ll need to be signed in to your school account.',
    tip: '👆 Tap the link above first, then come back here.',
  },
  {
    icon: Key,
    color: '#10b981',
    title: 'Generate a new access token',
    body: 'Once in Canvas settings, scroll down to "Approved Integrations" and click "+ New Access Token". Give it any name (e.g. "Workspace"), set no expiry, and click Generate.',
    tip: '📋 Copy the token — you won\'t be able to see it again.',
  },
  {
    icon: ArrowRight,
    color: '#7c3aed',
    title: 'Paste it and connect',
    body: 'Tap "Connect with Access Token" above, paste the token you just copied, and hit Connect. Your assignments and courses will sync automatically.',
    tip: null,
  },
  {
    icon: Mail,
    color: '#6366f1',
    title: 'If it doesn\'t work',
    body: 'Some schools disable API access by default. If you get an error, email your school\'s Canvas support and say:\n\n"Hi, I\'d like to request API token access for my Canvas account to use with an approved third-party integration."\n\nThey\'ll usually enable it within a day.',
    tip: null,
  },
];

interface Props {
  onDismiss: () => void;
  onOpenSettings: () => void;
  onOpenConnect: () => void;
}

export default function CanvasTour({ onDismiss, onOpenSettings, onOpenConnect }: Props) {
  const colors = useColors();
  const { appData } = useAuthStore();
  const [step, setStep] = useState(0);
  const s = STEPS[step];
  const Icon = s.icon;
  const isLast = step === STEPS.length - 1;

  const handleNext = () => {
    if (step === 1) onOpenSettings();
    if (step === 3) { onOpenConnect(); onDismiss(); return; }
    if (isLast) { onDismiss(); return; }
    setStep(s => s + 1);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.schoolBadge, { backgroundColor: '#7c3aed18' }]}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#7c3aed' }}>
            🎓 {appData.school || 'Your School'} · Step {step + 1} of {STEPS.length}
          </Text>
        </View>
        <TouchableOpacity onPress={onDismiss} style={[styles.closeBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          <X size={13} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <View style={[styles.progressFill, { backgroundColor: s.color, width: `${((step + 1) / STEPS.length) * 100}%` as any }]} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: s.color + '18' }]}>
          <Icon size={28} color={s.color} strokeWidth={1.5} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{s.title}</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>{s.body}</Text>
        {s.tip && (
          <View style={[styles.tip, { backgroundColor: s.color + '12', borderColor: s.color + '30' }]}>
            <Text style={{ fontSize: 13, color: s.color, fontWeight: '600', lineHeight: 19 }}>{s.tip}</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {step > 0 && (
          <TouchableOpacity onPress={() => setStep(s => s - 1)} style={[styles.backBtn, { borderColor: colors.border }]}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={handleNext} style={[styles.nextBtn, { backgroundColor: s.color, flex: step > 0 ? 1 : undefined }]}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>
            {step === 1 ? 'Open Settings →' : step === 3 ? 'Connect Now →' : isLast ? 'Got it' : 'Next →'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24, borderWidth: 1,
    overflow: 'hidden',
    marginTop: 16,
    ...(Platform.OS === 'web' ? { boxShadow: '0 8px 32px rgba(124,58,237,0.12)' } as any : {
      shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12, shadowRadius: 20, elevation: 8,
    }),
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12,
  },
  schoolBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  closeBtn: {
    width: 26, height: 26, borderRadius: 13, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  progressTrack: { height: 3, marginHorizontal: 18, borderRadius: 2, marginBottom: 20 },
  progressFill:  { height: 3, borderRadius: 2 },
  content: { paddingHorizontal: 20, paddingBottom: 8, gap: 10 },
  iconWrap: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3, lineHeight: 24 },
  body:  { fontSize: 14, lineHeight: 22 },
  tip:   { borderRadius: 12, borderWidth: 1, padding: 12, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 10, padding: 18, paddingTop: 16 },
  backBtn: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  nextBtn: { borderRadius: 14, paddingHorizontal: 24, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
});
