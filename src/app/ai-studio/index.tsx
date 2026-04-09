import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Zap, FileText, BookOpen, HelpCircle, PenTool, Shield, Copy } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { Card, Button, Badge } from '../../components/ui';
import TabBar from '../../components/layout/TabBar';
import { useColors, colors } from '../../lib/theme';
import { showAlert } from '../../utils/helpers';
import { claude } from '../../lib/claude';
import { gptzero } from '../../lib/gptzero';

const hasApiKey = !!process.env.EXPO_PUBLIC_CLAUDE_API_KEY && process.env.EXPO_PUBLIC_CLAUDE_API_KEY !== 'sk-ant-your-key-here';

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
  const colors = useColors();
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
    if (!input.trim()) { showAlert('Input required', 'Please paste some text first.'); return; }
    setLoading(true); clear();
    try {
      if (tool === 'summarize') setOutput(await claude.summarize(input, summaryLen));
      else if (tool === 'explain') setOutput(await claude.explainSimply(input, explainLevel));
      else if (tool === 'flashcards') setFlashcards(await claude.generateFlashcards(input, cardCount));
      else if (tool === 'quiz') setQuiz(await claude.generateQuiz(input, quizCount));
      else if (tool === 'studyGuide') setOutput(await claude.generateStudyGuide(input));
      else if (tool === 'writing') setOutput(await claude.improveWriting(input, writingStyle));
      else if (tool === 'aiCheck') { const result = await gptzero.check(input); setAiCheckResult(result); }
    } catch(e: any) {
      showAlert('Error', e.message || 'Something went wrong. Check your API key in .env');
    } finally { setLoading(false); }
  };

  const copy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    if (Platform.OS === 'web') window.alert('Copied to clipboard!');
    else showAlert('Copied!', 'Text copied to clipboard.');
  };

  const OptBtn = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
    <TouchableOpacity onPress={onPress}
      style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 0.5,
        backgroundColor: active ? colors.primary : colors.bg, borderColor: active ? colors.primary : colors.border }}>
      <Text style={{ fontSize: 12, fontWeight: '500', color: active ? '#fff' : colors.textSecondary }}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Header */}
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Zap size={22} color={colors.accent} />
            <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text }}>AI Studio</Text>
          </View>
          <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>Powered by Claude</Text>
        </View>

        {/* API key warning */}
        {!hasApiKey && (
          <View style={{ backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#f59e0b', borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <Text style={{ fontSize: 13, color: '#92400e', lineHeight: 20 }}>
              ⚠️ Claude API key not configured. Add your key to the <Text style={{ fontWeight: '700' }}>.env</Text> file:{'\n'}
              <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>EXPO_PUBLIC_CLAUDE_API_KEY=sk-ant-...</Text>
            </Text>
          </View>
        )}

        {/* Tool selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 16 }}>
          {TOOLS.map(t => (
            <TouchableOpacity key={t.id} onPress={() => { setTool(t.id as Tool); clear(); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
                backgroundColor: tool === t.id ? t.color : colors.card,
                borderColor: tool === t.id ? t.color : colors.border }}>
              <t.icon size={16} color={tool === t.id ? '#fff' : t.color} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: tool === t.id ? '#fff' : t.color }}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Input card */}
        <Card style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>Your content</Text>
          <TextInput
            style={{ borderWidth: 0.5, borderColor: colors.border, borderRadius: 10, padding: 12, minHeight: 120,
              color: colors.text, fontSize: 14, textAlignVertical: 'top', marginBottom: 12,
              backgroundColor: colors.bg, ...(Platform.OS === 'web' ? { outlineWidth: 0 } as any : {}) }}
            placeholder="Paste your notes, text, or study material here..."
            placeholderTextColor={colors.textTertiary}
            value={input} onChangeText={setInput} multiline
          />

          {/* Options */}
          {tool === 'summarize' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '500' }}>Length:</Text>
              {(['short','medium','long'] as const).map(l => <OptBtn key={l} label={l} active={summaryLen === l} onPress={() => setSummaryLen(l)} />)}
            </View>
          )}
          {tool === 'explain' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '500' }}>Level:</Text>
              {(['beginner','intermediate','advanced'] as const).map(l => <OptBtn key={l} label={l} active={explainLevel === l} onPress={() => setExplainLevel(l)} />)}
            </View>
          )}
          {tool === 'flashcards' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '500' }}>Cards:</Text>
              {[3,5,8,10].map(n => <OptBtn key={n} label={String(n)} active={cardCount === n} onPress={() => setCardCount(n)} />)}
            </View>
          )}
          {tool === 'quiz' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '500' }}>Questions:</Text>
              {[3,5,10].map(n => <OptBtn key={n} label={String(n)} active={quizCount === n} onPress={() => setQuizCount(n)} />)}
            </View>
          )}
          {tool === 'writing' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '500' }}>Style:</Text>
              {(['clarity','formal','concise','humanize'] as const).map(s => <OptBtn key={s} label={s} active={writingStyle === s} onPress={() => setWritingStyle(s)} />)}
            </View>
          )}
          {tool === 'aiCheck' && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: colors.bg, borderRadius: 8, padding: 10, marginBottom: 8 }}>
              <Shield size={12} color={colors.textTertiary} />
              <Text style={{ fontSize: 11, color: colors.textSecondary, lineHeight: 16, flex: 1 }}>AI detectors are imperfect. Results are estimates, not proof.</Text>
            </View>
          )}

          <Button variant="primary" onPress={run} loading={loading} fullWidth style={{ marginTop: 4 }}>
            {loading ? 'Generating with Claude...' : `Generate ${currentTool.label}`}
          </Button>
        </Card>

        {/* Text output */}
        {output !== '' && (
          <Card style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Zap size={14} color={colors.accent} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Result</Text>
              </View>
              <TouchableOpacity onPress={() => copy(output)} style={{ padding: 6 }}>
                <Copy size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 14, color: colors.text, lineHeight: 22 }}>{output}</Text>
          </Card>
        )}

        {/* Flashcards */}
        {flashcards.length > 0 && (
          <View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 10 }}>{flashcards.length} Flashcards</Text>
            {flashcards.map((card, i) => (
              <TouchableOpacity key={i} onPress={() => {
                const s = new Set(flippedCards); s.has(i) ? s.delete(i) : s.add(i); setFlippedCards(s);
              }}>
                <Card style={{ marginBottom: 10, alignItems: 'center', paddingVertical: 24 }}>
                  <Badge variant={flippedCards.has(i) ? 'success' : 'primary'} size="sm">{flippedCards.has(i) ? 'Answer' : 'Question'}</Badge>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, textAlign: 'center', marginTop: 10, marginBottom: 6 }}>
                    {flippedCards.has(i) ? card.back : card.front}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textTertiary }}>Tap to {flippedCards.has(i) ? 'see question' : 'reveal answer'}</Text>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Quiz */}
        {quiz.length > 0 && (
          <View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 10 }}>{quiz.length} Quiz Questions</Text>
            {quiz.map((q, qi) => (
              <Card key={qi} style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 10, lineHeight: 20 }}>Q{qi+1}: {q.question}</Text>
                {q.options.map((opt, oi) => {
                  const selected = selectedAnswers[qi] === oi;
                  const revealed = showAnswers[qi];
                  const isCorrect = oi === q.correct;
                  let bg = colors.card; let border = colors.border;
                  if (revealed && isCorrect) { bg = '#d1fae5'; border = colors.success; }
                  else if (revealed && selected && !isCorrect) { bg = '#fee2e2'; border = colors.error; }
                  else if (selected) { bg = colors.primaryLight; border = colors.primary; }
                  return (
                    <TouchableOpacity key={oi} onPress={() => !showAnswers[qi] && setSelectedAnswers({...selectedAnswers,[qi]:oi})}
                      style={{ borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 6, backgroundColor: bg, borderColor: border }}>
                      <Text style={{ fontSize: 13, color: colors.text }}>{String.fromCharCode(65+oi)}. {opt}</Text>
                    </TouchableOpacity>
                  );
                })}
                {selectedAnswers[qi] !== undefined && !showAnswers[qi] && (
                  <TouchableOpacity onPress={() => setShowAnswers({...showAnswers,[qi]:true})} style={{ marginTop: 8, alignItems: 'center', padding: 8 }}>
                    <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>Show Answer</Text>
                  </TouchableOpacity>
                )}
                {showAnswers[qi] && (
                  <View style={{ backgroundColor: colors.success + '15', borderRadius: 8, padding: 10, marginTop: 6 }}>
                    <Text style={{ fontSize: 13, color: colors.success, lineHeight: 18 }}>✓ {q.explanation}</Text>
                  </View>
                )}
              </Card>
            ))}
          </View>
        )}

        {/* AI Check Result */}
        {aiCheckResult && (
          <Card style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Shield size={20} color={aiCheckResult.label === 'HUMAN' ? colors.success : aiCheckResult.label === 'AI' ? colors.error : colors.warning} />
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>AI Detection Result</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ fontSize: 14, color: colors.textSecondary }}>AI Probability</Text>
              <Text style={{ fontSize: 28, fontWeight: '800', color: aiCheckResult.score > 0.7 ? colors.error : aiCheckResult.score > 0.3 ? colors.warning : colors.success }}>
                {Math.round(aiCheckResult.score * 100)}%
              </Text>
            </View>
            <Badge variant={aiCheckResult.label === 'HUMAN' ? 'success' : aiCheckResult.label === 'AI' ? 'error' : 'warning'}>
              {aiCheckResult.label}
            </Badge>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: colors.bg, borderRadius: 8, padding: 10, marginTop: 10 }}>
              <Text style={{ fontSize: 11, color: colors.textSecondary, lineHeight: 16, flex: 1 }}>⚠️ AI detectors are not 100% accurate and can produce false positives. Use this as a guide only.</Text>
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
});
