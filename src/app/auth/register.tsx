import React, { useState } from 'react';
import {
  View, Text, ScrollView, KeyboardAvoidingView,
  Platform, StyleSheet, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { User, Mail, Lock } from 'lucide-react-native';
import { useAuthStore } from '../../store/auth';
import { Input, Button } from '../../components/ui';
import { useColors } from '../../lib/theme';
import { showAlert } from '../../utils/helpers';

export default function RegisterScreen() {
  const router   = useRouter();
  const colors   = useColors();
  const { register, isLoading } = useAuthStore();
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [errors,   setErrors]   = useState<any>({});

  const validate = () => {
    const e: any = {};
    if (!name.trim())                        e.name     = 'Name is required';
    if (!email.trim())                       e.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email))   e.email    = 'Enter a valid email';
    if (!password)                           e.password = 'Password is required';
    else if (password.length < 6)            e.password = 'Minimum 6 characters';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    try {
      await register(name.trim(), email.trim(), password);
      router.replace('/onboarding');
    } catch (e: any) {
      showAlert('Registration Failed', e.message);
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
            <Text style={styles.heroTitle}>Create account</Text>
            <Text style={styles.heroSub}>Start your academic journey</Text>
          </View>

          {/* ── Form card ── */}
          <View style={[styles.card, { backgroundColor: colors.card }]}>
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
              placeholder="Min 6 characters"
              secureTextEntry
              error={errors.password}
              leftIcon={<Lock size={18} color={colors.textTertiary} />}
            />
            <View style={{ height: 24 }} />
            <Button variant="primary" onPress={handleRegister} loading={isLoading} fullWidth size="lg">
              Create Account
            </Button>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/auth/login')}>
                <Text style={[styles.link, { color: colors.primary }]}>Sign in</Text>
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
    shadowColor: '#000',
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
