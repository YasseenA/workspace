import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Zap, FileText, BookOpen, HelpCircle, PenTool, Shield, ChevronDown, ChevronUp, Copy, RefreshCw } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { Card, Button, Badge } from '../../components/ui';
import TabBar from '../../components/layout/TabBar';
import { colors } from '../../lib/theme';
import { claude } from '../../lib/claude';
import { gptzero } from '../../lib/gptzero';

type Tool = 'summarize' | 'explain' | 'flashcards' | 'quiz' | 'studyGuide' | 'writing' | 'aiCheck';

const TOOLS = [
  { id: 'summarize', label: 'Summarize', icon: FileText, color: '#6366f1' },
  { id: 'explain', label: 'Explain', icon: BookOpen, color: '#10b981' },
  { id: 'flashcards', label: 'Flashcards', icon: Zap, color: '#8b5cf6' },
  { id: 'quiz', label: 'Quiz', icon: HelpCircle, color: '#f59e0b' },
  { id: 'studyGuide', label: 'Study Guide', icon: FileText, color: '#3b82f6' },
  { id: 'writing', label: 'Writing', icon: PenTool, color: '#ec4899' },
  { id: 'aiCheck', label: 'AI Checker', icon: Shield, color: '#64748b' },
] as const;

export default function AIStudioScreen() {
  const [tool, setTool] = useState<Tool>('summarize');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');
  const [flashcards, setFlashcards] = useState<{front:string;back:string}[]>([]);
  const [quiz, setQuiz] = useState<{question:string;options:string[];correct:number;explanation:string}[]>([]);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number,number>>({});
  const [showAnswers, setShowAnswers] = useState<Record<number,boolean>>({});
  const [summaryLen, setSummaryLen] = useState<'short'|'medium'|'long'>('medium');
  const [explainLevel, setExplainLevel] = useState<'beginner'|'intermediate'|'advanced'>('beginner');
  const [cardCount, setCardCount] = useState(5);
  const [quizCount, setQuizCount] = useState(5);
  const [writingStyle, setWritingStyle] = useState<'clarity'|'formal'|'concise'|'humanize'>('clarity');
  const [aiCheckResult, setAiCheckResult] = useState<any>(null);

  const currentTool = TOOLS.find(t => t.id === tool)!;

  const clear = () => { setOutput(''); setFlashcards([]); setQuiz([]); setFlippedCards(new Set()); setSelectedAnswers({}); setShowAnswers({}); setAiCheckResult(null); };

  const run = async () => {
    if (!input.trim()) { Alert.alert('Input required', 'Please paste some text first.'); return; }
    setLoading(true); clear();
    try {
      if (tool === 'summarize') setOutput(await claude.summarize(input, summaryLen));
      else if (tool === 'explain') setOutput(await claude.explainSimply(input, explainLevel));
      else if (tool === 'flashcards') setFlashcards(await claude.generateFlashcards(input, cardCount));
      else if (tool === 'quiz') setQuiz(await claude.generateQuiz(input, quizCount));
      else if (tool === 'studyGuide') setOutput(await claude.generateStudyGuide(input));
      else if (tool === 'writing') setOutput(await claude.improveWriting(input, writingStyle));
      else if (tool === 'aiCheck') {
        const result = await gptzero.check(input);
        setAiCheckResult(result);
      }
    } catch(e: any) {
      Alert.alert('Error', e.message || 'Something went wrong. Check your API key in .env');
    } finally { setLoading(false); }
  };

  const copy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied!', 'Text copied to clipboard.');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Zap size={22} color={colors.accent} />
            <Text style={styles.title}>AI Studio</Text>
          </View>
          <Text style={styles.subtitle}>Powered by Claude</Text>
        </View>

        {/* Tool selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolsRow}>
          {TOOLS.map(t => (
            <TouchableOpacity key={t.id} onPress={() => { setTool(t.id as Tool); clear(); }}
              style={[styles.toolBtn, tool === t.id && { backgroundColor: t.color, borderColor: t.color }]}>
              <t.icon size={16} color={tool === t.id ? '#fff' : t.color} />
              <Text style={[styles.toolLabel, { color: tool === t.id ? '#fff' : t.color }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Input */}
        <Card style={styles.inputCard}>
          <Text style={styles.inputLabel}>Your content</Text>
          <TextInput style={styles.textarea} placeholder="Paste your notes, text, or study material here..." placeholderTextColor={colors.textTertiary} value={input} onChangeText={setInput} multiline />

          {/* Tool options */}
          {tool === 'summarize' && (
            <View style={styles.optRow}>
              <Text style={styles.optLabel}>Length:</Text>
              {(['short','medium','long'] as const).map(l => (
                <TouchableOpacity key={l} onPress={() => setSummaryLen(l)} style={[styles.optBtn, summaryLen === l && styles.optBtnActive]}>
                  <Text style={[styles.optBtnText, summaryLen === l && styles.optBtnTextActive]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {tool === 'explain' && (
            <View style={styles.optRow}>
              <Text style={styles.optLabel}>Level:</Text>
              {(['beginner','intermediate','advanced'] as const).map(l => (
                <TouchableOpacity key={l} onPress={() => setExplainLevel(l)} style={[styles.optBtn, explainLevel === l && styles.optBtnActive]}>
                  <Text style={[styles.optBtnText, explainLevel === l && styles.optBtnTextActive]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {tool === 'flashcards' && (
            <View style={styles.optRow}>
              <Text style={styles.optLabel}>Cards:</Text>
              {[3,5,8,10].map(n => (
                <TouchableOpacity key={n} onPress={() => setCardCount(n)} style={[styles.optBtn, cardCount === n && styles.optBtnActive]}>
                  <Text style={[styles.optBtnText, cardCount === n && styles.optBtnTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {tool === 'quiz' && (
            <View style={styles.optRow}>
              <Text style={styles.optLabel}>Questions:</Text>
              {[3,5,10].map(n => (
                <TouchableOpacity key={n} onPress={() => setQuizCount(n)} style={[styles.optBtn, quizCount === n && styles.optBtnActive]}>
                  <Text style={[styles.optBtnText, quizCount === n && styles.optBtnTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {tool === 'writing' && (
            <View style={styles.optRow}>
              <Text style={styles.optLabel}>Style:</Text>
              {(['clarity','formal','concise','humanize'] as const).map(s => (
                <TouchableOpacity key={s} onPress={() => setWritingStyle(s)} style={[styles.optBtn, writingStyle === s && styles.optBtnActive]}>
                  <Text style={[styles.optBtnText, writingStyle === s && styles.optBtnTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {tool === 'aiCheck' && (
            <View style={styles.disclaimer}>
              <Shield size={12} color={colors.textTertiary} />
              <Text style={styles.disclaimerText}>AI detectors are imperfect. Results are estimates, not proof.</Text>
            </View>
          )}

          <Button variant="primary" onPress={run} loading={loading} fullWidth style={{ marginTop: 12 }}>
            {loading ? 'Generating with Claude...' : `Generate ${currentTool.label}`}
          </Button>
        </Card>

        {/* Text output */}
        {output !== '' && (
          <Card style={styles.outputCard}>
            <View style={styles.outputHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Zap size={14} color={colors.accent} />
                <Text style={styles.outputTitle}>Result</Text>
              </View>
              <TouchableOpacity onPress={() => copy(output)} style={styles.copyBtn}>
                <Copy size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.outputText}>{output}</Text>
          </Card>
        )}

        {/* Flashcards */}
        {flashcards.length > 0 && (
          <View>
            <Text style={styles.resultHeading}>{flashcards.length} Flashcards</Text>
            {flashcards.map((card, i) => (
              <TouchableOpacity key={i} onPress={() => {
                const s = new Set(flippedCards);
                s.has(i) ? s.delete(i) : s.add(i);
                setFlippedCards(s);
              }}>
                <Card style={styles.flashcard}>
                  <Badge variant={flippedCards.has(i) ? 'success' : 'primary'} size="sm">{flippedCards.has(i) ? 'Answer' : 'Question'}</Badge>
                  <Text style={styles.flashcardText}>{flippedCards.has(i) ? card.back : card.front}</Text>
                  <Text style={styles.flashcardHint}>Tap to {flippedCards.has(i) ? 'see question' : 'reveal answer'}</Text>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Quiz */}
        {quiz.length > 0 && (
          <View>
            <Text style={styles.resultHeading}>{quiz.length} Quiz Questions</Text>
            {quiz.map((q, qi) => (
              <Card key={qi} style={styles.quizCard}>
                <Text style={styles.quizQ}>Q{qi+1}: {q.question}</Text>
                {q.options.map((opt, oi) => {
                  const selected = selectedAnswers[qi] === oi;
                  const revealed = showAnswers[qi];
                  const isCorrect = oi === q.correct;
                  let bg = '#fff'; let border = colors.border;
                  if (revealed && isCorrect) { bg = '#d1fae5'; border = colors.success; }
                  else if (revealed && selected && !isCorrect) { bg = '#fee2e2'; border = colors.error; }
                  else if (selected) { bg = colors.primaryLight; border = colors.primary; }
                  return (
                    <TouchableOpacity key={oi} onPress={() => !showAnswers[qi] && setSelectedAnswers({...selectedAnswers,[qi]:oi})}
                      style={[styles.quizOpt, { backgroundColor: bg, borderColor: border }]}>
                      <Text style={styles.quizOptText}>{String.fromCharCode(65+oi)}. {opt}</Text>
                    </TouchableOpacity>
                  );
                })}
                {selectedAnswers[qi] !== undefined && !showAnswers[qi] && (
                  <TouchableOpacity onPress={() => setShowAnswers({...showAnswers,[qi]:true})} style={styles.showAnswerBtn}>
                    <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>Show Answer</Text>
                  </TouchableOpacity>
                )}
                {showAnswers[qi] && (
                  <View style={styles.explanation}>
                    <Text style={styles.explanationText}>✓ {q.explanation}</Text>
                  </View>
                )}
              </Card>
            ))}
          </View>
        )}

        {/* AI Check Result */}
        {aiCheckResult && (
          <Card style={styles.aiCheckCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Shield size={20} color={aiCheckResult.label === 'HUMAN' ? colors.success : aiCheckResult.label === 'AI' ? colors.error : colors.warning} />
              <Text style={styles.aiCheckTitle}>AI Detection Result</Text>
            </View>
            <View style={styles.aiCheckScore}>
              <Text style={styles.aiCheckLabel}>AI Probability</Text>
              <Text style={[styles.aiCheckValue, { color: aiCheckResult.score > 0.7 ? colors.error : aiCheckResult.score > 0.3 ? colors.warning : colors.success }]}>
                {Math.round(aiCheckResult.score * 100)}%
              </Text>
            </View>
            <Badge variant={aiCheckResult.label === 'HUMAN' ? 'success' : aiCheckResult.label === 'AI' ? 'error' : 'warning'}>
              {aiCheckResult.label}
            </Badge>
            <View style={styles.disclaimer}>
              <Text style={styles.disclaimerText}>⚠️ AI detectors are not 100% accurate and can produce false positives. Use this as a guide only, not as definitive proof.</Text>
            </View>
          </Card>
        )}

      <TabBar />
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16 },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  toolsRow: { gap: 8, paddingBottom: 16 },
  toolBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff' },
  toolLabel: { fontSize: 13, fontWeight: '600' },
  inputCard: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 },
  textarea: { borderWidth: 0.5, borderColor: colors.border, borderRadius: 10, padding: 12, minHeight: 120, color: colors.text, fontSize: 14, textAlignVertical: 'top', marginBottom: 12 },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
  optLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  optBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 0.5, borderColor: colors.border },
  optBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  optBtnText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  optBtnTextActive: { color: '#fff' },
  disclaimer: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#f8fafc', borderRadius: 8, padding: 10, marginTop: 8 },
  disclaimerText: { fontSize: 11, color: colors.textSecondary, lineHeight: 16, flex: 1 },
  outputCard: { marginBottom: 16 },
  outputHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  outputTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  copyBtn: { padding: 6 },
  outputText: { fontSize: 14, color: colors.text, lineHeight: 22 },
  resultHeading: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 10 },
  flashcard: { marginBottom: 10, alignItems: 'center', paddingVertical: 24 },
  flashcardText: { fontSize: 16, fontWeight: '600', color: colors.text, textAlign: 'center', marginTop: 10, marginBottom: 6 },
  flashcardHint: { fontSize: 11, color: colors.textTertiary },
  quizCard: { marginBottom: 12 },
  quizQ: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 10, lineHeight: 20 },
  quizOpt: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 6 },
  quizOptText: { fontSize: 13, color: colors.text },
  showAnswerBtn: { marginTop: 8, alignItems: 'center', padding: 8 },
  explanation: { backgroundColor: '#f0fdf4', borderRadius: 8, padding: 10, marginTop: 6 },
  explanationText: { fontSize: 13, color: colors.success, lineHeight: 18 },
  aiCheckCard: { marginBottom: 16 },
  aiCheckTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  aiCheckScore: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  aiCheckLabel: { fontSize: 14, color: colors.textSecondary },
  aiCheckValue: { fontSize: 28, fontWeight: '800' },
});
