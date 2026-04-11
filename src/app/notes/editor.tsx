import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Save, Hash, Star, Pin, Zap, Pencil, Eraser, Trash2, RotateCcw } from 'lucide-react-native';
import { useNotesStore } from '../../store/notes';
import { Button, Badge } from '../../components/ui';
import { useColors } from '../../lib/theme';
import { wordCount, showAlert } from '../../utils/helpers';
import { claude } from '../../lib/claude';

type EditorMode = 'write' | 'draw';

export default function NoteEditorScreen() {
  const router = useRouter();
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { notes, createNote, updateNote, togglePin, toggleFavorite } = useNotesStore();
  const existingNote = id ? notes.find(n => n.id === id) : null;

  const [title, setTitle] = useState(existingNote?.title || '');
  const [content, setContent] = useState(existingNote?.content || '');
  const [tags, setTags] = useState<string[]>(existingNote?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isAI, setIsAI] = useState(false);
  const [aiOutput, setAiOutput] = useState('');
  const [aiMode, setAiMode] = useState<'summarize'|'explain'|'studyGuide'|null>(null);
  const [noteId, setNoteId] = useState(id || '');
  const [mode, setMode] = useState<EditorMode>('write');
  const [images, setImages] = useState<string[]>(existingNote?.images || []);

  // Drawing state (web only)
  const canvasRef = useRef<any>(null);
  const isDrawingRef = useRef(false);
  const [drawColor, setDrawColor] = useState('#7c3aed');
  const [brushSize, setBrushSize] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (mode === 'draw' && Platform.OS === 'web' && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight || 400;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = colors.card;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [mode, colors.card]);

  const getPos = (e: any, canvas: any) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (e: any) => {
    if (!canvasRef.current) return;
    isDrawingRef.current = true;
    lastPos.current = getPos(e, canvasRef.current);
  };

  const draw = (e: any) => {
    if (!isDrawingRef.current || !canvasRef.current || !lastPos.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = isEraser ? colors.card : drawColor;
    ctx.lineWidth = isEraser ? brushSize * 4 : brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPos.current = pos;
  };

  const endDraw = () => { isDrawingRef.current = false; lastPos.current = null; };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = colors.card;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const insertDrawing = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    setImages(prev => [...prev, dataUrl]);
    setMode('write');
  };

  const handleSave = async () => {
    if (!title.trim()) { showAlert('Title Required', 'Please add a title.'); return; }
    setIsSaving(true);
    try {
      if (existingNote || noteId) {
        updateNote(noteId || existingNote!.id, { title, content, tags, images });
      } else {
        const note = createNote({ title, content, tags, images });
        setNoteId(note.id);
      }
      router.back();
    } catch(e: any) { showAlert('Error', e.message); }
    finally { setIsSaving(false); }
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (tag && !tags.includes(tag)) { setTags([...tags, tag]); setTagInput(''); }
  };

  const runAI = async (aiModeKey: typeof aiMode) => {
    if (!content.trim()) { showAlert('Add some content first!'); return; }
    setAiMode(aiModeKey); setIsAI(true); setAiOutput('');
    try {
      let result = '';
      if (aiModeKey === 'summarize') result = await claude.summarize(content, 'medium');
      else if (aiModeKey === 'explain') result = await claude.explainSimply(content, 'beginner');
      else if (aiModeKey === 'studyGuide') result = await claude.generateStudyGuide(content);
      setAiOutput(result);
    } catch(e: any) { showAlert('AI Error', e.message); setIsAI(false); }
  };

  const wc = wordCount(content);

  const DRAW_COLORS = ['#7c3aed','#ef4444','#10b981','#f97316','#3b82f6','#ec4899','#0a0a12','#ffffff'];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.card }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.iconBtn, { borderColor: colors.border }]}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity onPress={() => setMode('write')} style={[styles.modeBtn, { backgroundColor: mode === 'write' ? colors.primary + '20' : 'transparent', borderColor: colors.border }]}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: mode === 'write' ? colors.primary : colors.textSecondary }}>Write</Text>
            </TouchableOpacity>
            {Platform.OS === 'web' && (
              <TouchableOpacity onPress={() => setMode('draw')} style={[styles.modeBtn, { backgroundColor: mode === 'draw' ? colors.accent + '20' : 'transparent', borderColor: colors.border }]}>
                <Pencil size={12} color={mode === 'draw' ? colors.accent : colors.textSecondary} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: mode === 'draw' ? colors.accent : colors.textSecondary }}>Draw</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={{ fontSize: 12, color: colors.textTertiary }}>{wc} words</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {existingNote && (
              <>
                <TouchableOpacity onPress={() => togglePin(existingNote.id)} style={[styles.iconBtn, { borderColor: colors.border }]}>
                  <Pin size={16} color={existingNote.isPinned ? colors.warning : colors.textTertiary} fill={existingNote.isPinned ? colors.warning : 'none'} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => toggleFavorite(existingNote.id)} style={[styles.iconBtn, { borderColor: colors.border }]}>
                  <Star size={16} color={existingNote.isFavorite ? colors.warning : colors.textTertiary} fill={existingNote.isFavorite ? colors.warning : 'none'} />
                </TouchableOpacity>
              </>
            )}
            <Button variant="primary" size="sm" onPress={handleSave} loading={isSaving} leftIcon={<Save size={14} color="#fff" />}>Save</Button>
          </View>
        </View>

        {mode === 'write' ? (
          <>
            {/* AI toolbar */}
            <View style={[styles.aiBar, { backgroundColor: colors.primaryLight, borderBottomColor: colors.border }]}>
              <Zap size={14} color={colors.accent} />
              <Text style={[styles.aiBarLabel, { color: colors.accent }]}>AI:</Text>
              {[{ key: 'summarize', label: 'Summarize' }, { key: 'explain', label: 'Explain' }, { key: 'studyGuide', label: 'Study Guide' }].map(a => (
                <TouchableOpacity key={a.key} onPress={() => runAI(a.key as any)}
                  style={[styles.aiChip, { borderColor: colors.border }, isAI && aiMode === a.key && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
                  <Text style={[styles.aiChipText, { color: isAI && aiMode === a.key ? '#fff' : colors.accent }]}>{a.label}</Text>
                </TouchableOpacity>
              ))}
              {isAI && <TouchableOpacity onPress={() => { setIsAI(false); setAiOutput(''); }}><Text style={{ color: colors.error, fontSize: 12 }}>✕</Text></TouchableOpacity>}
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
              {/* AI output */}
              {isAI && (
                <View style={[styles.aiOutput, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Zap size={14} color={colors.accent} />
                    <Text style={{ fontWeight: '700', color: colors.accent, fontSize: 13 }}>Claude AI</Text>
                  </View>
                  {aiOutput ? (
                    <>
                      <Text style={{ color: colors.text, lineHeight: 22, fontSize: 14 }}>{aiOutput}</Text>
                      <TouchableOpacity onPress={() => { setContent(content + '\n\n---\nAI:\n' + aiOutput); setIsAI(false); }} style={{ marginTop: 10 }}>
                        <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>Insert into note</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <Text style={{ color: colors.textTertiary, fontSize: 13 }}>Generating with Claude...</Text>
                  )}
                </View>
              )}

              <TextInput
                style={[styles.titleInput, { color: colors.text }, Platform.OS === 'web' && { outlineWidth: 0 } as any]}
                placeholder="Note title..." placeholderTextColor={colors.textTertiary}
                value={title} onChangeText={setTitle} multiline
              />

              <View style={styles.tagsRow}>
                {tags.map(tag => (
                  <TouchableOpacity key={tag} onPress={() => setTags(tags.filter(t => t !== tag))}>
                    <Badge variant="primary" size="sm">#{tag} ✕</Badge>
                  </TouchableOpacity>
                ))}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Hash size={12} color={colors.textTertiary} />
                  <TextInput style={[styles.tagInput, { color: colors.text }, Platform.OS === 'web' && { outlineWidth: 0 } as any]}
                    placeholder="add tag..." placeholderTextColor={colors.textTertiary}
                    value={tagInput} onChangeText={setTagInput} onSubmitEditing={addTag} />
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <TextInput
                style={[styles.contentInput, { color: colors.text }, Platform.OS === 'web' && { outlineWidth: 0, resize: 'none' } as any]}
                placeholder="Start writing your note..." placeholderTextColor={colors.textTertiary}
                value={content} onChangeText={setContent} multiline scrollEnabled={false} textAlignVertical="top"
              />

              {/* Inserted drawings — rendered as real images */}
              {images.length > 0 && (
                <View style={{ gap: 12, marginTop: 16 }}>
                  {images.map((src, i) => (
                    <View key={i} style={{ position: 'relative' }}>
                      {Platform.OS === 'web' ? (
                        // @ts-ignore
                        <img
                          src={src}
                          alt={`Drawing ${i + 1}`}
                          style={{ width: '100%', borderRadius: 12, display: 'block', border: `1px solid ${colors.border}` } as any}
                        />
                      ) : null}
                      <TouchableOpacity
                        onPress={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                        style={[styles.imgDeleteBtn, { backgroundColor: colors.error }]}
                      >
                        <Trash2 size={12} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </>
        ) : (
          /* Drawing mode */
          <View style={{ flex: 1 }}>
            {/* Drawing toolbar */}
            <View style={[styles.drawBar, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 }}>
                {DRAW_COLORS.map(c => (
                  <TouchableOpacity key={c} onPress={() => { setDrawColor(c); setIsEraser(false); }}
                    style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c, borderWidth: drawColor === c && !isEraser ? 3 : 1, borderColor: colors.border }} />
                ))}
                <View style={{ width: 1, height: 24, backgroundColor: colors.border, marginHorizontal: 4 }} />
                {[2, 4, 8].map(s => (
                  <TouchableOpacity key={s} onPress={() => setBrushSize(s)}
                    style={[styles.sizeBtn, { borderColor: brushSize === s ? colors.primary : colors.border }]}>
                    <View style={{ width: s * 2, height: s * 2, borderRadius: s, backgroundColor: colors.text }} />
                  </TouchableOpacity>
                ))}
                <TouchableOpacity onPress={() => setIsEraser(!isEraser)} style={[styles.toolBtn, { backgroundColor: isEraser ? colors.error + '20' : 'transparent', borderColor: colors.border }]}>
                  <Eraser size={16} color={isEraser ? colors.error : colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={clearCanvas} style={[styles.toolBtn, { borderColor: colors.border }]}>
                  <Trash2 size={16} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={insertDrawing} style={[styles.insertBtn, { backgroundColor: colors.primary }]}>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Insert into Note</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {Platform.OS === 'web' && (
              <canvas
                ref={canvasRef}
                style={{ flex: 1, width: '100%', cursor: isEraser ? 'cell' : 'crosshair', touchAction: 'none', backgroundColor: colors.card } as any}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: 0.5, gap: 8, flexWrap: 'wrap' },
  iconBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 0.5 },
  modeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 0.5 },
  aiBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 9, borderBottomWidth: 0.5 },
  aiBarLabel: { fontSize: 12, fontWeight: '700' },
  aiChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: 'transparent', borderWidth: 0.5 },
  aiChipText: { fontSize: 12, fontWeight: '600' },
  aiOutput: { borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 0.5 },
  titleInput: { fontSize: 26, fontWeight: '800', marginBottom: 12, padding: 0, borderWidth: 0, letterSpacing: -0.5 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12, alignItems: 'center' },
  tagInput: { fontSize: 13, minWidth: 80, borderWidth: 0 },
  divider: { height: 0.5, marginBottom: 16 },
  contentInput: { fontSize: 16, lineHeight: 27, minHeight: 300, borderWidth: 0 },
  drawBar: { paddingVertical: 10, borderBottomWidth: 0.5 },
  sizeBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  toolBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  insertBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, marginLeft: 8 },
  imgDeleteBtn: { position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});
