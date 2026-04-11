import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SignIn, SignUp } from '@clerk/clerk-expo';
import {
  Zap, FileText, CheckSquare, Timer,
  BookOpen, TrendingUp, X, ArrowRight, Sparkles,
} from 'lucide-react-native';

/* ── Auth Modal — uses Clerk's pre-built UI ── */
function AuthModal({ onClose, defaultTab }: { onClose: () => void; defaultTab: 'in' | 'up' }) {
  const router = useRouter();
  const [tab, setTab] = useState<'in' | 'up'>(defaultTab);

  const overlayStyle: any = Platform.OS === 'web'
    ? { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000,
        backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(8px)' }
    : { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };

  // Clerk appearance — match our dark theme
  const appearance = {
    variables: {
      colorPrimary: '#7c3aed',
      colorBackground: '#18181f',
      colorInputBackground: '#0f172a',
      colorInputText: '#f1f5f9',
      colorText: '#f1f5f9',
      colorTextSecondary: '#94a3b8',
      colorNeutral: '#334155',
      borderRadius: '12px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    elements: {
      card:               { background: '#18181f', border: '1px solid #2a2a38', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' },
      headerTitle:        { color: '#f1f5f9', fontWeight: '800' },
      headerSubtitle:     { color: '#94a3b8' },
      socialButtonsBlockButton: { background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9' },
      socialButtonsBlockButtonText: { color: '#f1f5f9', fontWeight: '600' },
      dividerLine:        { background: '#2a2a38' },
      dividerText:        { color: '#475569' },
      formFieldLabel:     { color: '#94a3b8', fontWeight: '600' },
      formFieldInput:     { background: '#0f172a', border: '1px solid #1e293b', color: '#f1f5f9', borderRadius: '10px' },
      formFieldInputShowPasswordButton: { color: '#64748b' },
      formButtonPrimary:  { background: '#7c3aed', borderRadius: '12px', fontWeight: '700', fontSize: '15px' },
      footerActionLink:   { color: '#a78bfa', fontWeight: '600' },
      footerActionText:   { color: '#64748b' },
      identityPreviewText:{ color: '#f1f5f9' },
      identityPreviewEditButton: { color: '#a78bfa' },
    },
  };

  return (
    <View style={overlayStyle}>
      {/* Click outside to close */}
      <TouchableOpacity
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        activeOpacity={1}
        onPress={onClose}
      />

      {/* Modal wrapper */}
      <View style={styles.modalWrap}>
        {/* Close button */}
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <X size={16} color="#64748b" />
        </TouchableOpacity>

        {Platform.OS === 'web' && (
          // @ts-ignore
          <style>{`
            .cl-card { background: #18181f !important; }
            .cl-internal-b3fm6y { background: #18181f !important; }
          `}</style>
        )}

        {tab === 'in' ? (
          <SignIn
            appearance={appearance as any}
            afterSignInUrl="/home"
            signUpUrl="#"
            signUpForceRedirectUrl="#"
          />
        ) : (
          <SignUp
            appearance={appearance as any}
            afterSignUpUrl="/onboarding"
            signInUrl="#"
            signInForceRedirectUrl="#"
          />
        )}

        {/* Tab switcher below Clerk UI */}
        <View style={styles.tabRow}>
          <Text style={{ color: '#475569', fontSize: 13 }}>
            {tab === 'in' ? "Don't have an account?" : 'Already have an account?'}
          </Text>
          <TouchableOpacity onPress={() => setTab(tab === 'in' ? 'up' : 'in')}>
            <Text style={{ color: '#a78bfa', fontSize: 13, fontWeight: '700', marginLeft: 5 }}>
              {tab === 'in' ? 'Sign up' : 'Sign in'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ── Features ── */
const FEATURES = [
  { icon: FileText,    label: 'Smart Notes',       desc: 'Write, draw, and organize notes with AI summaries',  color: '#7c3aed' },
  { icon: CheckSquare, label: 'Task Manager',       desc: 'Track assignments from Canvas and custom tasks',      color: '#10b981' },
  { icon: Zap,         label: 'AI Studio',          desc: 'Flashcards, quizzes, summaries powered by Claude',   color: '#f97316' },
  { icon: Timer,       label: 'Focus Timer',        desc: 'Pomodoro sessions with streaks and stats',           color: '#3b82f6' },
  { icon: BookOpen,    label: 'Canvas Sync',        desc: 'Connect your BC Canvas and import assignments',      color: '#ec4899' },
  { icon: TrendingUp,  label: 'Grade Calculator',   desc: 'Weighted average calculator with letter grades',     color: '#f59e0b' },
];

/* ── Landing page ── */
export default function LandingPage() {
  const router = useRouter();
  const [modal, setModal] = useState<{ open: boolean; tab: 'in' | 'up' }>({ open: false, tab: 'in' });

  const open = (tab: 'in' | 'up') => setModal({ open: true, tab });

  const bgStyle: any = Platform.OS === 'web'
    ? { background: 'radial-gradient(ellipse at 60% 0%, #1e1040 0%, #0c0c11 60%)' }
    : { backgroundColor: '#0c0c11' };

  return (
    <View style={[{ flex: 1 }, bgStyle]}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Nav ── */}
        <View style={styles.nav}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={styles.navLogo}>
              <Zap size={16} color="#fff" fill="#fff" />
            </View>
            <Text style={styles.navBrand}>Workspace</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={() => open('in')} style={styles.navSignInBtn}>
              <Text style={styles.navSignInTxt}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => open('up')} style={styles.navGetStartedBtn}>
              <Text style={styles.navGetStartedTxt}>Get Started</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Hero ── */}
        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <Sparkles size={12} color="#a78bfa" />
            <Text style={styles.heroBadgeTxt}>Built for Bellevue College students</Text>
          </View>
          <Text style={styles.heroTitle}>Your academic life,{'\n'}organized.</Text>
          <Text style={styles.heroSub}>
            Notes, tasks, AI study tools, and Canvas integration — all in one place.{'\n'}Stop juggling apps and start focusing on what matters.
          </Text>
          <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <TouchableOpacity onPress={() => open('up')} style={styles.heroCTA}>
              <Text style={styles.heroCTATxt}>Get Started — Free</Text>
              <ArrowRight size={16} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => open('in')} style={styles.heroSecondary}>
              <Text style={styles.heroSecondaryTxt}>Sign In →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Features ── */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Everything you need to succeed</Text>
          <Text style={styles.sectionSub}>Six powerful tools built into one seamless experience</Text>
          <View style={styles.grid}>
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <View key={i} style={styles.featureCard}>
                  <View style={[styles.featureIcon, { backgroundColor: f.color + '20' }]}>
                    <Icon size={22} color={f.color} />
                  </View>
                  <Text style={styles.featureLabel}>{f.label}</Text>
                  <Text style={styles.featureDesc}>{f.desc}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Bottom CTA ── */}
        <View style={styles.bottomCTA}>
          <Text style={styles.bottomTitle}>Ready to get organized?</Text>
          <Text style={styles.bottomSub}>Join Bellevue College students already using Workspace</Text>
          <TouchableOpacity onPress={() => open('up')} style={styles.heroCTA}>
            <Text style={styles.heroCTATxt}>Start for Free</Text>
            <ArrowRight size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[styles.navLogo, { width: 22, height: 22, borderRadius: 6 }]}>
              <Zap size={11} color="#fff" fill="#fff" />
            </View>
            <Text style={{ color: '#475569', fontSize: 13 }}>Workspace · Bellevue College</Text>
          </View>
          <Text style={{ color: '#334155', fontSize: 12 }}>Powered by Claude AI</Text>
        </View>
      </ScrollView>

      {/* ── Auth Modal ── */}
      {modal.open && (
        <AuthModal
          defaultTab={modal.tab}
          onClose={() => setModal({ open: false, tab: 'in' })}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 32, paddingVertical: 18,
  },
  navLogo: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' },
  navBrand:         { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  navSignInBtn:     { paddingHorizontal: 16, paddingVertical: 8 },
  navSignInTxt:     { fontSize: 14, fontWeight: '600', color: '#94a3b8' },
  navGetStartedBtn: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20, backgroundColor: '#7c3aed' },
  navGetStartedTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },

  hero: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 80 },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#7c3aed20', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
    marginBottom: 28, borderWidth: 1, borderColor: '#7c3aed40',
  },
  heroBadgeTxt:    { fontSize: 12, fontWeight: '600', color: '#a78bfa' },
  heroTitle:       { fontSize: 52, fontWeight: '900', color: '#fff', textAlign: 'center', letterSpacing: -1.5, lineHeight: 58, marginBottom: 20 },
  heroSub:         { fontSize: 17, color: '#94a3b8', textAlign: 'center', lineHeight: 28, maxWidth: 520, marginBottom: 36 },
  heroCTA:         { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#7c3aed', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },
  heroCTATxt:      { color: '#fff', fontWeight: '700', fontSize: 15 },
  heroSecondary:   { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: '#334155' },
  heroSecondaryTxt:{ color: '#94a3b8', fontWeight: '600', fontSize: 15 },

  featuresSection: { paddingHorizontal: 32, paddingBottom: 80 },
  sectionTitle:    { fontSize: 32, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 10, letterSpacing: -0.5 },
  sectionSub:      { fontSize: 15, color: '#64748b', textAlign: 'center', marginBottom: 40 },
  grid:            { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center' },
  featureCard:     { width: 280, backgroundColor: '#18181f', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#2a2a38' },
  featureIcon:     { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  featureLabel:    { fontSize: 15, fontWeight: '700', color: '#f1f5f9', marginBottom: 6 },
  featureDesc:     { fontSize: 13, color: '#64748b', lineHeight: 20 },

  bottomCTA:    { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 80, borderTopWidth: 1, borderTopColor: '#1e293b' },
  bottomTitle:  { fontSize: 36, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 12, letterSpacing: -0.5 },
  bottomSub:    { fontSize: 15, color: '#64748b', textAlign: 'center', marginBottom: 32 },

  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 32, paddingVertical: 24, borderTopWidth: 1, borderTopColor: '#1a1a2e',
  },

  modalWrap: { position: 'relative', zIndex: 1001 },
  closeBtn: {
    position: 'absolute', top: 12, right: 12, zIndex: 10,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center',
  },
  tabRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8, paddingBottom: 4 },
});
