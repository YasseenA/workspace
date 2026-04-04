import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Save, Hash, Star, Pin, Zap, BookOpen } from 'lucide-react-native';
import { useNotesStore } from '../../store/notes';
import { Button, Badge } from '../../components/ui';
import { colors } from '../../lib/theme';
import { wordCount } from '../../utils/helpers';
import { claude } from '../../lib/claude';

export default function NoteEditorScreen() {
  const router = useRouter();
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

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert('Title Required', 'Please add a title.'); return; }
    setIsSaving(true);
    try {
      if (existingNote || noteId) {
        updateNote(noteId || existingNote!.id, { title, content, tags });
      } else {
        const note = createNote({ title, content, tags });
        setNoteId(note.id);
      }
      router.back();
    } catch(e: any) { Alert.alert('Error', e.message); }
    finally { setIsSaving(false); }
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (tag && !tags.includes(tag)) { setTags([...tags, tag]); setTagInput(''); }
  };

  const runAI = async (mode: typeof aiMode) => {
    if (!content.trim()) { Alert.alert('Add some content first!'); return; }
    setAiMode(mode); setIsAI(true); setAiOutput('');
    try {
      let result = '';
      if (mode === 'summarize') result = await claude.summarize(content, 'medium');
      else if (mode === 'explain') result = await claude.explainSimply(content, 'beginner');
      else if (mode === 'studyGuide') result = await claude.generateStudyGuide(content);
      setAiOutput(result);
    } catch(e: any) { Alert.alert('AI Error', e.message); setIsAI(false); }
  };

  const wc = wordCount(content);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.wordCount}>{wc} words</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {existingNote && (
              <>
                <TouchableOpacity onPress={() => togglePin(existingNote.id)} style={styles.iconBtn}>
                  <Pin size={16} color={existingNote.isPinned ? colors.warning : colors.textTertiary} fill={existingNote.isPinned ? colors.warning : 'none'} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => toggleFavorite(existingNote.id)} style={styles.iconBtn}>
                  <Star size={16} color={existingNote.isFavorite ? colors.warning : colors.textTertiary} fill={existingNote.isFavorite ? colors.warning : 'none'} />
                </TouchableOpacity>
              </>
            )}
            <Button variant="primary" size="sm" onPress={handleSave} loading={isSaving} leftIcon={<Save size={14} color="#fff" />}>Save</Button>
          </View>
        </View>

        {/* AI toolbar */}
        <View style={styles.aiBar}>
          <Zap size={14} color={colors.accent} />
          <Text style={styles.aiBarLabel}>AI:</Text>
          {[{ key: 'summarize', label: 'Summarize' }, { key: 'explain', label: 'Explain Simply' }, { key: 'studyGuide', label: 'Study Guide' }].map(a => (
            <TouchableOpacity key={a.key} onPress={() => runAI(a.key as any)} style={[styles.aiChip, isAI && aiMode === a.key && styles.aiChipActive]}>
              <Text style={[styles.aiChipText, isAI && aiMode === a.key && { color: '#fff' }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
          {isAI && <TouchableOpacity onPress={() => { setIsAI(false); setAiOutput(''); }} style={styles.aiClose}><Text style={{ color: colors.error, fontSize: 12 }}>✕</Text></TouchableOpacity>}
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {/* AI output */}
          {isAI && (
            <View style={styles.aiOutput}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Zap size={14} color={colors.accent} />
                <Text style={{ fontWeight: '700', color: colors.accent, fontSize: 13 }}>Claude AI</Text>
              </View>
              {aiOutput ? (
                <>
                  <Text style={{ color: colors.text, lineHeight: 22, fontSize: 14 }}>{aiOutput}</Text>
                  <TouchableOpacity onPress={() => { setContent(content + '\n\n---\nAI Summary:\n' + aiOutput); setIsAI(false); }} style={{ marginTop: 10 }}>
                    <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>Insert into note</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={{ color: colors.textTertiary, fontSize: 13 }}>Generating with Claude...</Text>
              )}
            </View>
          )}

          {/* Title */}
          <TextInput
            style={styles.titleInput} placeholder="Note title..." placeholderTextColor={colors.textTertiary}
            value={title} onChangeText={setTitle} multiline returnKeyType="next"
          />

          {/* Tags */}
          <View style={styles.tagsRow}>
            {tags.map(tag => (
              <TouchableOpacity key={tag} onPress={() => setTags(tags.filter(t => t !== tag))}>
                <Badge variant="primary" size="sm">#{tag} ✕</Badge>
              </TouchableOpacity>
            ))}
            <View style={styles.tagInputRow}>
              <Hash size={12} color={colors.textTertiary} />
              <TextInput style={styles.tagInput} placeholder="add tag..." placeholderTextColor={colors.textTertiary}
                value={tagInput} onChangeText={setTagInput} onSubmitEditing={addTag} returnKeyType="done" />
            </View>
          </View>

          <View style={styles.divider} />

          {/* Content */}
          <TextInput
            style={styles.contentInput} placeholder="Start writing your note..." placeholderTextColor={colors.textTertiary}
            value={content} onChangeText={setContent} multiline scrollEnabled={false} textAlignVertical="top"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 0.5, borderColor: colors.border },
  wordCount: { fontSize: 12, color: colors.textTertiary },
  aiBar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.primaryLight, borderBottomWidth: 0.5, borderBottomColor: '#c7d2fe' },
  aiBarLabel: { fontSize: 12, fontWeight: '700', color: colors.accent },
  aiChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#c7d2fe' },
  aiChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  aiChipText: { fontSize: 12, color: colors.accent, fontWeight: '500' },
  aiClose: { marginLeft: 4 },
  aiOutput: { backgroundColor: colors.primaryLight, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 0.5, borderColor: '#c7d2fe' },
  titleInput: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 12, padding: 0 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12, alignItems: 'center' },
  tagInputRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tagInput: { fontSize: 13, color: colors.text, minWidth: 80 },
  divider: { height: 0.5, backgroundColor: colors.border, marginBottom: 16 },
  contentInput: { fontSize: 16, color: colors.text, lineHeight: 26, minHeight: 300 },
});
