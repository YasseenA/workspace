import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, FlatList,
  TouchableOpacity, StyleSheet, Platform, ScrollView, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Search, Plus, Pin, Star,
  MoreVertical, Grid2x2, List, Trash2, BookOpen, FolderPlus,
  ArrowUpDown, Clock, ArrowDownAZ, AlignLeft,
} from 'lucide-react-native';
import { useNotesStore, Notebook } from '../../store/notes';
import { EmptyState } from '../../components/ui';
import TabBar from '../../components/layout/TabBar';
import TopBar from '../../components/layout/TopBar';
import { useColors } from '../../lib/theme';
import { fmt, showAlert } from '../../utils/helpers';

type SortKey = 'newest' | 'oldest' | 'alpha' | 'words';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'oldest', label: 'Oldest' },
  { key: 'alpha',  label: 'A – Z'  },
  { key: 'words',  label: 'Words'  },
];

/* ── NoteCard — module-level to avoid remount on parent re-render ── */
type NoteCardProps = {
  item: any;
  viewMode: 'list' | 'grid';
  showMore: string | null;
  setShowMore: (id: string | null) => void;
  togglePin: (id: string) => void;
  toggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onPress: (id: string) => void;
  colors: ReturnType<typeof useColors>;
  notebookColor?: string;
};

function NoteCard({ item, viewMode, showMore, setShowMore, togglePin, toggleFavorite, onDelete, onPress, colors, notebookColor }: NoteCardProps) {
  return (
    <TouchableOpacity
      onPress={() => { setShowMore(null); onPress(item.id); }}
      style={viewMode === 'grid' ? { flex: 1, margin: 5 } : { marginBottom: 10 }}
      activeOpacity={0.7}
    >
      <View style={[styles.noteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Notebook color bar */}
        {notebookColor && (
          <View style={[styles.notebookBar, { backgroundColor: notebookColor }]} />
        )}

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
            <TouchableOpacity onPress={() => onDelete(item.id)} style={styles.menuItem}>
              <Trash2 size={14} color={colors.error} />
              <Text style={[styles.menuLabel, { color: colors.error }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ padding: 14, paddingLeft: notebookColor ? 18 : 14 }}>
          <View style={styles.noteHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 }}>
              {item.isPinned   && <Pin  size={11} color={colors.warning} />}
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
}

/* ── Notebook color picker options ── */
const NB_COLORS = ['#7c3aed','#10b981','#f97316','#3b82f6','#ec4899','#f59e0b','#ef4444','#06b6d4'];

export default function NotesScreen() {
  const router = useRouter();
  const colors = useColors();
  const { notes, notebooks, togglePin, toggleFavorite, deleteNote, createNotebook } = useNotesStore();

  const [search,         setSearch]         = useState('');
  const [viewMode,       setViewMode]       = useState<'list' | 'grid'>('list');
  const [activeNotebook, setActiveNotebook] = useState<string | null>(null);
  const [showMore,       setShowMore]       = useState<string | null>(null);
  const [sort,           setSort]           = useState<SortKey>('newest');
  const [showSort,       setShowSort]       = useState(false);

  // New notebook modal state
  const [nbModal,   setNbModal]   = useState(false);
  const [nbName,    setNbName]    = useState('');
  const [nbColor,   setNbColor]   = useState(NB_COLORS[0]);

  // Build a map of notebookId → color for fast lookup
  const notebookColorMap = useMemo(() => {
    const m: Record<string, string> = {};
    notebooks.forEach(nb => { m[nb.id] = nb.color; });
    return m;
  }, [notebooks]);

  const filtered = useMemo(() => {
    let result = notes;
    if (activeNotebook) result = result.filter(n => n.notebookId === activeNotebook);
    if (search)         result = result.filter(n =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase())
    );

    // Sort
    const sorted = [...result].sort((a, b) => {
      switch (sort) {
        case 'oldest': return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        case 'alpha':  return (a.title || 'Untitled').localeCompare(b.title || 'Untitled');
        case 'words':  return b.wordCount - a.wordCount;
        default:       return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

    // Pinned always first
    return [...sorted.filter(n => n.isPinned), ...sorted.filter(n => !n.isPinned)];
  }, [notes, search, activeNotebook, sort]);

  const handleDelete = (id: string) => {
    showAlert('Delete Note', "This can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteNote(id); setShowMore(null); } },
    ]);
  };

  const handleCreateNotebook = () => {
    if (!nbName.trim()) return;
    createNotebook(nbName.trim(), nbColor);
    setNbName(''); setNbColor(NB_COLORS[0]); setNbModal(false);
  };

  const sortLabel = SORT_OPTIONS.find(o => o.key === sort)?.label ?? 'Sort';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar />
      {Platform.OS === 'web' && <View style={{ height: 50 }} />}

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.screenTitle, { color: colors.text }]}>Notes</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {/* Sort button */}
          <TouchableOpacity
            onPress={() => setShowSort(s => !s)}
            style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <ArrowUpDown size={16} color={colors.textSecondary} />
          </TouchableOpacity>
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

      {/* Sort dropdown */}
      {showSort && (
        <View style={[styles.sortDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {SORT_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => { setSort(opt.key); setShowSort(false); }}
              style={[styles.sortOption, sort === opt.key && { backgroundColor: colors.primaryLight }]}
            >
              <Text style={{ fontSize: 14, fontWeight: sort === opt.key ? '700' : '500', color: sort === opt.key ? colors.primary : colors.text }}>
                {opt.label}
              </Text>
              {sort === opt.key && <View style={[styles.sortDot, { backgroundColor: colors.primary }]} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

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

      {/* Notebooks row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 4 }}
        style={{ maxHeight: 44, marginBottom: 4 }}
      >
        {[{ id: null as string | null, name: 'All', color: colors.primary, icon: '📚' }, ...notebooks].map(nb => {
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
        {/* + New Notebook button */}
        <TouchableOpacity
          onPress={() => setNbModal(true)}
          style={[styles.pill, styles.nbAddBtn, { borderColor: colors.border }]}
        >
          <FolderPlus size={13} color={colors.textTertiary} />
          <Text style={[styles.pillText, { color: colors.textTertiary }]}>New</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Sort label below notebooks */}
      {sort !== 'newest' && (
        <View style={{ paddingHorizontal: 16, marginBottom: 4 }}>
          <Text style={{ fontSize: 11, color: colors.textTertiary, fontWeight: '500' }}>
            Sorted by {sortLabel.toLowerCase()}
          </Text>
        </View>
      )}

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
          renderItem={({ item }) => (
            <NoteCard
              item={item}
              viewMode={viewMode}
              showMore={showMore}
              setShowMore={setShowMore}
              togglePin={togglePin}
              toggleFavorite={toggleFavorite}
              onDelete={handleDelete}
              onPress={(id) => router.push({ pathname: '/notes/editor', params: { id } })}
              colors={colors}
              notebookColor={notebookColorMap[item.notebookId]}
            />
          )}
          numColumns={viewMode === 'grid' ? 2 : 1}
          key={viewMode}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          onScrollBeginDrag={() => { setShowMore(null); setShowSort(false); }}
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

      {/* New Notebook Modal */}
      <Modal visible={nbModal} transparent animationType="fade" onRequestClose={() => setNbModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setNbModal(false)}
        />
        <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>New Notebook</Text>

          {/* Name input */}
          <TextInput
            style={[styles.modalInput, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text },
              Platform.OS === 'web' ? ({ outlineWidth: 0 } as any) : {}]}
            placeholder="Notebook name…"
            placeholderTextColor={colors.textTertiary}
            value={nbName}
            onChangeText={setNbName}
            autoFocus
          />

          {/* Color picker */}
          <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Color</Text>
          <View style={styles.colorRow}>
            {NB_COLORS.map(c => (
              <TouchableOpacity
                key={c}
                onPress={() => setNbColor(c)}
                style={[styles.colorDot, { backgroundColor: c, borderWidth: nbColor === c ? 3 : 0, borderColor: '#fff' }]}
              />
            ))}
          </View>

          {/* Actions */}
          <View style={styles.modalActions}>
            <TouchableOpacity onPress={() => setNbModal(false)} style={[styles.modalBtn, { borderColor: colors.border }]}>
              <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCreateNotebook}
              style={[styles.modalBtn, { backgroundColor: nbColor, borderColor: nbColor }]}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  sortDropdown: {
    position: 'absolute', top: Platform.OS === 'web' ? 108 : 60, right: 70, zIndex: 300,
    borderRadius: 14, borderWidth: 0.5, padding: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 12, minWidth: 130,
  },
  sortOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 11, borderRadius: 10 },
  sortDot:    { width: 6, height: 6, borderRadius: 3 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 10,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: 0.5, gap: 10,
  },
  searchInput: { flex: 1, fontSize: 14 },

  pill:     { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, borderWidth: 0.5, flexDirection: 'row', alignItems: 'center', gap: 5 },
  pillText: { fontSize: 13, fontWeight: '500' },
  nbAddBtn: { backgroundColor: 'transparent' },

  noteCard: { borderRadius: 18, borderWidth: 0.5, position: 'relative', overflow: 'hidden' },
  notebookBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },

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

  // Modal
  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
    borderWidth: 0.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1, shadowRadius: 20, elevation: 20,
  },
  modalTitle:   { fontSize: 18, fontWeight: '800', marginBottom: 16, letterSpacing: -0.3 },
  modalLabel:   { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 10 },
  modalInput: {
    borderRadius: 12, borderWidth: 0.5, padding: 14,
    fontSize: 15, marginBottom: 4,
  },
  colorRow:    { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  colorDot:    { width: 30, height: 30, borderRadius: 15 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 24 },
  modalBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
});
