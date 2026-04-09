import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { useAuthStore } from '../../store/auth';
import { Input, Button, Card } from '../../components/ui';
import { useColors, colors } from '../../lib/theme';
import { showAlert } from '../../utils/helpers';

export default function LoginScreen() {
  const router = useRouter();
  const colors = useColors();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<any>({});

  const validate = () => {
    const e: any = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Invalid email';
    if (!password) e.password = 'Password is required';
    setErrors(e); return !Object.keys(e).length;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    try {
      await login(email.trim(), password);
      router.replace('/home');
    }
    catch (e: any) { showAlert('Login Failed', e.message); }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{flex:1}}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.logo}><Text style={styles.logoText}>W</Text></View>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to your Workspace</Text>
          </View>

          <Card style={styles.card}>
            <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@bellevuecollege.edu"
              keyboardType="email-address" autoCapitalize="none" error={errors.email}
              leftIcon={<Mail size={18} color={colors.textTertiary} />} />
            <View style={{height:12}} />
            <Input label="Password" value={password} onChangeText={setPassword} placeholder="••••••••"
              secureTextEntry={!showPw} error={errors.password}
              leftIcon={<Lock size={18} color={colors.textTertiary} />}
              rightIcon={showPw ? <EyeOff size={18} color={colors.textTertiary} /> : <Eye size={18} color={colors.textTertiary} />}
              onRightIconPress={() => setShowPw(!showPw)} />
            <View style={{height:20}} />
            <Button variant="primary" onPress={handleLogin} loading={isLoading} fullWidth>Sign In</Button>
          </Card>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/auth/register')}><Text style={styles.link}>Sign up</Text></TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex:1, backgroundColor: colors.bg },
  scroll: { flexGrow:1, padding:24, justifyContent:'center' },
  header: { alignItems:'center', marginBottom:32 },
  logo: { width:72, height:72, borderRadius:20, backgroundColor:colors.primary, alignItems:'center', justifyContent:'center', marginBottom:20 },
  logoText: { fontSize:32, fontWeight:'800', color:'#fff' },
  title: { fontSize:28, fontWeight:'800', color:colors.text, marginBottom:6 },
  subtitle: { fontSize:15, color:colors.textSecondary },
  card: { marginBottom:24 },
  footer: { flexDirection:'row', justifyContent:'center' },
  footerText: { color:colors.textSecondary, fontSize:14 },
  link: { color:colors.primary, fontSize:14, fontWeight:'600' },
});
