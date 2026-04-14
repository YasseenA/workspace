import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  Platform, StyleSheet, TextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, User, Mail, School, Pencil, Check, X, Shield, LogOut } from 'lucide-react-native';
import { useUser, useClerk } from '@clerk/clerk-expo';
import { useAuthStore } from '../../store/auth';
import { useColors } from '../../lib/theme';
import { initials, showAlert } from '../../utils/helpers';

export default function ProfileScreen() {
  const router   = useRouter();
  const colors   = useColors();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { resetAppState, appData } = useAuthStore();
  const schoolName = appData.school || 'My School';

  const [editing,    setEditing]    = useState(false);
  const [firstName,  setFirstName]  = useState(user?.firstName || '');
  const [lastName,   setLastName]   = useState(user?.lastName  || '');
  const [saving,     setSaving]     = useState(false);

  const name  = user?.fullName || user?.firstName || 'Student';
  const email = user?.primaryEmailAddress?.emailAddress || '';

  const heroGradient: any = Platform.OS === 'web'
    ? { background: 'linear-gradient(135deg, #7c3aed 0%, #4338ca 70%, #312e81 100%)' }
    : { backgroundColor: colors.primary };

  const startEdit = () => {
    setFirstName(user?.firstName || '');
    setLastName(user?.lastName   || '');
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveEdit = async () => {
    if (!firstName.trim()) return;
    setSaving(true);
    try {
      await user?.update({ firstName: firstName.trim(), lastName: lastName.trim() || undefined });
      setEditing(false);
    } catch (e: any) {
      showAlert('Error', e.message || 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    showAlert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => { resetAppState(); await signOut(); router.replace('/landing'); },
      },
    ]);
  };

  const Row = ({ icon: Icon, iconColor, label, value, action, actionLabel, last = false }: any) => (
    <View style={[styles.row, { borderBottomColor: colors.border }, last && { borderBottomWidth: 0 }]}>
      <View style={[styles.rowIcon, { backgroundColor: iconColor + '18' }]}>
        <Icon size={16} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11, color: colors.textTertiary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
          {label}
        </Text>
        <Text style={{ fontSize: 15, color: colors.text, fontWeight: '500' }}>{value}</Text>
      </View>
      {action && actionLabel && (
        <TouchableOpacity onPress={action} style={[styles.actionBtn, { backgroundColor: colors.primaryLight }]}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

        {/* ── Gradient hero ── */}
        <View style={[styles.hero, heroGradient]}>
          <View style={styles.heroOrb1} />
          <View style={styles.heroOrb2} />

          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <ArrowLeft size={20} color="#fff" />
          </TouchableOpacity>

          {/* Avatar */}
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(name)}</Text>
            </View>
          </View>

          <Text style={styles.heroName}>{name}</Text>
          <Text style={styles.heroEmail}>{email}</Text>

          {/* Plan badges */}
          <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 10 }}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>Free Plan</Text>
            </View>
            <View style={[styles.heroBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
              <Text style={styles.heroBadgeText}>{schoolName}</Text>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: 20 }}>

          {/* ── Edit name card ── */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Profile</Text>
              {!editing ? (
                <TouchableOpacity
                  onPress={startEdit}
                  style={[styles.editBtn, { backgroundColor: colors.primaryLight }]}
                >
                  <Pencil size={13} color={colors.primary} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>Edit</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity onPress={cancelEdit} style={[styles.editBtn, { backgroundColor: colors.bg }]}>
                    <X size={13} color={colors.textSecondary} />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={saveEdit}
                    disabled={saving || !firstName.trim()}
                    style={[styles.editBtn, { backgroundColor: colors.primary }]}
                  >
                    {saving
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Check size={13} color="#fff" />}
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Save</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {editing ? (
              <View style={{ gap: 12 }}>
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textTertiary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    First Name
                  </Text>
                  <TextInput
                    value={firstName}
                    onChangeText={setFirstName}
                    style={[styles.input, { borderColor: colors.border, backgroundColor: colors.bg, color: colors.text }, Platform.OS === 'web' ? ({ outlineWidth: 0 } as any) : {}]}
                    placeholder="First name"
                    placeholderTextColor={colors.textTertiary}
                    autoFocus
                  />
                </View>
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textTertiary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Last Name
                  </Text>
                  <TextInput
                    value={lastName}
                    onChangeText={setLastName}
                    style={[styles.input, { borderColor: colors.border, backgroundColor: colors.bg, color: colors.text }, Platform.OS === 'web' ? ({ outlineWidth: 0 } as any) : {}]}
                    placeholder="Last name"
                    placeholderTextColor={colors.textTertiary}
                    onSubmitEditing={saveEdit}
                    returnKeyType="done"
                  />
                </View>
              </View>
            ) : (
              <View style={{ gap: 0 }}>
                <Row icon={User}   iconColor={colors.primary}  label="Display Name"  value={name} />
                <Row icon={Mail}   iconColor="#10b981"          label="Email"         value={email} />
                <Row icon={School} iconColor="#f59e0b"          label="School"        value={schoolName} last={true} />
              </View>
            )}
          </View>

          {/* ── Security ── */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 16 }]}>
            <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 16 }]}>Security</Text>
            <Row icon={Shield} iconColor="#8b5cf6" label="Account Security" value="Managed by Clerk" />
            <Row icon={Mail}   iconColor="#10b981"  label="Email Verified"   value={email ? '✓ Verified' : 'Not set'} last={true} />
          </View>

          {/* ── Sign out ── */}
          <TouchableOpacity
            onPress={handleLogout}
            style={[styles.logoutBtn, { backgroundColor: colors.error + '10', borderColor: colors.error + '35' }]}
            activeOpacity={0.8}
          >
            <LogOut size={16} color={colors.error} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.error }}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingTop: 20, paddingBottom: 32, alignItems: 'center',
    paddingHorizontal: 20, position: 'relative', overflow: 'hidden',
  },
  heroOrb1: {
    position: 'absolute', width: 250, height: 250, borderRadius: 125,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -80, right: -60,
  },
  heroOrb2: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: -50, left: -30,
  },
  backBtn: {
    position: 'absolute', top: 16, left: 16,
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarWrap: {
    marginTop: 16, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 14, elevation: 10,
  },
  avatar: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText:    { color: '#fff', fontSize: 34, fontWeight: '800' },
  heroName:      { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.4 },
  heroEmail:     { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 3 },
  heroBadge:     { backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  heroBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  card: {
    borderRadius: 22, borderWidth: 0.5, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },

  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    gap: 12, borderBottomWidth: 0.5,
  },
  rowIcon: {
    width: 36, height: 36, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },

  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
  },
  input: {
    borderWidth: 1, borderRadius: 12, padding: 13, fontSize: 15,
  },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderWidth: 1, borderRadius: 16, padding: 15,
    marginTop: 16,
  },
});
