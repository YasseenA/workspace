import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Eye, EyeOff, CheckCircle2, Trash2, ExternalLink } from 'lucide-react-native';
import { useColors } from '../../lib/theme';
import TopBar from '../../components/layout/TopBar';
import { showAlert } from '../../utils/helpers';

function loadKey(k: string): string {
  try { return typeof localStorage !== 'undefined' ? localStorage.getItem(k) || '' : ''; } catch { return ''; }
}
function saveKey(k: string, v: string) {
  try { if (typeof localStorage !== 'undefined') { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } } catch {}
}

export default function AIKeysScreen() {
  const router = useRouter();
  const colors = useColors();

  const [claudeKey, setClaudeKey]     = useState('');
  const [showClaude, setShowClaude]   = useState(false);
  const [claudeSaved, setClaudeSaved] = useState(false);

  useEffect(() => {
    setClaudeKey(loadKey('user_claude_api_key'));
  }, []);

  const saveClaude = () => {
    const trimmed = claudeKey.trim();
    if (trimmed && !trimmed.startsWith('sk-ant-')) {
      showAlert('Invalid Key', 'Claude API keys start with sk-ant-. Check your key and try again.');
      return;
    }
    saveKey('user_claude_api_key', trimmed);
    setClaudeSaved(true);
    setTimeout(() => setClaudeSaved(false), 2000);
  };

  const clearClaude = () => {
    showAlert('Remove Key', 'Remove your Claude API key?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => { saveKey('user_claude_api_key', ''); setClaudeKey(''); } },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar />
      <ScrollView contentContainerStyle={{ paddingBottom: 60, paddingTop: Platform.OS === 'web' ? 50 : 0 }}>

        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>AI Keys</Text>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 20, gap: 16 }}>

          {/* Info banner */}
          <View style={[styles.infoBanner, { backgroundColor: colors.primaryLight, borderColor: colors.primary + '40' }]}>
            <Text style={[styles.infoText, { color: colors.primary }]}>
              Your API keys are stored locally on this device only — never sent to our servers.
              AI features (Study Buddy, AI Studio, Daily Brief) require a Claude API key.
            </Text>
          </View>

          {/* Claude section */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.providerBadge, { backgroundColor: '#d946ef18' }]}>
                <Text style={{ fontSize: 16 }}>⚡</Text>
                <Text style={[styles.providerName, { color: '#d946ef' }]}>Anthropic Claude</Text>
              </View>
              <TouchableOpacity
                onPress={() => { if (typeof window !== 'undefined') window.open('https://console.anthropic.com/settings/keys', '_blank'); }}
                style={styles.getKeyBtn}
              >
                <ExternalLink size={13} color={colors.primary} />
                <Text style={[styles.getKeyTxt, { color: colors.primary }]}>Get key</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: colors.textSecondary }]}>API Key</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.bg, borderColor: colors.border }]}>
              <TextInput
                value={claudeKey}
                onChangeText={setClaudeKey}
                placeholder="sk-ant-api03-..."
                placeholderTextColor={colors.textTertiary}
                secureTextEntry={!showClaude}
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, { color: colors.text, flex: 1 }]}
              />
              <TouchableOpacity onPress={() => setShowClaude(v => !v)} style={{ padding: 4 }}>
                {showClaude
                  ? <EyeOff size={18} color={colors.textTertiary} />
                  : <Eye size={18} color={colors.textTertiary} />}
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                onPress={saveClaude}
                style={[styles.saveBtn, { backgroundColor: claudeSaved ? '#10b981' : colors.primary, flex: 1 }]}
              >
                {claudeSaved
                  ? <CheckCircle2 size={16} color="#fff" />
                  : null}
                <Text style={styles.saveTxt}>{claudeSaved ? 'Saved!' : 'Save Key'}</Text>
              </TouchableOpacity>
              {claudeKey ? (
                <TouchableOpacity
                  onPress={clearClaude}
                  style={[styles.clearBtn, { borderColor: colors.error + '40', backgroundColor: colors.error + '10' }]}
                >
                  <Trash2 size={16} color={colors.error} />
                </TouchableOpacity>
              ) : null}
            </View>

            <Text style={[styles.hint, { color: colors.textTertiary }]}>
              Powers Study Buddy, AI Studio, Daily Brief, and all writing tools.
              {'\n'}Get your key at console.anthropic.com → API Keys.
            </Text>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5,
  },
  backBtn:     { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },

  infoBanner: { borderRadius: 14, borderWidth: 1, padding: 14 },
  infoText:   { fontSize: 13, lineHeight: 20 },

  card: { borderRadius: 18, borderWidth: 0.5, padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  providerBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  providerName: { fontSize: 15, fontWeight: '700' },
  getKeyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  getKeyTxt: { fontSize: 13, fontWeight: '600' },

  label:    { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 0.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  input:    { fontSize: 14, fontFamily: 'monospace' },

  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12 },
  saveTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  clearBtn: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  hint: { fontSize: 12, lineHeight: 18, marginTop: 12 },
});
