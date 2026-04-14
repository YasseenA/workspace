import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Copy, RotateCcw, Mail } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { useColors } from '../../lib/theme';
import { claude } from '../../lib/claude';

type EmailType = 'professor' | 'extension' | 'internship' | 'group';

const EMAIL_TYPES: { id: EmailType; label: string; desc: string; color: string }[] = [
  { id: 'professor',  label: 'Professor',        desc: 'General question or message',     color: '#7c3aed' },
  { id: 'extension',  label: 'Deadline Extension', desc: 'Request more time on an assignment', color: '#f97316' },
  { id: 'internship', label: 'Internship',        desc: 'Follow-up or thank you',          color: '#10b981' },
  { id: 'group',      label: 'Group Project',     desc: 'Coordinate with teammates',       color: '#3b82f6' },
];

/* Native textarea for web — avoids GestureHandler keystroke swallowing */
function ContextInput({ value, onChange, colors }: { value: string; onChange: (v: string) => void; colors: any }) {
  const placeholder = 'Describe the context — e.g. "I missed the midterm due to illness and want to ask for a make-up exam for CS 101 with Prof. Smith."';
  if (Platform.OS === 'web') {
    return (
      <textarea
        value={value}
        onChange={(e: any) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={5}
        style={{
          background: 'transparent', border: 'none', outline: 'none', resize: 'none',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontSize: 15, lineHeight: '24px', color: colors.text,
          width: '100%', padding: 0, margin: 0,
        }}
      />
    );
  }
  const { TextInput } = require('react-native');
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.textTertiary}
      multiline
      numberOfLines={5}
      style={{ color: colors.text, fontSize: 15, lineHeight: 24 }}
    />
  );
}

export default function EmailDraftScreen() {
  const router = useRouter();
  const colors = useColors();

  const [type,    setType]    = useState<EmailType>('professor');
  const [context, setContext] = useState('');
  const [draft,   setDraft]   = useState('');
  const [loading, setLoading] = useState(false);
  const [copied,  setCopied]  = useState(false);
  const [error,   setError]   = useState('');

  const selectedType = EMAIL_TYPES.find(t => t.id === type)!;

  async function generate() {
    if (!context.trim()) { setError('Please describe the context first.'); return; }
    setError('');
    setLoading(true);
    setDraft('');
    try {
      const result = await claude.emailDraft(context.trim(), type);
      setDraft(result);
    } catch (e: any) {
      setError(e.message || 'Failed to generate draft.');
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    await Clipboard.setStringAsync(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function reset() {
    setDraft('');
    setContext('');
    setError('');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Mail size={18} color={selectedType.color} />
          <Text style={[styles.headerText, { color: colors.text }]}>Email Draft</Text>
        </View>
        {draft ? (
          <TouchableOpacity onPress={reset} activeOpacity={0.7}>
            <RotateCcw size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        ) : <View style={{ width: 20 }} />}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Type pills */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>EMAIL TYPE</Text>
        <View style={styles.pills}>
          {EMAIL_TYPES.map(t => {
            const active = t.id === type;
            return (
              <TouchableOpacity
                key={t.id}
                onPress={() => setType(t.id)}
                activeOpacity={0.75}
                style={[
                  styles.pill,
                  { borderColor: active ? t.color : colors.border, backgroundColor: active ? t.color + '18' : colors.card },
                ]}
              >
                <Text style={[styles.pillLabel, { color: active ? t.color : colors.textTertiary }]}>{t.label}</Text>
                <Text style={[styles.pillDesc, { color: active ? t.color + 'aa' : colors.textTertiary + '88' }]}>{t.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Context input */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary, marginTop: 20 }]}>CONTEXT</Text>
        <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ContextInput value={context} onChange={setContext} colors={colors} />
        </View>

        {error ? <Text style={[styles.errorText, { color: colors.error || '#ef4444' }]}>{error}</Text> : null}

        {/* Generate button */}
        <TouchableOpacity
          onPress={generate}
          activeOpacity={0.85}
          disabled={loading}
          style={[styles.generateBtn, { backgroundColor: selectedType.color, opacity: loading ? 0.7 : 1 }]}
        >
          {loading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.generateBtnText}>Generate Draft</Text>}
        </TouchableOpacity>

        {/* Result */}
        {draft ? (
          <View style={[styles.resultBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.resultHeader}>
              <Text style={[styles.resultLabel, { color: colors.textTertiary }]}>DRAFT</Text>
              <TouchableOpacity onPress={copy} activeOpacity={0.7} style={[styles.copyBtn, { borderColor: colors.border }]}>
                <Copy size={14} color={copied ? colors.success || '#10b981' : colors.textTertiary} />
                <Text style={[styles.copyText, { color: copied ? colors.success || '#10b981' : colors.textTertiary }]}>
                  {copied ? 'Copied!' : 'Copy'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.draftText, { color: colors.text }]}>{draft}</Text>
          </View>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5,
  },
  backBtn:    { padding: 2 },
  headerTitle:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerText: { fontSize: 17, fontWeight: '700' },

  scroll: { padding: 16, paddingTop: 20 },

  sectionLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, marginBottom: 10 },

  pills:     { gap: 8 },
  pill:      { borderWidth: 1.5, borderRadius: 12, padding: 12 },
  pillLabel: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  pillDesc:  { fontSize: 12 },

  inputBox:  { borderWidth: 1, borderRadius: 12, padding: 14, minHeight: 120 },
  errorText: { fontSize: 13, marginTop: 8 },

  generateBtn:     { marginTop: 16, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  generateBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  resultBox:    { marginTop: 20, borderWidth: 1, borderRadius: 12, padding: 16 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  resultLabel:  { fontSize: 11, fontWeight: '600', letterSpacing: 0.8 },
  copyBtn:      { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  copyText:     { fontSize: 13, fontWeight: '500' },
  draftText:    { fontSize: 14, lineHeight: 22 },
});
