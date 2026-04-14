import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Link2, Key, CheckCircle, ArrowRight, X } from 'lucide-react-native';
import { useColors } from '../lib/theme';
import { useCanvasStore } from '../store/canvas';
import { useAuthStore } from '../store/auth';

const STEPS = [
  {
    icon: Link2,
    color: '#f59e0b',
    title: 'Connect Canvas',
    desc: 'Workspace syncs your assignments, grades, and due dates directly from your school\'s Canvas account.',
  },
  {
    icon: Key,
    color: '#7c3aed',
    title: 'Get your Access Token',
    desc: 'In Canvas: go to Account → Settings → scroll to "Approved Integrations" → click "+ New Access Token" → copy the token.',
  },
  {
    icon: CheckCircle,
    color: '#10b981',
    title: 'Paste and connect',
    desc: 'Paste the token into the Canvas page in Workspace. Your assignments will sync automatically.',
  },
];

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export default function CanvasTutorial({ visible, onDismiss }: Props) {
  const colors  = useColors();
  const router  = useRouter();
  const [step, setStep] = useState(0);
  const { connected } = useCanvasStore();
  const { appData }   = useAuthStore();
  const isLast = step === STEPS.length - 1;
  const s = STEPS[step];
  const Icon = s.icon;

  const handleConnect = () => {
    onDismiss();
    router.push('/canvas');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>

          {/* Dismiss */}
          <TouchableOpacity onPress={onDismiss} style={[styles.closeBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <X size={14} color={colors.textTertiary} />
          </TouchableOpacity>

          {/* School badge */}
          <View style={[styles.schoolBadge, { backgroundColor: '#7c3aed18', borderColor: '#7c3aed30' }]}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#7c3aed' }}>🎓 {appData.school}</Text>
          </View>

          {/* Icon */}
          <View style={[styles.iconWrap, { backgroundColor: s.color + '18' }]}>
            <Icon size={36} color={s.color} strokeWidth={1.5} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{s.title}</Text>
          <Text style={[styles.desc, { color: colors.textSecondary }]}>{s.desc}</Text>

          {/* Progress dots */}
          <View style={styles.dots}>
            {STEPS.map((_, i) => (
              <View key={i} style={[styles.dot, { backgroundColor: i === step ? s.color : colors.border, width: i === step ? 20 : 8 }]} />
            ))}
          </View>

          {/* Buttons */}
          {isLast ? (
            <TouchableOpacity onPress={handleConnect} style={[styles.cta, { backgroundColor: '#f59e0b' }]}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Connect Canvas</Text>
              <ArrowRight size={18} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setStep(s => s + 1)} style={[styles.cta, { backgroundColor: s.color }]}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Next</Text>
              <ArrowRight size={18} color="#fff" />
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={onDismiss} style={{ marginTop: 12 }}>
            <Text style={{ color: colors.textTertiary, fontSize: 13, textAlign: 'center' }}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card:       { width: '100%', maxWidth: 380, borderRadius: 24, padding: 28, borderWidth: 1, alignItems: 'center' },
  closeBtn:   { position: 'absolute', top: 16, right: 16, width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  schoolBadge:{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, marginBottom: 20 },
  iconWrap:   { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title:      { fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 10, letterSpacing: -0.3 },
  desc:       { fontSize: 15, textAlign: 'center', lineHeight: 24, maxWidth: 300, marginBottom: 24 },
  dots:       { flexDirection: 'row', gap: 6, marginBottom: 24, alignItems: 'center' },
  dot:        { height: 8, borderRadius: 4 },
  cta:        { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 18, width: '100%', justifyContent: 'center' },
});
