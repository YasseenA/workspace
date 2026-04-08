import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { User, Mail, Lock } from 'lucide-react-native';
import { useAuthStore } from '../../store/auth';
import { Input, Button, Card } from '../../components/ui';
import { colors } from '../../lib/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<any>({});

  const validate = () => {
    const e: any = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Invalid email';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Min 6 characters';
    setErrors(e); return !Object.keys(e).length;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    try {
      await register(name.trim(), email.trim(), password);
      router.replace('/onboarding');
    }
    catch (e: any) { Alert.alert('Registration Failed', e.message); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{flex:1}}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.logo}><Text style={styles.logoText}>W</Text></View>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>Start your academic journey</Text>
          </View>

          <Card style={styles.card}>
            <Input label="Full Name" value={name} onChangeText={setName} placeholder="John Smith" autoCapitalize="words" error={errors.name} leftIcon={<User size={18} color={colors.textTertiary} />} />
            <View style={{height:12}} />
            <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@bellevuecollege.edu" keyboardType="email-address" autoCapitalize="none" error={errors.email} leftIcon={<Mail size={18} color={colors.textTertiary} />} />
            <View style={{height:12}} />
            <Input label="Password" value={password} onChangeText={setPassword} placeholder="Min 6 characters" secureTextEntry error={errors.password} leftIcon={<Lock size={18} color={colors.textTertiary} />} />
            <View style={{height:20}} />
            <Button variant="primary" onPress={handleRegister} loading={isLoading} fullWidth>Create Account</Button>
          </Card>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/auth/login')}><Text style={styles.link}>Sign in</Text></TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex:1, backgroundColor:colors.bg },
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
