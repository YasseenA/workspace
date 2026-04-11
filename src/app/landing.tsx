import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSignIn, useSignUp } from '@clerk/clerk-expo';
import {
  Zap, FileText, CheckSquare, Timer,
  BookOpen, TrendingUp, X, Eye, EyeOff,
  ArrowRight, Sparkles,
} from 'lucide-react-native';
import { Input } from '../components/ui';
import { showAlert } from '../utils/helpers';

/* ── tiny NativeInput for web (avoids GestureHandler space-swallow) ── */
function WebInput({ value, onChange, placeholder, secure, color }: any) {
  if (Platform.OS !== 'web') return null;
  return (
    <input
      type={secure ? 'password' : 'text'}
      value={value}
      onChange={(e: any) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        background: 'transparent', border: 'none', outline: 'none',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: 15, color: color || '#fff', width: '100%', padding: 0,
      }}
    />
  );
}

/* ── Sign In / Sign Up modal ── */
function AuthModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [tab, setTab] = useState<'in' | 'up'>('in');

  /* Sign In state */
  const { signIn, setActive: setActiveIn, isLoaded: inLoaded } = useSignIn();
  const [inEmail, setInEmail] = useState('');
  const [inPw,    setInPw]    = useState('');
  const [inShowPw, setInShowPw] = useState(false);
  const [inLoading, setInLoading] = useState(false);

  /* Sign Up state */
  const { signUp, setActive: setActiveUp, isLoaded: upLoaded } = useSignUp();
  const [upName,  setUpName]  = useState('');
  const [upEmail, setUpEmail] = useState('');
  const [upPw,    setUpPw]    = useState('');
  const [upLoading, setUpLoading] = useState(false);
  const [pendingVerify, setPendingVerify] = useState(false);
  const [code,    setCode]    = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(false);

  const handleSignIn = async () => {
    if (!inLoaded || !inEmail.trim() || !inPw) return;
    setInLoading(true);
    try {
      const res = await signIn!.create({ identifier: inEmail.trim(), password: inPw });
      if (res.status === 'complete') {
        await setActiveIn!({ session: res.createdSessionId });
        onSuccess();
      }
    } catch (e: any) {
      const msg = e.errors?.[0]?.longMessage || e.errors?.[0]?.message || 'Sign in failed';
      showAlert('Sign In Failed', msg);
    } finally { setInLoading(false); }
  };

  const handleSignUp = async () => {
    if (!upLoaded || !upName.trim() || !upEmail.trim() || !upPw) return;
    setUpLoading(true);
    try {
      await signUp!.create({
        firstName: upName.trim().split(' ')[0],
        lastName:  upName.trim().split(' ').slice(1).join(' ') || undefined,
        emailAddress: upEmail.trim(),
        password: upPw,
      });
      await signUp!.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerify(true);
    } catch (e: any) {
      const msg = e.errors?.[0]?.longMessage || e.errors?.[0]?.message || 'Sign up failed';
      showAlert('Sign Up Failed', msg);
    } finally { setUpLoading(false); }
  };

  const handleVerify = async () => {
    if (!upLoaded || !code.trim()) return;
    setCodeLoading(true);
    try {
      const res = await signUp!.attemptEmailAddressVerification({ code });
      if (res.status === 'complete') {
        await setActiveUp!({ session: res.createdSessionId });
        onSuccess();
      }
    } catch (e: any) {
      const errCode = e.errors?.[0]?.code;
      if (errCode === 'verification_already_verified') {
        // already verified — just redirect
        onSuccess();
        return;
      }
      const msg = e.errors?.[0]?.longMessage || e.errors?.[0]?.message || 'Invalid code';
      showAlert('Verification Failed', msg);
    } finally { setCodeLoading(false); }
  };

  const handleResend = async () => {
    if (resendCooldown || !upLoaded) return;
    try {
      await signUp!.prepareEmailAddressVerification({ strategy: 'email_code' });
      setResendCooldown(true);
      setTimeout(() => setResendCooldown(false), 30000);
      showAlert('Code Sent', 'A new verification code has been sent to your email.');
    } catch (e: any) {
      showAlert('Error', 'Could not resend code. Please try again.');
    }
  };

  const overlayStyle: any = Platform.OS === 'web'
    ? { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000,
        backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(6px)' }
    : { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };

  return (
    <View style={overlayStyle}>
      {/* autofill fix */}
      {Platform.OS === 'web' && (
        // @ts-ignore
        <style>{`
          input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus {
            -webkit-text-fill-color: #fff !important;
            -webkit-box-shadow: 0 0 0px 1000px transparent inset !important;
            transition: background-color 9999s ease-in-out 0s !important;
          }
        `}</style>
      )}

      <View style={styles.modal}>
        {/* Close */}
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <X size={18} color="#94a3b8" />
        </TouchableOpacity>

        {/* Logo */}
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <View style={styles.modalLogo}>
            <Zap size={20} color="#fff" fill="#fff" />
          </View>
          <Text style={styles.modalTitle}>
            {pendingVerify ? 'Check your email' : tab === 'in' ? 'Welcome back' : 'Create account'}
          </Text>
          {pendingVerify && (
            <Text style={styles.modalSub}>We sent a 6-digit code to {upEmail}</Text>
          )}
        </View>

        {pendingVerify ? (
          /* Verification */
          <>
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>Verification Code</Text>
              <View style={styles.inputBox}>
                {Platform.OS === 'web'
                  ? <WebInput value={code} onChange={setCode} placeholder="000000" color="#fff" />
                  : null}
              </View>
            </View>
            <TouchableOpacity
              onPress={handleVerify}
              disabled={codeLoading || !code.trim()}
              style={[styles.submitBtn, { opacity: codeLoading || !code.trim() ? 0.5 : 1 }]}
            >
              {codeLoading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.submitTxt}>Verify Email</Text>}
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 16 }}>
              <TouchableOpacity onPress={handleResend} disabled={resendCooldown}>
                <Text style={{ fontSize: 13, color: resendCooldown ? '#475569' : '#a78bfa' }}>
                  {resendCooldown ? 'Code sent (wait 30s)' : 'Resend code'}
                </Text>
              </TouchableOpacity>
              <Text style={{ color: '#475569', fontSize: 13 }}>·</Text>
              <TouchableOpacity onPress={() => { setPendingVerify(false); setCode(''); }}>
                <Text style={{ fontSize: 13, color: '#94a3b8' }}>Back</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            {/* Tab switcher */}
            <View style={styles.tabs}>
              {(['in', 'up'] as const).map(t => (
                <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
                  <Text style={[styles.tabTxt, { color: tab === t ? '#fff' : '#64748b' }]}>
                    {t === 'in' ? 'Sign In' : 'Sign Up'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {tab === 'in' ? (
              <>
                <View style={styles.inputWrap}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <View style={styles.inputBox}>
                    {Platform.OS === 'web'
                      ? <WebInput value={inEmail} onChange={setInEmail} placeholder="you@school.edu" color="#fff" />
                      : null}
                  </View>
                </View>
                <View style={styles.inputWrap}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={[styles.inputBox, { flexDirection: 'row', alignItems: 'center' }]}>
                    {Platform.OS === 'web'
                      ? <WebInput value={inPw} onChange={setInPw} placeholder="••••••••" secure={!inShowPw} color="#fff" />
                      : null}
                    <TouchableOpacity onPress={() => setInShowPw(!inShowPw)} style={{ marginLeft: 8 }}>
                      {inShowPw ? <EyeOff size={16} color="#64748b" /> : <Eye size={16} color="#64748b" />}
                    </TouchableOpacity>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={handleSignIn}
                  disabled={inLoading || !inEmail.trim() || !inPw}
                  style={[styles.submitBtn, { opacity: inLoading || !inEmail.trim() || !inPw ? 0.5 : 1 }]}
                >
                  {inLoading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.submitTxt}>Sign In</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.inputWrap}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <View style={styles.inputBox}>
                    {Platform.OS === 'web'
                      ? <WebInput value={upName} onChange={setUpName} placeholder="Alex Johnson" color="#fff" />
                      : null}
                  </View>
                </View>
                <View style={styles.inputWrap}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <View style={styles.inputBox}>
                    {Platform.OS === 'web'
                      ? <WebInput value={upEmail} onChange={setUpEmail} placeholder="you@school.edu" color="#fff" />
                      : null}
                  </View>
                </View>
                <View style={styles.inputWrap}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={styles.inputBox}>
                    {Platform.OS === 'web'
                      ? <WebInput value={upPw} onChange={setUpPw} placeholder="Min 8 characters" secure color="#fff" />
                      : null}
                  </View>
                </View>
                <TouchableOpacity
                  onPress={handleSignUp}
                  disabled={upLoading || !upName.trim() || !upEmail.trim() || !upPw}
                  style={[styles.submitBtn, { opacity: upLoading || !upName.trim() || !upEmail.trim() || !upPw ? 0.5 : 1 }]}
                >
                  {upLoading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.submitTxt}>Create Account</Text>}
                </TouchableOpacity>
              </>
            )}
          </>
        )}
      </View>
    </View>
  );
}

/* ── Landing page ── */
const FEATURES = [
  { icon: FileText,   label: 'Smart Notes',         desc: 'Write, draw, and organize notes with AI summaries',  color: '#7c3aed' },
  { icon: CheckSquare,label: 'Task Manager',         desc: 'Track assignments from Canvas and custom tasks',      color: '#10b981' },
  { icon: Zap,        label: 'AI Studio',            desc: 'Flashcards, quizzes, summaries powered by Claude',   color: '#f97316' },
  { icon: Timer,      label: 'Focus Timer',          desc: 'Pomodoro sessions with streaks and stats',           color: '#3b82f6' },
  { icon: BookOpen,   label: 'Canvas Sync',          desc: 'Connect your BC Canvas and import assignments',      color: '#ec4899' },
  { icon: TrendingUp, label: 'Grade Calculator',     desc: 'Weighted average calculator with letter grades',     color: '#f59e0b' },
];

export default function LandingPage() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  const handleSuccess = () => {
    setShowModal(false);
    router.replace('/home');
  };

  const bgStyle: any = Platform.OS === 'web'
    ? { background: 'radial-gradient(ellipse at 60% 0%, #1e1040 0%, #0c0c11 60%)' }
    : { backgroundColor: '#0c0c11' };

  return (
    <View style={[{ flex: 1 }, bgStyle]}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Nav bar ── */}
        <View style={styles.nav}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={styles.navLogo}>
              <Zap size={16} color="#fff" fill="#fff" />
            </View>
            <Text style={styles.navBrand}>Workspace</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={() => setShowModal(true)} style={styles.navSignInBtn}>
              <Text style={styles.navSignInTxt}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowModal(true)} style={styles.navGetStartedBtn}>
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
            Notes, tasks, AI study tools, and Canvas integration — all in one place. Stop juggling apps and start focusing on what matters.
          </Text>

          <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <TouchableOpacity onPress={() => setShowModal(true)} style={styles.heroCTA}>
              <Text style={styles.heroCTATxt}>Get Started — Free</Text>
              <ArrowRight size={16} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowModal(true)} style={styles.heroSecondary}>
              <Text style={styles.heroSecondaryTxt}>Sign In →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Features grid ── */}
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
          <TouchableOpacity onPress={() => setShowModal(true)} style={styles.heroCTA}>
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
      {showModal && <AuthModal onClose={() => setShowModal(false)} onSuccess={handleSuccess} />}
    </View>
  );
}

const styles = StyleSheet.create({
  /* Nav */
  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 32, paddingVertical: 18,
  },
  navLogo: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center',
  },
  navBrand:         { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  navSignInBtn:     { paddingHorizontal: 16, paddingVertical: 8 },
  navSignInTxt:     { fontSize: 14, fontWeight: '600', color: '#94a3b8' },
  navGetStartedBtn: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20, backgroundColor: '#7c3aed' },
  navGetStartedTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },

  /* Hero */
  hero: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 80 },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#7c3aed20', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
    marginBottom: 28, borderWidth: 1, borderColor: '#7c3aed40',
  },
  heroBadgeTxt:    { fontSize: 12, fontWeight: '600', color: '#a78bfa' },
  heroTitle:       { fontSize: 52, fontWeight: '900', color: '#fff', textAlign: 'center', letterSpacing: -1.5, lineHeight: 58, marginBottom: 20 },
  heroSub:         { fontSize: 17, color: '#94a3b8', textAlign: 'center', lineHeight: 28, maxWidth: 520, marginBottom: 36 },
  heroCTA: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#7c3aed', paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 14,
  },
  heroCTATxt:       { color: '#fff', fontWeight: '700', fontSize: 15 },
  heroSecondary:    { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: '#334155' },
  heroSecondaryTxt: { color: '#94a3b8', fontWeight: '600', fontSize: 15 },

  /* Features */
  featuresSection: { paddingHorizontal: 32, paddingBottom: 80 },
  sectionTitle:    { fontSize: 32, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 10, letterSpacing: -0.5 },
  sectionSub:      { fontSize: 15, color: '#64748b', textAlign: 'center', marginBottom: 40 },
  grid:            { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center' },
  featureCard: {
    width: 280, backgroundColor: '#18181f', borderRadius: 16,
    padding: 20, borderWidth: 1, borderColor: '#2a2a38',
  },
  featureIcon:  { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  featureLabel: { fontSize: 15, fontWeight: '700', color: '#f1f5f9', marginBottom: 6 },
  featureDesc:  { fontSize: 13, color: '#64748b', lineHeight: 20 },

  /* Bottom CTA */
  bottomCTA: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 80, borderTopWidth: 1, borderTopColor: '#1e293b' },
  bottomTitle: { fontSize: 36, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 12, letterSpacing: -0.5 },
  bottomSub:   { fontSize: 15, color: '#64748b', textAlign: 'center', marginBottom: 32 },

  /* Footer */
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 32, paddingVertical: 24, borderTopWidth: 1, borderTopColor: '#1a1a2e',
  },

  /* Modal */
  modal: {
    width: 420, backgroundColor: '#18181f', borderRadius: 20,
    padding: 32, borderWidth: 1, borderColor: '#2a2a38',
    shadowColor: '#000', shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5, shadowRadius: 40, elevation: 30,
  },
  closeBtn: {
    position: 'absolute', top: 16, right: 16,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center',
  },
  modalLogo: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: '#7c3aed',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  modalTitle:  { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center' },
  modalSub:    { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 6 },

  /* Modal tabs */
  tabs:      { flexDirection: 'row', backgroundColor: '#0f172a', borderRadius: 10, padding: 4, marginBottom: 20 },
  tab:       { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: '#1e293b' },
  tabTxt:    { fontSize: 14, fontWeight: '600' },

  /* Modal inputs */
  inputWrap:  { marginBottom: 14 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 6, letterSpacing: 0.3 },
  inputBox: {
    backgroundColor: '#0f172a', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#1e293b',
  },
  submitBtn: {
    backgroundColor: '#7c3aed', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 6,
  },
  submitTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
