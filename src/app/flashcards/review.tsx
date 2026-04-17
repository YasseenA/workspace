import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Platform, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Check, RotateCcw, Trophy } from 'lucide-react-native';
import { useFlashcardsStore, type Flashcard } from '../../store/flashcards';
import { type SRSRating } from '../../lib/srs';
import { useColors } from '../../lib/theme';

const RATINGS: { rating: SRSRating; label: string; color: string; desc: string }[] = [
  { rating: 1, label: 'Again',  color: '#ef4444', desc: 'Forgot' },
  { rating: 2, label: 'Hard',   color: '#f97316', desc: 'Tough' },
  { rating: 3, label: 'Good',   color: '#10b981', desc: 'Got it' },
  { rating: 4, label: 'Easy',   color: '#7c3aed', desc: 'Easy' },
];

export default function ReviewScreen() {
  const colors = useColors();
  const router = useRouter();
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const { decks, rateCard, dueCards } = useFlashcardsStore();

  const deck = decks.find(d => d.id === deckId);
  const [queue, setQueue]     = useState<Flashcard[]>([]);
  const [index, setIndex]     = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone]       = useState(false);
  const [reviewed, setReviewed] = useState(0);

  // Flip animation
  const flipAnim = React.useRef(new Animated.Value(0)).current;
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    if (deck) {
      const due = dueCards(deck.id);
      if (due.length === 0) setDone(true);
      else setQueue(due);
    }
  }, [deckId]);

  const flip = () => {
    if (revealed) return;
    Animated.spring(flipAnim, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
    setIsFlipped(true);
    setRevealed(true);
  };

  const rate = (rating: SRSRating) => {
    if (!deck || !queue[index]) return;
    rateCard(deck.id, queue[index].id, rating);
    setReviewed(r => r + 1);

    const next = index + 1;
    if (next >= queue.length) {
      setDone(true);
    } else {
      setIndex(next);
      setRevealed(false);
      setIsFlipped(false);
      flipAnim.setValue(0);
    }
  };

  const restart = () => {
    if (deck) {
      const due = dueCards(deck.id);
      setQueue(due);
      setIndex(0);
      setRevealed(false);
      setDone(due.length === 0);
      setReviewed(0);
      flipAnim.setValue(0);
      setIsFlipped(false);
    }
  };

  const frontInterp = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backInterp  = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

  if (!deck) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.textTertiary }}>Deck not found</Text>
      </SafeAreaView>
    );
  }

  if (done) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={[styles.topBar, { borderBottomColor: colors.border }, Platform.OS === 'web' && { paddingTop: 60 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.deckTitle, { color: colors.text }]}>{deck.name}</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.doneContainer}>
          <View style={[styles.trophyWrap, { backgroundColor: '#f9731618' }]}>
            <Trophy size={48} color="#f97316" />
          </View>
          <Text style={[styles.doneTitle, { color: colors.text }]}>Session Complete!</Text>
          <Text style={[styles.doneSub, { color: colors.textTertiary }]}>
            {reviewed > 0
              ? `You reviewed ${reviewed} card${reviewed !== 1 ? 's' : ''}.`
              : 'All cards are up to date — nothing due right now.'}
          </Text>
          <View style={{ gap: 10, width: '100%', maxWidth: 320 }}>
            {dueCards(deck.id).length > 0 && (
              <TouchableOpacity onPress={restart} style={[styles.actionBtn, { backgroundColor: '#f97316' }]}>
                <RotateCcw size={16} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Review Again</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => router.back()} style={[styles.actionBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}>
              <ArrowLeft size={16} color={colors.text} />
              <Text style={{ color: colors.text, fontWeight: '600', fontSize: 15 }}>Back to Decks</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const card = queue[index];
  const progress = index / queue.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.topBar, { borderBottomColor: colors.border }, Platform.OS === 'web' && { paddingTop: 60 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.deckTitle, { color: colors.text }]}>{deck.name}</Text>
        <Text style={{ color: colors.textTertiary, fontSize: 13 }}>{index + 1}/{queue.length}</Text>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` as any, backgroundColor: '#f97316' }]} />
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20, paddingBottom: 40, alignItems: 'center', justifyContent: 'center' }}>
        {/* Card */}
        <TouchableOpacity onPress={flip} activeOpacity={0.95} style={{ width: '100%', maxWidth: 480 }}>
          {/* Front */}
          <Animated.View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
              { backfaceVisibility: 'hidden', transform: [{ rotateY: frontInterp }] },
              isFlipped && { position: 'absolute', top: 0, left: 0, right: 0 },
            ]}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#f97316', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>Question</Text>
            <Text style={[styles.cardText, { color: colors.text }]}>{card.front}</Text>
            {!revealed && (
              <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 16 }}>Tap to reveal answer</Text>
            )}
          </Animated.View>

          {/* Back */}
          <Animated.View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: '#10b981' },
              { backfaceVisibility: 'hidden', transform: [{ rotateY: backInterp }] },
              !isFlipped && { position: 'absolute', top: 0, left: 0, right: 0 },
            ]}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#10b981', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>Answer</Text>
            <Text style={[styles.cardText, { color: colors.text }]}>{card.back}</Text>
          </Animated.View>

          {/* Spacer to maintain height when cards are absolute */}
          {isFlipped && <View style={{ height: 220 }} />}
        </TouchableOpacity>

        {/* Rating buttons */}
        {revealed && (
          <View style={styles.ratingRow}>
            <Text style={{ color: colors.textTertiary, fontSize: 12, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              How well did you know this?
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {RATINGS.map(r => (
                <TouchableOpacity
                  key={r.rating}
                  onPress={() => rate(r.rating)}
                  style={[styles.rateBtn, { backgroundColor: r.color }]}
                  activeOpacity={0.85}
                >
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>{r.label}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10 }}>{r.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topBar:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  backBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  deckTitle:   { fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },

  progressTrack: { height: 3, backgroundColor: '#e5e7eb' },
  progressFill:  { height: 3, borderRadius: 2 },

  card:        { borderWidth: 1.5, borderRadius: 20, padding: 28, minHeight: 200, alignItems: 'center', justifyContent: 'center', width: '100%' },
  cardText:    { fontSize: 18, fontWeight: '600', lineHeight: 28, textAlign: 'center' },

  ratingRow:   { width: '100%', maxWidth: 480, marginTop: 28, alignItems: 'center' },
  rateBtn:     { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, alignItems: 'center', minWidth: 72 },

  doneContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  trophyWrap:    { width: 88, height: 88, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  doneTitle:     { fontSize: 24, fontWeight: '800' },
  doneSub:       { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  actionBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
});
