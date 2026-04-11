import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Zap, Copy, Send, RotateCcw, Upload } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { Badge } from '../../components/ui';
import TabBar from '../../components/layout/TabBar';
import { useColors } from '../../lib/theme';
import { useAuthStore } from '../../store/auth';
import { initials } from '../../utils/helpers';
import { claude } from '../../lib/claude';
import { gptzero } from '../../lib/gptzero';

type Tool = 'summarize' | 'explain' | 'flashcards' | 'quiz' | 'studyGuide' | 'writing' | 'aiCheck';
type Msg  = { role: 'user' | 'assistant'; text: string };

const TOOLS: { id: Tool; label: string; color: string }[] = [
  { id: 'summarize',  label: 'Summarize',   color: '#7c3aed' },
  { id: 'explain',    label: 'Explain',     color: '#10b981' },
  { id: 'flashcards', label: 'Flashcards',  color: '#f97316' },
  { id: 'quiz',       label: 'Quiz',        color: '#f59e0b' },
  { id: 'studyGuide', label: 'Study Guide', color: '#3b82f6' },
  { id: 'writing',    label: 'Writing',     color: '#ec4899' },
  { id: 'aiCheck',    label: 'AI Checker',  color: '#64748b' },
];

const NAV = [
  { label: 'Home',     path: '/home'       },
  { label: 'Notes',    path: '/notes'      },
  { label: 'Tasks',    path: '/tasks'      },
  { label: 'AI',       path: '/ai-studio', active: true },
  { label: 'Settings', path: '/settings'   },
];

/* Native HTML inputs — avoids GestureHandler swallowing keystrokes on web */
function NativeInput({ value, onChange, placeholder, multiline = false, onEnter, inputStyle }: any) {
  const base: any = {
    background: 'transparent', border: 'none', outline: 'none',
    fontFamily: 'inherit', fontSize: 14, lineHeight: '22px',
    color: 'inherit', width: '100%', padding: 0, margin: 0,
  };
  if (multiline) {
    return (
      <textarea value={value} onChange={(e: any) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ ...base, resize: 'none', height: '100%', minHeight: 120, ...inputStyle }} />
    );
  }
  return (
    <input value={value} onChange={(e: any) => onChange(e.target.value)}
      placeholder={placeholder}
      onKeyDown={(e: any) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEnter?.(); } }}
      style={{ ...base, ...inputStyle }} />
  );
}

export default function AIStudioScreen() {
  const colors  = useColors();
  const router  = useRouter();
  const { user }= useAuthStore();
  const isWeb   = Platform.OS === 'web';

  const [tool,      setTool]      = useState<Tool>('summarize');
  const [content,   setContent]   = useState('');
  const [chatInput, setChatInput] = useState('');
  const [msgs,      setMsgs]      = useState<Msg[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [canvasText, setCanvasText] = useState('');
  const [flashcards, setFlashcards] = useState<{front:string;back:string}[]>([]);
  const [quiz,       setQuiz]       = useState<{question:string;options:string[];correct:number;explanation:string}[]>([]);
  const [aiResult,   setAiResult]   = useState<any>(null);
  const [flipped,    setFlipped]    = useState<Set<number>>(new Set());
  const [selAns,     setSelAns]     = useState<Record<number,number>>({});
  const [shownAns,   setShownAns]   = useState<Record<number,boolean>>({});

  const [summaryLen,  setSummaryLen]  = useState<'short'|'medium'|'long'>('medium');
  const [explainLvl,  setExplainLvl]  = useState<'beginner'|'intermediate'|'advanced'>('beginner');
  const [cardCount,   setCardCount]   = useState(5);
  const [quizCount,   setQuizCount]   = useState(5);
  const [writeStyle,  setWriteStyle]  = useState<'clarity'|'formal'|'concise'|'humanize'>('clarity');

  const chatRef    = useRef<ScrollView>(null);
  const dragCount  = useRef(0); // prevents flicker when entering child elements
  const scroll     = () => setTimeout(() => chatRef.current?.scrollToEnd({ animated: true }), 80);
  const cur        = TOOLS.find(t => t.id === tool)!;

  const clearCanvas = () => {
    setCanvasText(''); setFlashcards([]); setQuiz([]); setAiResult(null);
    setFlipped(new Set()); setSelAns({}); setShownAns({});
  };

  const errMsg = (e: any) => e.message?.includes('fetch')
    ? 'Proxy unreachable. Run: node canvas-proxy.js\nthen: npx expo start --web --clear'
    : e.message || 'Something went wrong.';

  /* Core generate — accepts optional text so drag-drop can pass file content */
  const generateWith = async (src: string) => {
    if (!src.trim()) return;
    const next: Msg[] = [...msgs, { role: 'user', text: `Generate ${cur.label}` }];
    setMsgs(next); setLoading(true); clearCanvas(); scroll();
    try {
      let reply = '';
      if (tool === 'summarize')  { reply = await claude.summarize(src, summaryLen);          setCanvasText(reply); }
      if (tool === 'explain')    { reply = await claude.explainSimply(src, explainLvl);       setCanvasText(reply); }
      if (tool === 'flashcards') { const c = await claude.generateFlashcards(src, cardCount); setFlashcards(c); reply = `${c.length} flashcards ready.`; }
      if (tool === 'quiz')       { const q = await claude.generateQuiz(src, quizCount);       setQuiz(q);       reply = `${q.length} questions ready.`; }
      if (tool === 'studyGuide') { reply = await claude.generateStudyGuide(src);              setCanvasText(reply); }
      if (tool === 'writing')    { reply = await claude.improveWriting(src, writeStyle);      setCanvasText(reply); }
      if (tool === 'aiCheck')    { const r = await gptzero.check(src);                        setAiResult(r);   reply = `${Math.round(r.score*100)}% AI — ${r.label}`; }
      setMsgs([...next, { role: 'assistant', text: reply }]);
    } catch(e: any) {
      setMsgs([...next, { role: 'assistant', text: '⚠️ ' + errMsg(e) }]);
    } finally { setLoading(false); scroll(); }
  };

  const generate = () => generateWith(content);

  const sendChat = async () => {
    if (!chatInput.trim() || loading) return;
    const q = chatInput.trim();
    const ctx = content ? `Context:\n${content}\n\n` : canvasText ? `Context:\n${canvasText}\n\n` : '';
    const next: Msg[] = [...msgs, { role: 'user', text: q }];
    setMsgs(next); setChatInput(''); setLoading(true); scroll();
    try {
      const r = await claude.explainSimply(`${ctx}${q}`, 'intermediate');
      setMsgs([...next, { role: 'assistant', text: r }]);
    } catch(e: any) {
      setMsgs([...next, { role: 'assistant', text: '⚠️ ' + errMsg(e) }]);
    } finally { setLoading(false); scroll(); }
  };

  /* Drag and drop handlers (web only) */
  const onDragEnter = (e: any) => { e.preventDefault(); dragCount.current++; setIsDragging(true); };
  const onDragLeave = (e: any) => { e.preventDefault(); dragCount.current--; if (dragCount.current <= 0) { dragCount.current = 0; setIsDragging(false); } };
  const onDragOver  = (e: any) => { e.preventDefault(); };
  const onDrop      = (e: any) => {
    e.preventDefault(); dragCount.current = 0; setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = (ev.target?.result as string) || '';
      setContent(text);
      await generateWith(text);
    };
    reader.readAsText(file);
  };

  const Pill = ({ label, active, onPress }: any) => (
    <TouchableOpacity onPress={onPress}
      style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1,
        borderColor: active ? cur.color : colors.border,
        backgroundColor: active ? cur.color : 'transparent' }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#fff' : colors.textSecondary }}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>

      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
            <Zap size={16} color="#fff" fill="#fff" />
          </View>
          <View>
            <Text style={[styles.logoName, { color: colors.text }]}>AI Studio</Text>
            <Text style={[styles.logoSub, { color: colors.textTertiary }]}>Powered by Claude</Text>
          </View>
        </View>

        {isWeb && (
          <View style={styles.navRow}>
            {NAV.map(n => (
              <TouchableOpacity key={n.label} onPress={() => router.push(n.path as any)}>
                <Text style={[styles.navLink, { color: n.active ? colors.primary : colors.textSecondary },
                  n.active && { fontWeight: '700' }]}>{n.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity onPress={() => router.push('/settings')}
          style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarTxt}>{initials(user?.name || 'S')}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Body (drag target wrapper) ── */}
      <View style={{ flex: 1, flexDirection: 'row' }}
        {...(isWeb ? { onDragEnter, onDragLeave, onDragOver, onDrop } : {})}>

        {/* ─── LEFT: Claude Output ─── */}
        <View style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRightWidth: 0.5, borderRightColor: colors.border }}>
          {/* Panel header */}
          <View style={[styles.panelHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: cur.color }} />
              <Text style={[styles.panelLabel, { color: colors.textTertiary }]}>CLAUDE OUTPUT</Text>
            </View>
            {msgs.length > 0 && (
              <TouchableOpacity onPress={() => { setMsgs([]); clearCanvas(); }}
                style={[styles.clearBtn, { borderColor: colors.border }]}>
                <RotateCcw size={11} color={colors.textTertiary} />
                <Text style={{ fontSize: 11, color: colors.textTertiary }}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Messages + results */}
          <ScrollView ref={chatRef} style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1, gap: 10, padding: 16, paddingBottom: 12 }}>

            {msgs.length === 0 && !loading && (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIcon, { backgroundColor: cur.color + '20' }]}>
                  <Zap size={28} color={cur.color} fill={cur.color} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Ready to generate</Text>
                <Text style={[styles.emptyDesc, { color: colors.textTertiary }]}>
                  Paste content on the right and click Generate,{'\n'}or drag & drop a file anywhere
                </Text>
              </View>
            )}

            {msgs.map((m, i) => (
              <View key={i} style={[styles.bubble,
                m.role === 'user'
                  ? { backgroundColor: cur.color, alignSelf: 'flex-end' as any, maxWidth: '85%' }
                  : [styles.aiBubble, { backgroundColor: colors.card, borderColor: colors.border }]]}>
                {m.role === 'assistant' && <Text style={[styles.bubbleLbl, { color: cur.color }]}>Claude</Text>}
                <Text style={[styles.bubbleTxt, { color: m.role === 'user' ? '#fff' : colors.text }]}>{m.text}</Text>
              </View>
            ))}

            {/* Inline results */}
            {canvasText !== '' && (
              <View style={[styles.aiBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={[styles.bubbleLbl, { color: cur.color }]}>{cur.label}</Text>
                  <TouchableOpacity onPress={async () => { await Clipboard.setStringAsync(canvasText); }}>
                    <Copy size={12} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>
                <Text style={{ color: colors.text, fontSize: 13, lineHeight: 20 }}>{canvasText}</Text>
              </View>
            )}

            {flashcards.map((card, i) => (
              <TouchableOpacity key={i} onPress={() => { const f = new Set(flipped); f.has(i)?f.delete(i):f.add(i); setFlipped(f); }}>
                <View style={[styles.aiBubble, { backgroundColor: colors.card, borderColor: flipped.has(i) ? colors.success : colors.border }]}>
                  <Text style={[styles.bubbleLbl, { color: flipped.has(i) ? colors.success : cur.color }]}>{flipped.has(i) ? 'Answer' : 'Question'}</Text>
                  <Text style={{ color: colors.text, fontSize: 13 }}>{flipped.has(i) ? card.back : card.front}</Text>
                  <Text style={{ color: colors.textTertiary, fontSize: 11, marginTop: 4 }}>Tap to flip</Text>
                </View>
              </TouchableOpacity>
            ))}

            {quiz.map((q, qi) => (
              <View key={qi} style={[styles.aiBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.bubbleLbl, { color: cur.color }]}>Q{qi+1}</Text>
                <Text style={{ color: colors.text, fontSize: 13, marginBottom: 8 }}>{q.question}</Text>
                {q.options.map((opt, oi) => {
                  const sel=selAns[qi]===oi; const rev=shownAns[qi]; const ok=oi===q.correct;
                  const bg = rev&&ok ? colors.success+'20' : rev&&sel&&!ok ? colors.error+'20' : sel ? colors.primaryLight : colors.bg;
                  const bc = rev&&ok ? colors.success : rev&&sel&&!ok ? colors.error : sel ? cur.color : colors.border;
                  return (
                    <TouchableOpacity key={oi} disabled={!!shownAns[qi]} onPress={()=>setSelAns({...selAns,[qi]:oi})}
                      style={{ borderWidth:1, borderRadius:8, padding:8, marginBottom:4, backgroundColor:bg, borderColor:bc }}>
                      <Text style={{ fontSize:12, color:colors.text }}>{String.fromCharCode(65+oi)}. {opt}</Text>
                    </TouchableOpacity>
                  );
                })}
                {selAns[qi]!==undefined && !shownAns[qi] && (
                  <TouchableOpacity onPress={()=>setShownAns({...shownAns,[qi]:true})}>
                    <Text style={{ color:cur.color, fontSize:12, fontWeight:'600', marginTop:4 }}>Show Answer</Text>
                  </TouchableOpacity>
                )}
                {shownAns[qi] && <Text style={{ color:colors.success, fontSize:12, marginTop:4 }}>✓ {q.explanation}</Text>}
              </View>
            ))}

            {aiResult && (
              <View style={[styles.aiBubble, { backgroundColor: colors.card, borderColor: colors.border, alignItems: 'center' }]}>
                <Text style={[styles.bubbleLbl, { color: cur.color }]}>AI Detection</Text>
                <Text style={{ fontSize:40, fontWeight:'800', color: aiResult.score>0.7?colors.error:aiResult.score>0.3?colors.warning:colors.success }}>
                  {Math.round(aiResult.score*100)}%
                </Text>
                <Badge variant={aiResult.label==='HUMAN'?'success':aiResult.label==='AI'?'error':'warning'}>{aiResult.label}</Badge>
              </View>
            )}

            {loading && (
              <View style={[styles.aiBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.bubbleLbl, { color: cur.color }]}>Claude</Text>
                <ActivityIndicator size="small" color={cur.color} style={{ alignSelf: 'flex-start' }} />
              </View>
            )}
          </ScrollView>

          {/* Chat input at bottom of output panel */}
          <View style={[styles.chatRow, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
            <View style={{ flex: 1, color: colors.text } as any}>
              {isWeb && (
                <NativeInput value={chatInput} onChange={setChatInput} onEnter={sendChat}
                  placeholder="Ask Claude a follow-up…"
                  inputStyle={{ color: colors.text }} />
              )}
            </View>
            <TouchableOpacity onPress={sendChat} disabled={loading || !chatInput.trim()}
              style={[styles.sendBtn, { backgroundColor: chatInput.trim() ? cur.color : colors.border }]}>
              <Send size={13} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── RIGHT: Input Panel ─── */}
        <View style={{ width: 360, flexDirection: 'column', alignSelf: 'stretch' }}>
          {/* Tool picker */}
          <View style={[styles.toolBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 14, paddingVertical: 10 }}>
              {TOOLS.map(t => (
                <TouchableOpacity key={t.id} onPress={() => { setTool(t.id); clearCanvas(); }}
                  style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
                    borderColor: tool === t.id ? t.color : colors.border,
                    backgroundColor: tool === t.id ? t.color : 'transparent' }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: tool === t.id ? '#fff' : colors.textSecondary }}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Main area: textarea grows, controls stay at bottom */}
          <View style={{ flex: 1, padding: 12, flexDirection: 'column' }}>
            <Text style={[styles.panelLabel, { color: colors.textTertiary, marginBottom: 8 }]}>YOUR CONTENT</Text>

            {/* Textarea — takes all remaining vertical space */}
            <View style={[styles.textareaBox, { backgroundColor: colors.bg, borderColor: colors.border, flex: 1, minHeight: 80 }]}>
              {isWeb && (
                <NativeInput value={content} onChange={setContent}
                  placeholder={'Paste notes or study material here…\n\nDrag & drop a .txt file anywhere to auto-analyze.'}
                  multiline
                  inputStyle={{ color: colors.text }} />
              )}
            </View>

            {/* Bottom controls — never pushed off screen */}
            <View style={{ flexShrink: 0, marginTop: 10 }}>
              {/* Options row */}
              <View style={[styles.optRow, { marginBottom: 8 }]}>
                {tool === 'summarize' && (<>
                  <Text style={[styles.optLabel, { color: colors.textSecondary }]}>Length:</Text>
                  {(['short','medium','long'] as const).map(l => <Pill key={l} label={l} active={summaryLen===l} onPress={()=>setSummaryLen(l)} />)}
                </>)}
                {tool === 'explain' && (<>
                  <Text style={[styles.optLabel, { color: colors.textSecondary }]}>Level:</Text>
                  {(['beginner','intermediate','advanced'] as const).map(l => <Pill key={l} label={l} active={explainLvl===l} onPress={()=>setExplainLvl(l)} />)}
                </>)}
                {tool === 'flashcards' && (<>
                  <Text style={[styles.optLabel, { color: colors.textSecondary }]}>Cards:</Text>
                  {[3,5,8,10].map(n => <Pill key={n} label={`${n}`} active={cardCount===n} onPress={()=>setCardCount(n)} />)}
                </>)}
                {tool === 'quiz' && (<>
                  <Text style={[styles.optLabel, { color: colors.textSecondary }]}>Questions:</Text>
                  {[3,5,10].map(n => <Pill key={n} label={`${n}`} active={quizCount===n} onPress={()=>setQuizCount(n)} />)}
                </>)}
                {tool === 'writing' && (<>
                  <Text style={[styles.optLabel, { color: colors.textSecondary }]}>Style:</Text>
                  {(['clarity','formal','concise','humanize'] as const).map(o => <Pill key={o} label={o} active={writeStyle===o} onPress={()=>setWriteStyle(o)} />)}
                </>)}
              </View>

              {/* Generate button */}
              <TouchableOpacity onPress={generate} disabled={loading || !content.trim()}
                style={[styles.genBtn, { backgroundColor: content.trim() ? cur.color : colors.border }]}>
                {loading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.genTxt}>Generate {cur.label}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ─── Drag overlay (web only) ─── */}
        {isWeb && isDragging && (
          <View style={[styles.dragOverlay]}
            {...{ onDragOver, onDrop, onDragLeave }}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header:      { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:20, paddingVertical:10, borderBottomWidth:0.5 },
  logoBox:     { width:34, height:34, borderRadius:9, alignItems:'center', justifyContent:'center' },
  logoName:    { fontSize:15, fontWeight:'800' },
  logoSub:     { fontSize:10 },
  navRow:      { flexDirection:'row', alignItems:'center', gap:24 },
  navLink:     { fontSize:14, fontWeight:'500' },
  avatar:      { width:32, height:32, borderRadius:16, alignItems:'center', justifyContent:'center' },
  avatarTxt:   { color:'#fff', fontSize:13, fontWeight:'700' },
  toolBar:     { borderBottomWidth:0.5 },
  panelHeader: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:10, borderBottomWidth:0.5 },
  panelLabel:  { fontSize:11, fontWeight:'700', textTransform:'uppercase', letterSpacing:0.8 },
  textareaBox: { borderWidth:0.5, borderRadius:12, padding:14 },
  optRow:      { flexDirection:'row', alignItems:'center', flexWrap:'wrap', gap:8 },
  optLabel:    { fontSize:13, fontWeight:'500' },
  genBtn:      { paddingVertical:12, borderRadius:12, alignItems:'center', justifyContent:'center' },
  genTxt:      { color:'#fff', fontWeight:'700', fontSize:15 },
  bubble:      { borderRadius:10, padding:10 },
  aiBubble:    { borderWidth:0.5, borderRadius:10, padding:10 },
  bubbleLbl:   { fontSize:10, fontWeight:'700', textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 },
  bubbleTxt:   { fontSize:13, lineHeight:19 },
  clearBtn:    { flexDirection:'row', alignItems:'center', gap:4, paddingHorizontal:8, paddingVertical:4, borderRadius:6, borderWidth:0.5 },
  chatRow:     { flexDirection:'row', alignItems:'center', gap:8, paddingHorizontal:16, paddingVertical:10, borderTopWidth:0.5 },
  sendBtn:     { width:28, height:28, borderRadius:14, alignItems:'center', justifyContent:'center', flexShrink:0 },
  emptyState:  { flex:1, alignItems:'center', justifyContent:'center', paddingVertical:60 },
  emptyIcon:   { width:64, height:64, borderRadius:20, alignItems:'center', justifyContent:'center', marginBottom:14 },
  emptyTitle:  { fontSize:16, fontWeight:'700', marginBottom:6 },
  emptyDesc:   { fontSize:13, textAlign:'center', lineHeight:20 },
  dragOverlay: {
    position:'absolute' as any, top:0, left:0, right:0, bottom:0,
    backgroundColor:'rgba(0,0,0,0.55)',
    alignItems:'center', justifyContent:'center',
    zIndex: 99,
  },
  dragBox: {
    alignItems:'center', gap:14, padding:48, borderRadius:24,
    borderWidth:2, borderStyle:'dashed' as any,
    shadowOffset:{ width:0, height:8 }, shadowOpacity:0.2, shadowRadius:24,
  },
  dragIconWrap: { width:80, height:80, borderRadius:24, alignItems:'center', justifyContent:'center' },
  dragTitle:   { fontSize:22, fontWeight:'800' },
  dragSub:     { fontSize:14, textAlign:'center', lineHeight:22 },
});
