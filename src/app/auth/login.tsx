import React, { useState } from 'react';
import {
  View, Text, ScrollView, KeyboardAvoidingView,
  Platform, StyleSheet, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Mail, Lock, Eye, EyeOff, User } from 'lucide-react-native';
import { useAuthStore } from '../../store/auth';
import { Input, Button } from '../../components/ui';
import { useColors } from '../../lib/theme';
import { showAlert } from '../../utils/helpers';

export default function LoginScreen() {
  const router   = useRouter();
  const colors   = useColors();
  const { login, isLoading } = useAuthStore();
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [errors,   setErrors]   = useState<any>({});

  const validate = () => {
    const e: any = {};
    if (!email.trim())                       e.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email))   e.email    = 'Enter a valid email';
    if (!password)                           e.password = 'Password is required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    try {
      await login(email.trim(), password, name.trim() || undefined);
      router.replace('/home');
    } catch (e: any) {
      showAlert('Sign In Failed', e.message);
    }
  };

  const gradientStyle: any =
    Platform.OS === 'web'
      ? { background: 'linear-gradient(145deg, #7c3aed 0%, #4338ca 60%, #312e81 100%)' }
      : { backgroundColor: colors.primary };

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
            <Text style={styles.heroTitle}>Welcome back</Text>
            <Text style={styles.heroSub}>Sign in to your Workspace</Text>
          </View>

          {/* ── Form card ── */}
          <View style={[styles.card, { backgroundColor: colors.card, shadowColor: '#000' }]}>
            {/* Fix browser autofill white-background in dark mode */}
            {Platform.OS === 'web' && (
              // @ts-ignore
              <style>{`
                input:-webkit-autofill,
                input:-webkit-autofill:hover,
                input:-webkit-autofill:focus {
                  -webkit-text-fill-color: inherit !important;
                  -webkit-box-shadow: 0 0 0px 1000px transparent inset !important;
                  transition: background-color 9999s ease-in-out 0s !important;
                  background-color: transparent !important;
                }
              `}</style>
            )}

            <Input
              label="Display Name"
              value={name}
              onChangeText={setName}
              placeholder="What should we call you?"
              autoCapitalize="words"
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
              placeholder="••••••••"
              secureTextEntry={!showPw}
              error={errors.password}
              leftIcon={<Lock size={18} color={colors.textTertiary} />}
              rightIcon={
                showPw
                  ? <EyeOff size={18} color={colors.textTertiary} />
                  : <Eye    size={18} color={colors.textTertiary} />
              }
              onRightIconPress={() => setShowPw(!showPw)}
            />
            <View style={{ height: 24 }} />
            <Button variant="primary" onPress={handleLogin} loading={isLoading} fullWidth size="lg">
              Sign In
            </Button>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/auth/register')}>
                <Text style={[styles.link, { color: colors.primary }]}>Sign up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 52,
    paddingTop: 60,
    overflow: 'hidden',
    position: 'relative',
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
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  logoLetter: { fontSize: 34, fontWeight: '800', color: '#fff' },
  heroTitle:  { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 6 },
  heroSub:    { fontSize: 15, color: 'rgba(255,255,255,0.75)' },

  card: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
    padding: 28,
    paddingTop: 32,
    flex: 1,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: { fontSize: 14 },
  link:       { fontSize: 14, fontWeight: '700' },
});
