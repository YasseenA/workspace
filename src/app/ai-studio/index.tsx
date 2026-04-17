import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, ActivityIndicator, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Zap, Copy, Send, RotateCcw, Upload, BookmarkPlus, Layers, X, Check } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { Badge } from '../../components/ui';
import { useNotesStore } from '../../store/notes';
import { useFlashcardsStore } from '../../store/flashcards';
import { showAlert } from '../../utils/helpers';
import TabBar from '../../components/layout/TabBar';
import TopBar from '../../components/layout/TopBar';
import { useColors } from '../../lib/theme';
import { claude } from '../../lib/claude';
import { gptzero } from '../../lib/gptzero';

type Tool = 'summarize' | 'explain' | 'flashcards' | 'quiz' | 'studyGuide' | 'writing' | 'aiCheck' | 'syllabus';
type Msg  = { role: 'user' | 'assistant'; text: string; color?: string; isAction?: boolean };

const TOOLS: { id: Tool; label: string; color: string }[] = [
  { id: 'summarize',  label: 'Summarize',   color: '#7c3aed' },
  { id: 'explain',    label: 'Explain',     color: '#10b981' },
  { id: 'flashcards', label: 'Flashcards',  color: '#f97316' },
  { id: 'quiz',       label: 'Quiz',        color: '#f59e0b' },
  { id: 'studyGuide', label: 'Study Guide', color: '#3b82f6' },
  { id: 'writing',    label: 'Writing',     color: '#ec4899' },
  { id: 'aiCheck',    label: 'AI Checker',  color: '#64748b' },
  { id: 'syllabus',   label: 'Syllabus',    color: '#0ea5e9' },
];

/* Jumping dots thinking indicator */
function ThinkingDots({ color }: { color: string }) {
  if (Platform.OS === 'web') {
    return (
      <>
        <style>{`
          @keyframes dotBounce {
            0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
            30% { transform: translateY(-7px); opacity: 1; }
          }
          .td1 { animation: dotBounce 1.1s ease-in-out infinite; animation-delay: 0s; }
          .td2 { animation: dotBounce 1.1s ease-in-out infinite; animation-delay: 0.18s; }
          .td3 { animation: dotBounce 1.1s ease-in-out infinite; animation-delay: 0.36s; }
        `}</style>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '4px 0' }}>
          {['td1', 'td2', 'td3'].map(cls => (
            <div key={cls} className={cls} style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color }} />
          ))}
        </div>
      </>
    );
  }
  // Native fallback
  return <ActivityIndicator size="small" color={color} style={{ alignSelf: 'flex-start' }} />;
}

/* Native HTML inputs — avoids GestureHandler swallowing keystrokes on web */
function NativeInput({ value, onChange, placeholder, multiline = false, onEnter, rows = 10, color = 'inherit' }: any) {
  const base: any = {
    background: 'transparent', border: 'none', outline: 'none',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: 15, lineHeight: '26px', letterSpacing: '0.01em',
    color, width: '100%', padding: 0, margin: 0,
  };
  if (multiline) {
    return (
      <textarea
        value={value}
        onChange={(e: any) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{ ...base, resize: 'none', height: '100%' }}
      />
    );
  }
  return (
    <input
      value={value}
      onChange={(e: any) => onChange(e.target.value)}
      placeholder={placeholder}
      onKeyDown={(e: any) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEnter?.(); } }}
      style={base}
    />
  );
}

export default function AIStudioScreen() {
  const colors  = useColors();
  const isWeb   = Platform.OS === 'web';
  const { createNote } = useNotesStore();
  const { createDeck } = useFlashcardsStore();

  const [saveDeckModal, setSaveDeckModal] = useState(false);
  const [deckName, setDeckName]           = useState('');

  const saveToNotes = (text: string, toolId: Tool) => {
    const toolLabel = TOOLS.find(t => t.id === toolId)?.label || 'AI Studio';
    createNote({ title: `${toolLabel} — ${new Date().toLocaleDateString()}`, content: text });
    showAlert('Saved', 'Output saved to Notes.');
  };

  const [tool,       setTool]       = useState<Tool>('summarize');
  const [content,    setContent]    = useState('');
  const [chatInput,  setChatInput]  = useState('');
  const [msgs,       setMsgs]       = useState<Msg[]>([]);
  const [loading,    setLoading]    = useState(false);
  const streamIdx = useRef(-1);
  const [isDragging, setIsDragging] = useState(false);

  const [canvasText,   setCanvasText]   = useState('');
  const [flashcards,   setFlashcards]   = useState<{ front: string; back: string }[]>([]);
  const [quiz,         setQuiz]         = useState<{ question: string; options: string[]; correct: number; explanation: string }[]>([]);
  const [aiResult,     setAiResult]     = useState<any>(null);
  const [syllabusData, setSyllabusData] = useState<{ dates: string[]; exams: string[]; assignments: string[]; books: string[]; officeHours: string; gradingPolicy: string } | null>(null);
  const [flipped,    setFlipped]    = useState<Set<number>>(new Set());
  const [selAns,     setSelAns]     = useState<Record<number, number>>({});
  const [shownAns,   setShownAns]   = useState<Record<number, boolean>>({});

  const [summaryLen,  setSummaryLen]  = useState<'short' | 'medium' | 'long'>('medium');
  const [explainLvl,  setExplainLvl]  = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [cardCount,   setCardCount]   = useState(5);
  const [quizCount,   setQuizCount]   = useState(5);
  const [writeStyle,  setWriteStyle]  = useState<'clarity' | 'formal' | 'concise' | 'humanize'>('clarity');
  const [pastedImage, setPastedImage] = useState<{ base64: string; mime: string; preview: string } | null>(null);

  const chatRef   = useRef<ScrollView>(null);
  const dragCount = useRef(0);
  const scroll    = () => setTimeout(() => chatRef.current?.scrollToEnd({ animated: true }), 80);
  const cur       = TOOLS.find(t => t.id === tool)!;

  const clearCanvas = () => {
    setCanvasText(''); setFlashcards([]); setQuiz([]); setAiResult(null); setSyllabusData(null);
    setFlipped(new Set()); setSelAns({}); setShownAns({});
  };

  const handleImagePaste = (file: File) => {
    const mime = file.type as string;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      // strip the "data:image/...;base64," prefix to get raw base64
      const base64 = dataUrl.split(',')[1];
      setPastedImage({ base64, mime, preview: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  // Global paste: catches Ctrl+V anywhere on page, not just when textarea is focused
  useEffect(() => {
    if (!isWeb) return;
    const handler = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (file) handleImagePaste(file);
          return;
        }
      }
    };
    (window as any).addEventListener('paste', handler);
    return () => (window as any).removeEventListener('paste', handler);
  }, [isWeb]);

  const onTextareaPaste = (e: any) => {
    const items: DataTransferItemList = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) handleImagePaste(file);
        return;
      }
    }
  };

  const errMsg = (e: any) =>
    e.message?.includes('fetch') || e.message?.includes('Failed to fetch')
      ? 'AI service temporarily unavailable. Please try again in a moment.'
      : e.message || 'Something went wrong.';

  // Push a streaming-capable assistant placeholder and return its index
  const pushPlaceholder = (base: Msg[]): [Msg[], number] => {
    const placeholder: Msg = { role: 'assistant', text: '', color: cur.color };
    const next = [...base, placeholder];
    return [next, next.length - 1];
  };

  // Append chunk to message at idx
  const appendChunk = (idx: number, chunk: string) => {
    setMsgs(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], text: copy[idx].text + chunk };
      return copy;
    });
    scroll();
  };

  const generateWith = async (src: string) => {
    const hasImage = !!pastedImage;
    if (!src.trim() && !hasImage) return;
    const userPreview = hasImage
      ? `📷 Image${src.trim() ? ' + "' + src.slice(0, 60) + (src.length > 60 ? '…' : '') + '"' : ''}`
      : src.length > 100 ? src.slice(0, 100) + '…' : src;
    const withUser: Msg[] = [...msgs, { role: 'user', text: userPreview, color: cur.color }];
    clearCanvas(); scroll();

    // For structured tools (flashcards, quiz, aiCheck, syllabus) keep old non-streaming path
    const isStructured = tool === 'flashcards' || tool === 'quiz' || tool === 'aiCheck' || tool === 'syllabus';

    if (isStructured) {
      setMsgs(withUser); setLoading(true); streamIdx.current = -1;
      try {
        let reply = '';
        if (hasImage) {
          const { base64, mime } = pastedImage!;
          if (tool === 'flashcards') { const c = await claude.flashcardsFromImage(base64, mime, cardCount); setFlashcards(c); reply = `Generated ${c.length} flashcards from your image.`; }
          if (tool === 'quiz')       { const q = await claude.quizFromImage(base64, mime, quizCount);       setQuiz(q);       reply = `Generated ${q.length} quiz questions from your image.`; }
          if (tool === 'aiCheck')    { reply = 'AI detection requires text — please paste the text content directly.'; }
          if (tool === 'syllabus')   { reply = 'Syllabus parsing requires text — please paste the syllabus text directly.'; }
        } else {
          if (tool === 'flashcards') { const c = await claude.generateFlashcards(src, cardCount); setFlashcards(c); reply = `Generated ${c.length} flashcards — tap any card to flip it.`; }
          if (tool === 'quiz')       { const q = await claude.generateQuiz(src, quizCount);       setQuiz(q);       reply = `Generated ${q.length} quiz questions — pick your answers below.`; }
          if (tool === 'aiCheck')    { const r = await gptzero.check(src); setAiResult(r); reply = `AI Detection: ${Math.round(r.score * 100)}% AI probability — ${r.label}`; }
          if (tool === 'syllabus')   {
            const s = await claude.parseSyllabus(src);
            setSyllabusData(s);
            const totalItems = (s.dates?.length || 0) + (s.exams?.length || 0) + (s.assignments?.length || 0);
            reply = `Parsed syllabus — found ${totalItems} key dates/items. See the breakdown below.`;
          }
        }
        setMsgs([...withUser, { role: 'assistant', text: reply, color: cur.color }]);
      } catch (e: any) {
        setMsgs([...withUser, { role: 'assistant', text: '⚠️ ' + errMsg(e), color: cur.color }]);
      } finally { setLoading(false); scroll(); }
      return;
    }

    // Streaming path for text tools
    const [withPlaceholder, idx] = pushPlaceholder(withUser);
    setMsgs(withPlaceholder); setLoading(true);
    streamIdx.current = idx;
    try {
      if (hasImage) {
        const { base64, mime } = pastedImage!;
        // Image tools don't stream — fall back to non-streaming then fill placeholder
        let reply = '';
        if (tool === 'summarize')  reply = await claude.summarizeImage(base64, mime, summaryLen);
        if (tool === 'explain')    reply = await claude.explainImage(base64, mime, explainLvl);
        if (tool === 'studyGuide') reply = await claude.studyGuideFromImage(base64, mime);
        if (tool === 'writing')    reply = await claude.improveWriting(src, writeStyle);
        setMsgs(prev => { const c = [...prev]; c[idx] = { ...c[idx], text: reply }; return c; });
      } else {
        if (tool === 'summarize')  await claude.streamSummarize(src, summaryLen, chunk => appendChunk(idx, chunk));
        if (tool === 'explain')    await claude.streamExplain(src, explainLvl, chunk => appendChunk(idx, chunk));
        if (tool === 'studyGuide') await claude.streamStudyGuide(src, chunk => appendChunk(idx, chunk));
        if (tool === 'writing')    await claude.streamImproveWriting(src, writeStyle, chunk => appendChunk(idx, chunk));
      }
    } catch (e: any) {
      setMsgs(prev => { const c = [...prev]; c[idx] = { ...c[idx], text: '⚠️ ' + errMsg(e) }; return c; });
    } finally { setLoading(false); scroll(); }
  };

  const generate = () => generateWith(content);

  const sendChat = async () => {
    if (!chatInput.trim() || loading) return;
    const q   = chatInput.trim();
    const ctx = content ? `Context:\n${content}\n\n` : canvasText ? `Context:\n${canvasText}\n\n` : '';
    const withUser: Msg[] = [...msgs, { role: 'user', text: q, color: cur.color }];
    const placeholder: Msg = { role: 'assistant', text: '' };
    const withPlaceholder = [...withUser, placeholder];
    const idx = withPlaceholder.length - 1;
    setMsgs(withPlaceholder); setChatInput(''); setLoading(true); streamIdx.current = idx; scroll();
    try {
      const system = `You are a helpful AI study assistant. Answer clearly and helpfully. ${ctx ? 'The user has provided the following context:\n' + ctx : ''}`;
      const history = withUser
        .filter(m => !m.isAction)
        .map(m => ({ role: m.role as 'user'|'assistant', content: m.text }));
      await claude.chat(system, history, chunk => {
        setMsgs(prev => { const c = [...prev]; c[idx] = { ...c[idx], text: c[idx].text + chunk }; return c; });
        scroll();
      });
    } catch (e: any) {
      setMsgs(prev => { const c = [...prev]; c[idx] = { ...c[idx], text: '⚠️ ' + errMsg(e) }; return c; });
    } finally { setLoading(false); scroll(); }
  };

  const onDragEnter = (e: any) => { e.preventDefault(); dragCount.current++; setIsDragging(true); };
  const onDragLeave = (e: any) => { e.preventDefault(); dragCount.current--; if (dragCount.current <= 0) { dragCount.current = 0; setIsDragging(false); } };
  const onDragOver  = (e: any) => { e.preventDefault(); };
  const onDrop      = (e: any) => {
    e.preventDefault(); dragCount.current = 0; setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    if (file.type.startsWith('image/')) {
      handleImagePaste(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = (ev.target?.result as string) || '';
      setContent(text);
      await generateWith(text);
    };
    reader.readAsText(file);
  };

  const Pill = ({ label, active, onPress }: any) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1,
        borderColor:     active ? cur.color : colors.border,
        backgroundColor: active ? cur.color : 'transparent',
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#fff' : colors.textSecondary }}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar />

      {/* ── Thin title row — no full bar ── */}
      <View style={[styles.titleRow, { borderBottomColor: colors.border }, Platform.OS === 'web' && { marginTop: 50 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
            <Zap size={15} color="#fff" fill="#fff" />
          </View>
          <Text style={[styles.screenTitle, { color: colors.text }]}>AI Studio</Text>
          <View style={[styles.poweredBadge, { backgroundColor: colors.primaryLight }]}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.primary }}>Claude</Text>
          </View>
        </View>
        {msgs.length > 0 && (
          <TouchableOpacity
            onPress={() => { setMsgs([]); clearCanvas(); }}
            style={[styles.clearBtn, { borderColor: colors.border }]}
          >
            <RotateCcw size={12} color={colors.textTertiary} />
            <Text style={{ fontSize: 12, color: colors.textTertiary }}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Tool picker bar — full width under header ── */}
      <View style={[styles.toolBar, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 10 }}
        >
          {TOOLS.map(t => (
            <TouchableOpacity
              key={t.id}
              onPress={() => { setTool(t.id); clearCanvas(); }}
              style={{
                paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5,
                borderColor:     tool === t.id ? t.color : colors.border,
                backgroundColor: tool === t.id ? t.color : 'transparent',
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: tool === t.id ? '#fff' : colors.textSecondary }}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Split body ── */}
      <View
        style={{ flex: 1, flexDirection: 'row' }}
        {...(isWeb ? { onDragEnter, onDragLeave, onDragOver, onDrop } : {})}
      >

        {/* ─── LEFT: Claude output ─── */}
        <View style={{ flex: 1, flexDirection: 'column', borderRightWidth: 0.5, borderRightColor: colors.border }}>
          <ScrollView
            ref={chatRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1, gap: 10, padding: 16, paddingBottom: 80 }}
          >
            {msgs.length === 0 && !loading && (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIcon, { backgroundColor: cur.color + '18' }]}>
                  <Zap size={32} color={cur.color} fill={cur.color} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Ready to generate</Text>
                <Text style={[styles.emptyDesc, { color: colors.textTertiary }]}>
                  Paste your notes on the right and hit Generate,{'\n'}or drag & drop a file anywhere
                </Text>
              </View>
            )}

            {msgs.filter(m => !m.isAction).map((m, i) => {
              const msgColor = m.color || cur.color;
              const isStreaming = loading && streamIdx.current === i;
              const isEmpty = m.text === '';
              return (
                <View
                  key={i}
                  style={[
                    styles.bubble,
                    m.role === 'user'
                      ? { backgroundColor: msgColor, alignSelf: 'flex-end' as any, maxWidth: '80%' }
                      : [styles.aiBubble, { backgroundColor: colors.card, borderColor: colors.border }],
                  ]}
                >
                  {m.role === 'assistant' && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                      <Text style={[styles.bubbleLbl, { color: msgColor }]}>Claude</Text>
                      {isStreaming
                        ? <ThinkingDots color={msgColor} />
                        : (
                          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                            <TouchableOpacity onPress={() => saveToNotes(m.text, tool)}>
                              <BookmarkPlus size={12} color={colors.textTertiary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={async () => { await Clipboard.setStringAsync(m.text); }}>
                              <Copy size={12} color={colors.textTertiary} />
                            </TouchableOpacity>
                          </View>
                        )
                      }
                    </View>
                  )}
                  {m.role === 'assistant' && isStreaming && isEmpty
                    ? <ThinkingDots color={msgColor} />
                    : <Text style={[styles.bubbleTxt, { color: m.role === 'user' ? '#fff' : colors.text }]}>{m.text}</Text>
                  }
                </View>
              );
            })}

            {flashcards.length > 0 && (
              <TouchableOpacity
                onPress={() => { setDeckName(`Flashcards — ${new Date().toLocaleDateString()}`); setSaveDeckModal(true); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f9731618', borderWidth: 1, borderColor: '#f97316' }}
              >
                <Layers size={12} color="#f97316" />
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#f97316' }}>Save as Deck</Text>
              </TouchableOpacity>
            )}

            {flashcards.map((card, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => { const f = new Set(flipped); f.has(i) ? f.delete(i) : f.add(i); setFlipped(f); }}
              >
                <View style={[styles.aiBubble, { backgroundColor: colors.card, borderColor: flipped.has(i) ? colors.success : colors.border }]}>
                  <Text style={[styles.bubbleLbl, { color: flipped.has(i) ? colors.success : cur.color }]}>
                    {flipped.has(i) ? 'Answer' : 'Question'}
                  </Text>
                  <Text style={{ color: colors.text, fontSize: 13 }}>{flipped.has(i) ? card.back : card.front}</Text>
                  <Text style={{ color: colors.textTertiary, fontSize: 11, marginTop: 4 }}>Tap to flip</Text>
                </View>
              </TouchableOpacity>
            ))}

            {quiz.map((q, qi) => (
              <View key={qi} style={[styles.aiBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.bubbleLbl, { color: cur.color }]}>Q{qi + 1}</Text>
                <Text style={{ color: colors.text, fontSize: 13, marginBottom: 8 }}>{q.question}</Text>
                {q.options.map((opt, oi) => {
                  const sel = selAns[qi] === oi; const rev = shownAns[qi]; const ok = oi === q.correct;
                  const bg = rev && ok ? colors.success + '20' : rev && sel && !ok ? colors.error + '20' : sel ? colors.primaryLight : colors.bg;
                  const bc = rev && ok ? colors.success : rev && sel && !ok ? colors.error : sel ? cur.color : colors.border;
                  return (
                    <TouchableOpacity key={oi} disabled={!!shownAns[qi]} onPress={() => setSelAns({ ...selAns, [qi]: oi })}
                      style={{ borderWidth: 1, borderRadius: 8, padding: 8, marginBottom: 4, backgroundColor: bg, borderColor: bc }}>
                      <Text style={{ fontSize: 12, color: colors.text }}>{String.fromCharCode(65 + oi)}. {opt}</Text>
                    </TouchableOpacity>
                  );
                })}
                {selAns[qi] !== undefined && !shownAns[qi] && (
                  <TouchableOpacity onPress={() => setShownAns({ ...shownAns, [qi]: true })}>
                    <Text style={{ color: cur.color, fontSize: 12, fontWeight: '600', marginTop: 4 }}>Show Answer</Text>
                  </TouchableOpacity>
                )}
                {shownAns[qi] && <Text style={{ color: colors.success, fontSize: 12, marginTop: 4 }}>✓ {q.explanation}</Text>}
              </View>
            ))}

            {aiResult && (
              <View style={[styles.aiBubble, { backgroundColor: colors.card, borderColor: colors.border, alignItems: 'center' }]}>
                <Text style={[styles.bubbleLbl, { color: cur.color }]}>AI Detection</Text>
                <Text style={{ fontSize: 44, fontWeight: '800', color: aiResult.score > 0.7 ? colors.error : aiResult.score > 0.3 ? colors.warning : colors.success }}>
                  {Math.round(aiResult.score * 100)}%
                </Text>
                <Badge variant={aiResult.label === 'HUMAN' ? 'success' : aiResult.label === 'AI' ? 'error' : 'warning'}>
                  {aiResult.label}
                </Badge>
              </View>
            )}

            {/* Syllabus parser output */}
            {syllabusData && (
              <View style={[styles.aiBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.bubbleLbl, { color: '#0ea5e9', marginBottom: 10 }]}>Syllabus Breakdown</Text>
                {[
                  { label: 'Important Dates', items: syllabusData.dates,       icon: '📅' },
                  { label: 'Exams & Quizzes', items: syllabusData.exams,       icon: '📝' },
                  { label: 'Assignments',     items: syllabusData.assignments, icon: '📋' },
                  { label: 'Required Books',  items: syllabusData.books,       icon: '📚' },
                ].map(section => section.items?.length > 0 && (
                  <View key={section.label} style={{ marginBottom: 14 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#0ea5e9', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {section.icon} {section.label}
                    </Text>
                    {section.items.map((item, i) => (
                      <View key={i} style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
                        <Text style={{ color: colors.textTertiary, fontSize: 13 }}>•</Text>
                        <Text style={{ fontSize: 13, color: colors.text, flex: 1, lineHeight: 20 }}>{item}</Text>
                      </View>
                    ))}
                  </View>
                ))}
                {syllabusData.officeHours ? (
                  <View style={{ marginBottom: 10 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#0ea5e9', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>🕐 Office Hours</Text>
                    <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>{syllabusData.officeHours}</Text>
                  </View>
                ) : null}
                {syllabusData.gradingPolicy ? (
                  <View>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#0ea5e9', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>📊 Grading Policy</Text>
                    <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>{syllabusData.gradingPolicy}</Text>
                  </View>
                ) : null}
              </View>
            )}

            {/* Non-streaming loading bubble (flashcards / quiz / aiCheck / syllabus) */}
            {loading && streamIdx.current === -1 && (
              <View style={[styles.aiBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.bubbleLbl, { color: cur.color }]}>Claude</Text>
                <ThinkingDots color={cur.color} />
              </View>
            )}
          </ScrollView>

          {/* Follow-up chat input */}
          <View style={[styles.chatRow, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
            <View style={{ flex: 1 }}>
              {isWeb && (
                <NativeInput
                  value={chatInput}
                  onChange={setChatInput}
                  onEnter={sendChat}
                  placeholder="Ask Claude a follow-up…"
                  color={colors.text}
                />
              )}
            </View>
            <TouchableOpacity
              onPress={sendChat}
              disabled={loading || !chatInput.trim()}
              style={[styles.sendBtn, { backgroundColor: chatInput.trim() ? cur.color : colors.border }]}
            >
              <Send size={13} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── RIGHT: Input panel ─── */}
        <View style={[styles.rightPanel, { borderLeftColor: colors.border }]}>

          {/* Scrollable content — generate button always reachable */}
          <ScrollView
            contentContainerStyle={styles.rightContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.inputLabel, { color: colors.textTertiary }]}>YOUR CONTENT</Text>

            <View style={[styles.textareaBox, { backgroundColor: colors.bg, borderColor: colors.border }]}>
              {isWeb ? (
                <>
                  <style>{`
                    .ai-textarea::placeholder { color: #6b7280; font-size: 14px; line-height: 1.7; }
                  `}</style>
                  {/* Image preview */}
                  {pastedImage && (
                    <div style={{ position: 'relative', marginBottom: 10, display: 'inline-block' }}>
                      <img
                        src={pastedImage.preview}
                        alt="pasted"
                        style={{ maxHeight: 160, maxWidth: '100%', borderRadius: 10, display: 'block', objectFit: 'contain' }}
                      />
                      <button
                        onClick={() => setPastedImage(null)}
                        style={{
                          position: 'absolute', top: 4, right: 4,
                          background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%',
                          width: 22, height: 22, cursor: 'pointer', color: '#fff',
                          fontSize: 13, lineHeight: '22px', textAlign: 'center', padding: 0,
                        }}
                      >✕</button>
                    </div>
                  )}
                  <textarea
                    className="ai-textarea"
                    value={content}
                    onChange={(e: any) => setContent(e.target.value)}
                    onPaste={onTextareaPaste}
                    placeholder={pastedImage ? 'Add optional context text…' : tool === 'syllabus' ? 'Paste your syllabus text here…\n\nTip: copy the full course syllabus from Canvas or a PDF.' : 'Paste notes, text, or an image here…\n\nYou can also drag & drop a .txt file.'}
                    rows={pastedImage ? 4 : 12}
                    style={{
                      background: 'transparent', border: 'none', outline: 'none', resize: 'none',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      fontSize: 15, lineHeight: '26px', letterSpacing: '0.01em',
                      color: colors.text, width: '100%', padding: 0, margin: 0,
                    }}
                  />
                </>
              ) : null}
            </View>

            {/* Options */}
            <View style={styles.optRow}>
              {tool === 'summarize' && (<>
                <Text style={[styles.optLabel, { color: colors.textSecondary }]}>Length:</Text>
                {(['short', 'medium', 'long'] as const).map(l => <Pill key={l} label={l} active={summaryLen === l} onPress={() => setSummaryLen(l)} />)}
              </>)}
              {tool === 'explain' && (<>
                <Text style={[styles.optLabel, { color: colors.textSecondary }]}>Level:</Text>
                {(['beginner', 'intermediate', 'advanced'] as const).map(l => <Pill key={l} label={l} active={explainLvl === l} onPress={() => setExplainLvl(l)} />)}
              </>)}
              {tool === 'flashcards' && (<>
                <Text style={[styles.optLabel, { color: colors.textSecondary }]}>Cards:</Text>
                {[3, 5, 8, 10].map(n => <Pill key={n} label={`${n}`} active={cardCount === n} onPress={() => setCardCount(n)} />)}
              </>)}
              {tool === 'quiz' && (<>
                <Text style={[styles.optLabel, { color: colors.textSecondary }]}>Questions:</Text>
                {[3, 5, 10].map(n => <Pill key={n} label={`${n}`} active={quizCount === n} onPress={() => setQuizCount(n)} />)}
              </>)}
              {tool === 'writing' && (<>
                <Text style={[styles.optLabel, { color: colors.textSecondary }]}>Style:</Text>
                {(['clarity', 'formal', 'concise', 'humanize'] as const).map(o => <Pill key={o} label={o} active={writeStyle === o} onPress={() => setWriteStyle(o)} />)}
              </>)}
            </View>

            {/* Generate button — always visible because parent is ScrollView */}
            <TouchableOpacity
              onPress={generate}
              disabled={loading || (!content.trim() && !pastedImage)}
              style={[styles.genBtn, { backgroundColor: (content.trim() || pastedImage) ? cur.color : colors.border }]}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.genTxt}>Generate {cur.label}</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Drag overlay */}
        {isWeb && isDragging && (
          <View style={styles.dragOverlay} {...{ onDragOver, onDrop, onDragLeave }}>
            <View style={[styles.dragBox, { borderColor: colors.primary, backgroundColor: colors.card }]}>
              <View style={[styles.dragIconWrap, { backgroundColor: colors.primary + '20' }]}>
                <Upload size={40} color={colors.primary} />
              </View>
              <Text style={[styles.dragTitle, { color: colors.text }]}>Drop your file here</Text>
              <Text style={[styles.dragSub, { color: colors.textTertiary }]}>
                .txt, .md, or any plain-text file{'\n'}Claude will analyze it automatically
              </Text>
            </View>
          </View>
        )}
      </View>

      <TabBar />

      {/* Save as Deck modal */}
      <Modal visible={saveDeckModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View style={{ width: '100%', maxWidth: 400, backgroundColor: colors.card, borderRadius: 20, padding: 20, borderWidth: 0.5, borderColor: colors.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>Save as Flashcard Deck</Text>
              <TouchableOpacity onPress={() => setSaveDeckModal(false)}>
                <X size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
            <TextInput
              value={deckName}
              onChangeText={setDeckName}
              placeholder="Deck name…"
              placeholderTextColor={colors.textTertiary}
              style={{ borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15, color: colors.text, borderColor: colors.border, backgroundColor: colors.bg, marginBottom: 12 }}
              autoFocus
            />
            <TouchableOpacity
              onPress={async () => {
                if (!deckName.trim()) return;
                await createDeck(deckName.trim(), flashcards.map(c => ({ front: c.front, back: c.back })));
                setSaveDeckModal(false);
                showAlert('Deck Saved', `"${deckName.trim()}" saved to Flashcards.`);
              }}
              disabled={!deckName.trim()}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, borderRadius: 12, backgroundColor: deckName.trim() ? '#f97316' : colors.border }}
            >
              <Check size={15} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Save Deck</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  /* Title row — thin, no full bar */
  titleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  logoBox:      { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  screenTitle:  { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  poweredBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  clearBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 0.5 },

  /* Right panel */
  rightPanel:  { width: 340, borderLeftWidth: 0.5 },
  toolBar:     { borderBottomWidth: 0.5 },
  rightContent:{ padding: 14, paddingBottom: 100, gap: 12 },
  inputLabel:  { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  textareaBox: { borderWidth: 0.5, borderRadius: 14, padding: 12, minHeight: 240 },
  optRow:      { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  optLabel:    { fontSize: 13, fontWeight: '500' },
  genBtn:      { paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  genTxt:      { color: '#fff', fontWeight: '700', fontSize: 15 },

  /* Left panel / chat */
  chatRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 0.5 },
  sendBtn:  { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  /* Bubbles */
  bubble:    { borderRadius: 12, padding: 10 },
  aiBubble:  { borderWidth: 0.5, borderRadius: 12, padding: 12 },
  bubbleLbl: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 },
  bubbleTxt: { fontSize: 13, lineHeight: 20 },

  /* Empty state */
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyIcon:  { width: 68, height: 68, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 6 },
  emptyDesc:  { fontSize: 13, textAlign: 'center', lineHeight: 21 },

  /* Drag overlay */
  dragOverlay: { position: 'absolute' as any, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', zIndex: 99 },
  dragBox:     { alignItems: 'center', gap: 14, padding: 48, borderRadius: 24, borderWidth: 2, borderStyle: 'dashed' as any },
  dragIconWrap:{ width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  dragTitle:   { fontSize: 22, fontWeight: '800' },
  dragSub:     { fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
