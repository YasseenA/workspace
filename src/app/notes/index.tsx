import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, FlatList,
  TouchableOpacity, StyleSheet, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Search, Plus, Pin, Star,
  MoreVertical, Grid2x2, List, Trash2, BookOpen,
} from 'lucide-react-native';
import { useNotesStore } from '../../store/notes';
import { EmptyState } from '../../components/ui';
import TabBar from '../../components/layout/TabBar';
import { useColors } from '../../lib/theme';
import { fmt, showAlert } from '../../utils/helpers';

export default function NotesScreen() {
  const router = useRouter();
  const colors = useColors();
  const { notes, notebooks, togglePin, toggleFavorite, deleteNote } = useNotesStore();
  const [search,          setSearch]          = useState('');
  const [viewMode,        setViewMode]        = useState<'list' | 'grid'>('list');
  const [activeNotebook,  setActiveNotebook]  = useState<string | null>(null);
  const [showMore,        setShowMore]        = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = notes;
    if (activeNotebook) result = result.filter(n => n.notebookId === activeNotebook);
    if (search)         result = result.filter(n =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase())
    );
    return [...result.filter(n => n.isPinned), ...result.filter(n => !n.isPinned)];
  }, [notes, search, activeNotebook]);

  const handleDelete = (id: string) => {
    showAlert('Delete Note', 'This can\'t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteNote(id); setShowMore(null); } },
    ]);
  };

  const NoteCard = ({ item }: any) => (
    <TouchableOpacity
      onPress={() => { setShowMore(null); router.push({ pathname: '/notes/editor', params: { id: item.id } }); }}
      style={viewMode === 'grid' ? { flex: 1, margin: 5 } : { marginBottom: 10 }}
      activeOpacity={0.7}
    >
      <View style={[styles.noteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Context menu */}
        {showMore === item.id && (
          <View style={[styles.menu, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity onPress={() => { togglePin(item.id); setShowMore(null); }} style={styles.menuItem}>
              <Pin size={14} color={colors.primary} />
              <Text style={[styles.menuLabel, { color: colors.text }]}>{item.isPinned ? 'Unpin' : 'Pin'}</Text>
            </TouchableOpacity>
            <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity onPress={() => { toggleFavorite(item.id); setShowMore(null); }} style={styles.menuItem}>
              <Star size={14} color={colors.warning} />
              <Text style={[styles.menuLabel, { color: colors.text }]}>{item.isFavorite ? 'Unfavorite' : 'Favorite'}</Text>
            </TouchableOpacity>
            <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.menuItem}>
              <Trash2 size={14} color={colors.error} />
              <Text style={[styles.menuLabel, { color: colors.error }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ padding: 14 }}>
          <View style={styles.noteHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 }}>
              {item.isPinned  && <Pin  size={11} color={colors.warning} />}
              {item.isFavorite && <Star size={11} color={colors.warning} fill={colors.warning} />}
              <Text style={[styles.noteTitle, { color: colors.text }]} numberOfLines={1}>
                {item.title || 'Untitled'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowMore(showMore === item.id ? null : item.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MoreVertical size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.noteExcerpt, { color: colors.textSecondary }]} numberOfLines={viewMode === 'grid' ? 4 : 2}>
            {item.excerpt || 'No content yet'}
          </Text>

          <View style={styles.noteMeta}>
            <Text style={[styles.metaText, { color: colors.textTertiary }]}>{fmt.relative(item.updatedAt)}</Text>
            {item.wordCount > 0 && (
              <>
                <Text style={[styles.metaDot, { color: colors.textTertiary }]}>·</Text>
                <Text style={[styles.metaText, { color: colors.textTertiary }]}>{item.wordCount} words</Text>
              </>
            )}
          </View>

          {item.tags.length > 0 && (
            <View style={styles.tags}>
              {item.tags.slice(0, 3).map((tag: string) => (
                <View key={tag} style={[styles.tag, { backgroundColor: colors.primaryLight }]}>
                  <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '600' }}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.screenTitle, { color: colors.text }]}>Notes</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            {viewMode === 'list'
              ? <Grid2x2 size={17} color={colors.textSecondary} />
              : <List    size={17} color={colors.textSecondary} />}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/notes/editor')}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
          >
            <Plus size={18} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Search size={16} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }, Platform.OS === 'web' ? ({ outlineWidth: 0 } as any) : {}]}
          placeholder={`Search ${notes.length} notes…`}
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={{ color: colors.textTertiary, fontSize: 13 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notebooks */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 4 }}
        style={{ maxHeight: 44, marginBottom: 4 }}
      >
        {[{ id: null, name: 'All', color: colors.primary, icon: '📚' }, ...notebooks].map(nb => {
          const isActive = activeNotebook === nb.id;
          return (
            <TouchableOpacity
              key={String(nb.id)}
              onPress={() => setActiveNotebook(isActive ? null : nb.id)}
              style={[
                styles.pill,
                { backgroundColor: isActive ? nb.color : colors.card, borderColor: isActive ? nb.color : colors.border },
              ]}
            >
              <Text style={[styles.pillText, { color: isActive ? '#fff' : colors.textSecondary }]}>
                {nb.icon} {nb.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Notes list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={36} color={colors.primary} />}
          title={search ? 'No results' : 'No notes yet'}
          message={search ? `Nothing matched "${search}"` : 'Tap + to write your first note'}
          action={!search ? { label: 'New Note', onPress: () => router.push('/notes/editor') } : undefined}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          renderItem={({ item }) => <NoteCard item={item} />}
          numColumns={viewMode === 'grid' ? 2 : 1}
          key={viewMode}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          onScrollBeginDrag={() => setShowMore(null)}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TabBar />
      <TouchableOpacity
        onPress={() => router.push('/notes/editor')}
        style={[styles.fab, { backgroundColor: colors.primary }]}
      >
        <Plus size={24} color="#fff" strokeWidth={2.5} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10,
  },
  screenTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  iconBtn: { width: 38, height: 38, borderRadius: 12, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  addBtn:  { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 10,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: 0.5, gap: 10,
  },
  searchInput: { flex: 1, fontSize: 14 },

  pill:     { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, borderWidth: 0.5 },
  pillText: { fontSize: 13, fontWeight: '500' },

  noteCard: { borderRadius: 18, borderWidth: 0.5, position: 'relative', overflow: 'hidden' },

  noteHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
  noteTitle:   { fontSize: 15, fontWeight: '700', flex: 1 },
  noteExcerpt: { fontSize: 13, lineHeight: 19 },
  noteMeta:    { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  metaText:    { fontSize: 11 },
  metaDot:     { fontSize: 11 },
  tags:        { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 9 },
  tag:         { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },

  menu: {
    position: 'absolute', top: 8, right: 36, zIndex: 200,
    borderRadius: 14, borderWidth: 0.5, padding: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 12, minWidth: 140,
  },
  menuItem:    { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11 },
  menuLabel:   { fontSize: 13, fontWeight: '500' },
  menuDivider: { height: 0.5, marginHorizontal: 4 },

  fab: {
    position: 'absolute', bottom: 90, right: 20,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
  },
});
