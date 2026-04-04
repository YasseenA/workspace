import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, Plus, Pin, Star, MoreVertical, Grid2x2, List, Trash2, BookOpen } from 'lucide-react-native';
import { useNotesStore } from '../../store/notes';
import { Card, EmptyState, Badge } from '../../components/ui';
import TabBar from '../../components/layout/TabBar';
import { colors } from '../../lib/theme';
import { fmt, truncate } from '../../utils/helpers';

export default function NotesScreen() {
  const router = useRouter();
  const { notes, notebooks, togglePin, toggleFavorite, deleteNote } = useNotesStore();
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list'|'grid'>('list');
  const [activeNotebook, setActiveNotebook] = useState<string|null>(null);
  const [showMore, setShowMore] = useState<string|null>(null);

  const filtered = useMemo(() => {
    let result = notes;
    if (activeNotebook) result = result.filter(n => n.notebookId === activeNotebook);
    if (search) result = result.filter(n => n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase()));
    return [...result.filter(n => n.isPinned), ...result.filter(n => !n.isPinned)];
  }, [notes, search, activeNotebook]);

  const handleDelete = (id: string) => {
    Alert.alert('Delete Note', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteNote(id); setShowMore(null); } }
    ]);
  };

  const NotebookPill = ({ nb }: any) => (
    <TouchableOpacity onPress={() => setActiveNotebook(activeNotebook === nb.id ? null : nb.id)}
      style={[styles.pill, activeNotebook === nb.id && { backgroundColor: nb.color, borderColor: nb.color }]}>
      <Text style={[styles.pillText, activeNotebook === nb.id && { color: '#fff' }]}>{nb.icon} {nb.name}</Text>
    </TouchableOpacity>
  );

  const NoteCard = ({ item }: any) => (
    <TouchableOpacity onPress={() => router.push({ pathname: '/notes/editor', params: { id: item.id } })}
      style={viewMode === 'grid' ? { flex: 1, margin: 4 } : { marginBottom: 8 }}>
      <Card padding={false} style={styles.noteCard}>
        {showMore === item.id && (
          <View style={styles.moreMenu}>
            <TouchableOpacity onPress={() => { togglePin(item.id); setShowMore(null); }} style={styles.menuItem}>
              <Pin size={14} color={colors.text} /><Text style={styles.menuText}>{item.isPinned ? 'Unpin' : 'Pin'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { toggleFavorite(item.id); setShowMore(null); }} style={styles.menuItem}>
              <Star size={14} color={colors.text} /><Text style={styles.menuText}>{item.isFavorite ? 'Unfavorite' : 'Favorite'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.menuItem}>
              <Trash2 size={14} color={colors.error} /><Text style={[styles.menuText, { color: colors.error }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={{ padding: 14 }}>
          <View style={styles.noteHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {item.isPinned && <Pin size={11} color={colors.warning} />}
              {item.isFavorite && <Star size={11} color={colors.warning} fill={colors.warning} />}
              <Text style={styles.noteTitle} numberOfLines={1}>{item.title}</Text>
            </View>
            <TouchableOpacity onPress={() => setShowMore(showMore === item.id ? null : item.id)}>
              <MoreVertical size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.noteExcerpt} numberOfLines={viewMode === 'grid' ? 4 : 2}>{item.excerpt}</Text>
          <View style={styles.noteMeta}>
            <Text style={styles.metaText}>{fmt.relative(item.updatedAt)}</Text>
            <Text style={styles.metaText}>·</Text>
            <Text style={styles.metaText}>{item.wordCount} words</Text>
          </View>
          {item.tags.length > 0 && (
            <View style={styles.tags}>
              {item.tags.slice(0,3).map((tag: string) => <Badge key={tag} variant="primary" size="sm">#{tag}</Badge>)}
            </View>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Notes</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')} style={styles.iconBtn}>
            {viewMode === 'list' ? <Grid2x2 size={18} color={colors.textSecondary} /> : <List size={18} color={colors.textSecondary} />}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/notes/editor')} style={styles.addBtn}>
            <Plus size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchBar}>
        <Search size={16} color={colors.textTertiary} />
        <TextInput style={styles.searchInput} placeholder="Search notes..." placeholderTextColor={colors.textTertiary} value={search} onChangeText={setSearch} />
      </View>

      <FlatList horizontal data={[{ id: null, name: 'All', color: colors.primary, icon: '📚' }, ...notebooks]} keyExtractor={i => String(i.id)}
        renderItem={({ item }) => <NotebookPill nb={item} />} style={styles.notebooks} showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }} />

      {filtered.length === 0 ? (
        <EmptyState icon={<BookOpen size={48} color={colors.textTertiary} />} title="No notes yet" message="Tap + to create your first note" action={{ label: 'New Note', onPress: () => router.push('/notes/editor') }} />
      ) : (
        <FlatList data={filtered} keyExtractor={i => i.id} renderItem={({ item }) => <NoteCard item={item} />}
          numColumns={viewMode === 'grid' ? 2 : 1} key={viewMode} contentContainerStyle={{ padding: 16 }}
          onScrollBeginDrag={() => setShowMore(null)} />
      )}

      <TabBar />
      <TouchableOpacity onPress={() => router.push('/notes/editor')} style={styles.fab}>
        <Plus size={24} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff', borderWidth: 0.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  addBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 16, marginTop: 8, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 0.5, borderColor: colors.border, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },
  notebooks: { maxHeight: 44, marginBottom: 4 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#fff', borderWidth: 0.5, borderColor: colors.border },
  pillText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  noteCard: { position: 'relative' },
  noteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  noteTitle: { fontSize: 15, fontWeight: '600', color: colors.text, flex: 1 },
  noteExcerpt: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  noteMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  metaText: { fontSize: 11, color: colors.textTertiary },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  moreMenu: { position: 'absolute', top: 10, right: 40, zIndex: 100, backgroundColor: '#fff', borderRadius: 10, borderWidth: 0.5, borderColor: colors.border, padding: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 10 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 },
  menuText: { fontSize: 13, color: colors.text },
  fab: { position: 'absolute', bottom: 90, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8 },
});
