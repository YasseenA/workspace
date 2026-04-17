import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Platform, TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Layers, Plus, Trash2, X, Check, ChevronRight, Brain } from 'lucide-react-native';
import { useFlashcardsStore } from '../../store/flashcards';
import { useColors } from '../../lib/theme';
import TabBar from '../../components/layout/TabBar';
import TopBar from '../../components/layout/TopBar';
import { showAlert } from '../../utils/helpers';

export default function FlashcardsScreen() {
  const colors  = useColors();
  const router  = useRouter();
  const { decks, createDeck, deleteDeck, dueCount } = useFlashcardsStore();

  const [showCreate, setShowCreate] = useState(false);
  const [deckName,   setDeckName]   = useState('');

  const handleCreate = async () => {
    if (!deckName.trim()) return;
    await createDeck(deckName.trim(), []);
    setDeckName('');
    setShowCreate(false);
  };

  const handleDelete = (id: string, name: string) => {
    showAlert(
      'Delete Deck',
      `Delete "${name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteDeck(id) },
      ]
    );
  };

  const totalDue = decks.reduce((acc, d) => acc + dueCount(d.id), 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar />

      <View style={[styles.header, { borderBottomColor: colors.border }, Platform.OS === 'web' && { marginTop: 50 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <View style={[styles.logoBox, { backgroundColor: '#f97316' }]}>
            <Brain size={15} color="#fff" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Flashcards</Text>
          {totalDue > 0 && (
            <View style={{ backgroundColor: '#ef4444', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 }}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{totalDue} due</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={() => setShowCreate(true)} style={[styles.addBtn, { backgroundColor: '#f97316' }]}>
          <Plus size={15} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>New Deck</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}>
        {decks.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: '#f9731618' }]}>
              <Layers size={32} color="#f97316" />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No decks yet</Text>
            <Text style={[styles.emptyDesc, { color: colors.textTertiary }]}>
              Create a deck manually or save flashcards{'\n'}from AI Studio directly into a deck.
            </Text>
            <TouchableOpacity onPress={() => setShowCreate(true)} style={[styles.emptyBtn, { backgroundColor: '#f97316' }]}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Create First Deck</Text>
            </TouchableOpacity>
          </View>
        ) : (
          decks.map(deck => {
            const due  = dueCount(deck.id);
            const total = deck.cards.length;
            return (
              <TouchableOpacity
                key={deck.id}
                onPress={() => router.push(`/flashcards/review?deckId=${deck.id}` as any)}
                style={[styles.deckCard, { backgroundColor: colors.card, borderColor: due > 0 ? '#f97316' : colors.border }]}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.deckName, { color: colors.text }]}>{deck.name}</Text>
                  <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 2 }}>
                    {total} card{total !== 1 ? 's' : ''}
                    {due > 0 ? ` · ` : ''}
                    {due > 0 && <Text style={{ color: '#f97316', fontWeight: '600' }}>{due} due</Text>}
                    {due === 0 && total > 0 ? ' · All caught up ✓' : ''}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  {due > 0 && (
                    <View style={{ backgroundColor: '#f97316', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Review</Text>
                    </View>
                  )}
                  <TouchableOpacity onPress={() => handleDelete(deck.id, deck.name)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                    <Trash2 size={15} color={colors.textTertiary} />
                  </TouchableOpacity>
                  <ChevronRight size={15} color={colors.textTertiary} />
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Create deck modal */}
      <Modal visible={showCreate} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>New Deck</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)}>
                <X size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
            <TextInput
              value={deckName}
              onChangeText={setDeckName}
              placeholder="Deck name (e.g. Biology Ch.5)"
              placeholderTextColor={colors.textTertiary}
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
              autoFocus
              onSubmitEditing={handleCreate}
            />
            <TouchableOpacity
              onPress={handleCreate}
              disabled={!deckName.trim()}
              style={[styles.createBtn, { backgroundColor: deckName.trim() ? '#f97316' : colors.border }]}
            >
              <Check size={15} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Create Deck</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <TabBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  logoBox:   { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  title:     { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  addBtn:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },

  deckCard:  { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 14 },
  deckName:  { fontSize: 15, fontWeight: '700' },

  empty:     { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyIcon: { width: 68, height: 68, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  emptyTitle:{ fontSize: 18, fontWeight: '700' },
  emptyDesc: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  emptyBtn:  { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 4 },

  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modal:     { width: '100%', maxWidth: 400, borderRadius: 20, padding: 20, borderWidth: 0.5 },
  modalTitle:{ fontSize: 17, fontWeight: '700' },
  input:     { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15, marginBottom: 12 },
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, borderRadius: 12 },
});
