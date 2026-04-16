import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Eye, EyeOff, CheckCircle2, Trash2, ExternalLink } from 'lucide-react-native';
import { useColors } from '../../lib/theme';
import TopBar from '../../components/layout/TopBar';
import { showAlert } from '../../utils/helpers';
import { getKey, setKey } from '../../lib/keystore';

export default function AIKeysScreen() {
  const router = useRouter();
  const colors = useColors();

  // Claude
  const [claudeKey,   setClaudeKey]   = useState('');
  const [showClaude,  setShowClaude]  = useState(false);
  const [claudeSaved, setClaudeSaved] = useState(false);

  // OpenAI
  const [openaiKey,   setOpenaiKey]   = useState('');
  const [showOpenai,  setShowOpenai]  = useState(false);
  const [openaiSaved, setOpenaiSaved] = useState(false);

  // Active provider
  const [provider, setProvider] = useState<'claude' | 'openai'>('claude');

  useEffect(() => {
    setClaudeKey(getKey('user_claude_api_key') || '');
    setOpenaiKey(getKey('user_openai_api_key') || '');
    setProvider((getKey('ai_provider') as 'claude' | 'openai') || 'claude');
  }, []);

  const selectProvider = async (p: 'claude' | 'openai') => {
    setProvider(p);
    await setKey('ai_provider', p);
  };

  // Claude
  const saveClaude = async () => {
    const trimmed = claudeKey.trim();
    if (trimmed && !trimmed.startsWith('sk-ant-')) {
      showAlert('Invalid Key', 'Claude API keys start with sk-ant-. Check your key and try again.');
      return;
    }
    await setKey('user_claude_api_key', trimmed || null);
    setClaudeSaved(true);
    setTimeout(() => setClaudeSaved(false), 2000);
  };

  const clearClaude = () => {
    showAlert('Remove Key', 'Remove your Claude API key?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { await setKey('user_claude_api_key', null); setClaudeKey(''); } },
    ]);
  };

  const openClaudeConsole = () => {
    const url = 'https://console.anthropic.com/settings/keys';
    if (Platform.OS === 'web') { if (typeof window !== 'undefined') window.open(url, '_blank'); }
    else Linking.openURL(url);
  };

  // OpenAI
  const saveOpenai = async () => {
    const trimmed = openaiKey.trim();
    if (trimmed && !trimmed.startsWith('sk-')) {
      showAlert('Invalid Key', 'OpenAI API keys start with sk-. Check your key and try again.');
      return;
    }
    await setKey('user_openai_api_key', trimmed || null);
    setOpenaiSaved(true);
    setTimeout(() => setOpenaiSaved(false), 2000);
  };

  const clearOpenai = () => {
    showAlert('Remove Key', 'Remove your OpenAI API key?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { await setKey('user_openai_api_key', null); setOpenaiKey(''); } },
    ]);
  };

  const openOpenaiConsole = () => {
    const url = 'https://platform.openai.com/api-keys';
    if (Platform.OS === 'web') { if (typeof window !== 'undefined') window.open(url, '_blank'); }
    else Linking.openURL(url);
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
              Add a Claude or ChatGPT key and choose which AI powers the app.
            </Text>
          </View>

          {/* Provider switcher */}
          <View style={[styles.switcherCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.switcherLabel, { color: colors.text }]}>Active AI Model</Text>
            <Text style={[styles.switcherSub, { color: colors.textSecondary }]}>
              All AI features (AI Studio, Study Buddy, Daily Brief) use this provider.
            </Text>
            <View style={[styles.switcherRow, { backgroundColor: colors.bg, borderColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => selectProvider('claude')}
                style={[
                  styles.switcherBtn,
                  provider === 'claude' && { backgroundColor: '#d946ef18', borderColor: '#d946ef' },
                ]}
              >
                <Text style={{ fontSize: 18 }}>⚡</Text>
                <View>
                  <Text style={[styles.switcherBtnLabel, { color: provider === 'claude' ? '#d946ef' : colors.text }]}>Claude</Text>
                  <Text style={[styles.switcherBtnSub, { color: colors.textTertiary }]}>Anthropic</Text>
                </View>
                {provider === 'claude' && (
                  <View style={[styles.activeDot, { backgroundColor: '#d946ef' }]} />
                )}
              </TouchableOpacity>
              <View style={[styles.switcherDivider, { backgroundColor: colors.border }]} />
              <TouchableOpacity
                onPress={() => selectProvider('openai')}
                style={[
                  styles.switcherBtn,
                  provider === 'openai' && { backgroundColor: '#10b98118', borderColor: '#10b981' },
                ]}
              >
                <Text style={{ fontSize: 18 }}>🤖</Text>
                <View>
                  <Text style={[styles.switcherBtnLabel, { color: provider === 'openai' ? '#10b981' : colors.text }]}>ChatGPT</Text>
                  <Text style={[styles.switcherBtnSub, { color: colors.textTertiary }]}>OpenAI</Text>
                </View>
                {provider === 'openai' && (
                  <View style={[styles.activeDot, { backgroundColor: '#10b981' }]} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Claude section */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: provider === 'claude' ? '#d946ef50' : colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.providerBadge, { backgroundColor: '#d946ef18' }]}>
                <Text style={{ fontSize: 16 }}>⚡</Text>
                <Text style={[styles.providerName, { color: '#d946ef' }]}>Anthropic Claude</Text>
              </View>
              <TouchableOpacity onPress={openClaudeConsole} style={styles.getKeyBtn}>
                <ExternalLink size={13} color={colors.primary} />
                <Text style={[styles.getKeyTxt, { color: colors.primary }]}>Get key</Text>
              </TouchableOpacity>
            </View>

            {provider === 'claude' && (
              <View style={[styles.activeChip, { backgroundColor: '#d946ef12', borderColor: '#d946ef40' }]}>
                <View style={[styles.activeDot, { backgroundColor: '#d946ef' }]} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#d946ef' }}>ACTIVE</Text>
              </View>
            )}

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
                  : <Eye    size={18} color={colors.textTertiary} />}
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                onPress={saveClaude}
                style={[styles.saveBtn, { backgroundColor: claudeSaved ? '#10b981' : colors.primary, flex: 1 }]}
              >
                {claudeSaved && <CheckCircle2 size={16} color="#fff" />}
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
              Models: claude-sonnet-4 · Get your key at console.anthropic.com → API Keys.
            </Text>
          </View>

          {/* OpenAI section */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: provider === 'openai' ? '#10b98150' : colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.providerBadge, { backgroundColor: '#10b98118' }]}>
                <Text style={{ fontSize: 16 }}>🤖</Text>
                <Text style={[styles.providerName, { color: '#10b981' }]}>OpenAI ChatGPT</Text>
              </View>
              <TouchableOpacity onPress={openOpenaiConsole} style={styles.getKeyBtn}>
                <ExternalLink size={13} color={colors.primary} />
                <Text style={[styles.getKeyTxt, { color: colors.primary }]}>Get key</Text>
              </TouchableOpacity>
            </View>

            {provider === 'openai' && (
              <View style={[styles.activeChip, { backgroundColor: '#10b98112', borderColor: '#10b98140' }]}>
                <View style={[styles.activeDot, { backgroundColor: '#10b981' }]} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#10b981' }}>ACTIVE</Text>
              </View>
            )}

            <Text style={[styles.label, { color: colors.textSecondary }]}>API Key</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.bg, borderColor: colors.border }]}>
              <TextInput
                value={openaiKey}
                onChangeText={setOpenaiKey}
                placeholder="sk-..."
                placeholderTextColor={colors.textTertiary}
                secureTextEntry={!showOpenai}
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, { color: colors.text, flex: 1 }]}
              />
              <TouchableOpacity onPress={() => setShowOpenai(v => !v)} style={{ padding: 4 }}>
                {showOpenai
                  ? <EyeOff size={18} color={colors.textTertiary} />
                  : <Eye    size={18} color={colors.textTertiary} />}
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                onPress={saveOpenai}
                style={[styles.saveBtn, { backgroundColor: openaiSaved ? '#10b981' : colors.primary, flex: 1 }]}
              >
                {openaiSaved && <CheckCircle2 size={16} color="#fff" />}
                <Text style={styles.saveTxt}>{openaiSaved ? 'Saved!' : 'Save Key'}</Text>
              </TouchableOpacity>
              {openaiKey ? (
                <TouchableOpacity
                  onPress={clearOpenai}
                  style={[styles.clearBtn, { borderColor: colors.error + '40', backgroundColor: colors.error + '10' }]}
                >
                  <Trash2 size={16} color={colors.error} />
                </TouchableOpacity>
              ) : null}
            </View>

            <Text style={[styles.hint, { color: colors.textTertiary }]}>
              Model: gpt-4o · Get your key at platform.openai.com → API Keys.
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

  switcherCard:  { borderRadius: 18, borderWidth: 0.5, padding: 16 },
  switcherLabel: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  switcherSub:   { fontSize: 13, lineHeight: 18, marginBottom: 14 },
  switcherRow:   { flexDirection: 'row', borderRadius: 14, borderWidth: 0.5, overflow: 'hidden' },
  switcherBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderWidth: 1.5, borderColor: 'transparent', borderRadius: 12, margin: 4 },
  switcherBtnLabel: { fontSize: 14, fontWeight: '700' },
  switcherBtnSub:   { fontSize: 11, marginTop: 1 },
  switcherDivider:  { width: 0.5 },

  activeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderRadius: 20, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 14 },
  activeDot:  { width: 6, height: 6, borderRadius: 3 },

  card: { borderRadius: 18, borderWidth: 0.5, padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  providerBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  providerName:  { fontSize: 15, fontWeight: '700' },
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
