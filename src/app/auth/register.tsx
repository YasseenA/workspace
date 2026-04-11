import React, { useState } from 'react';
import {
  View, Text, ScrollView, KeyboardAvoidingView,
  Platform, StyleSheet, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { User, Mail, Lock } from 'lucide-react-native';
import { useSignUp } from '@clerk/clerk-expo';
import { Input, Button } from '../../components/ui';
import { useColors } from '../../lib/theme';
import { showAlert } from '../../utils/helpers';

export default function RegisterScreen() {
  const router  = useRouter();
  const colors  = useColors();
  const { signUp, setActive, isLoaded } = useSignUp();

  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [errors,   setErrors]   = useState<any>({});

  // Email verification step
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');

  const validate = () => {
    const e: any = {};
    if (!name.trim())                      e.name     = 'Name is required';
    if (!email.trim())                     e.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email    = 'Enter a valid email';
    if (!password)                         e.password = 'Password is required';
    else if (password.length < 8)          e.password = 'Minimum 8 characters';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleRegister = async () => {
    if (!isLoaded || !validate()) return;
    setLoading(true);
    try {
      await signUp.create({
        firstName: name.trim().split(' ')[0],
        lastName:  name.trim().split(' ').slice(1).join(' ') || undefined,
        emailAddress: email.trim(),
        password,
      });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (e: any) {
      const msg = e.errors?.[0]?.longMessage || e.errors?.[0]?.message || e.message || 'Registration failed';
      showAlert('Sign Up Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!isLoaded) return;
    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/onboarding');
      }
    } catch (e: any) {
      const errCode = e.errors?.[0]?.code;
      if (errCode === 'verification_already_verified' || errCode === 'session_exists') {
        router.replace('/onboarding');
        return;
      }
      const msg = e.errors?.[0]?.longMessage || e.errors?.[0]?.message || 'Invalid code';
      showAlert('Verification Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const gradientStyle: any =
    Platform.OS === 'web'
      ? { background: 'linear-gradient(145deg, #7c3aed 0%, #4338ca 60%, #312e81 100%)' }
      : { backgroundColor: '#7c3aed' };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Gradient hero ── */}
          <View style={[styles.hero, gradientStyle]}>
            <View style={styles.heroOrb1} />
            <View style={styles.heroOrb2} />
            <View style={styles.logoWrap}>
              <Text style={styles.logoLetter}>W</Text>
            </View>
            <Text style={styles.heroTitle}>{pendingVerification ? 'Check your email' : 'Create account'}</Text>
            <Text style={styles.heroSub}>
              {pendingVerification ? `We sent a code to ${email}` : 'Start your academic journey'}
            </Text>
          </View>

          {/* ── Form card ── */}
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            {Platform.OS === 'web' && (
              // @ts-ignore
              <style>{`
                input:-webkit-autofill,
                input:-webkit-autofill:hover,
                input:-webkit-autofill:focus {
                  -webkit-text-fill-color: inherit !important;
                  -webkit-box-shadow: 0 0 0px 1000px transparent inset !important;
                  transition: background-color 9999s ease-in-out 0s !important;
                }
              `}</style>
            )}

            {pendingVerification ? (
              <>
                <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 20, textAlign: 'center', lineHeight: 22 }}>
                  Enter the 6-digit verification code sent to your email.
                </Text>
                <Input
                  label="Verification Code"
                  value={code}
                  onChangeText={setCode}
                  placeholder="000000"
                  keyboardType="number-pad"
                  autoCapitalize="none"
                />
                <View style={{ height: 24 }} />
                <Button variant="primary" onPress={handleVerify} loading={loading} fullWidth size="lg">
                  Verify Email
                </Button>
                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 16 }}>
                  <TouchableOpacity onPress={async () => {
                    try {
                      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
                      showAlert('Code Sent', 'A new verification code has been sent.');
                    } catch { showAlert('Error', 'Could not resend. Try again.'); }
                  }}>
                    <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>Resend code</Text>
                  </TouchableOpacity>
                  <Text style={{ color: colors.textTertiary, fontSize: 13 }}>·</Text>
                  <TouchableOpacity onPress={() => setPendingVerification(false)}>
                    <Text style={{ color: colors.textTertiary, fontSize: 13 }}>← Back</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Input
                  label="Full Name"
                  value={name}
                  onChangeText={setName}
                  placeholder="Alex Johnson"
                  autoCapitalize="words"
                  error={errors.name}
                  leftIcon={<User size={18} color={colors.textTertiary} />}
                />
                <View style={{ height: 14 }} />
                <Input
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@school.edu"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={errors.email}
                  leftIcon={<Mail size={18} color={colors.textTertiary} />}
                />
                <View style={{ height: 14 }} />
                <Input
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min 8 characters"
                  secureTextEntry
                  error={errors.password}
                  leftIcon={<Lock size={18} color={colors.textTertiary} />}
                />
                <View style={{ height: 24 }} />
                <Button variant="primary" onPress={handleRegister} loading={loading} fullWidth size="lg">
                  Create Account
                </Button>

                <View style={styles.footer}>
                  <Text style={[styles.footerText, { color: colors.textSecondary }]}>Already have an account? </Text>
                  <TouchableOpacity onPress={() => router.push('/auth/login')}>
                    <Text style={[styles.link, { color: colors.primary }]}>Sign in</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center', justifyContent: 'flex-end',
    paddingBottom: 52, paddingTop: 60,
    overflow: 'hidden', position: 'relative',
  },
  heroOrb1: {
    position: 'absolute', width: 260, height: 260, borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -80, right: -60,
  },
  heroOrb2: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: 20, left: -50,
  },
  logoWrap: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  logoLetter: { fontSize: 34, fontWeight: '800', color: '#fff' },
  heroTitle:  { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 6 },
  heroSub:    { fontSize: 15, color: 'rgba(255,255,255,0.75)', textAlign: 'center', paddingHorizontal: 24 },
  card: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    marginTop: -24, padding: 28, paddingTop: 32, flex: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 8,
  },
  footer:     { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { fontSize: 14 },
  link:       { fontSize: 14, fontWeight: '700' },
});
