import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Trash2, TrendingUp } from 'lucide-react-native';
import { Card, Button } from '../../components/ui';
import { useColors } from '../../lib/theme';

interface Assignment { name: string; grade: string; weight: string; }

const DEFAULT_ASSIGNMENTS: Assignment[] = [
  { name: 'Midterm', grade: '85', weight: '30' },
  { name: 'Final', grade: '90', weight: '40' },
  { name: 'Homework', grade: '95', weight: '30' },
];

export default function GradeCalculator() {
  const router = useRouter();
  const colors = useColors();
  const [assignments, setAssignments] = useState<Assignment[]>(DEFAULT_ASSIGNMENTS);

  const add = () => setAssignments([...assignments, { name: '', grade: '', weight: '' }]);
  const remove = (i: number) => setAssignments(assignments.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof Assignment, val: string) => {
    const a = [...assignments]; a[i] = { ...a[i], [field]: val }; setAssignments(a);
  };

  const totalWeight = assignments.reduce((s, a) => s + (parseFloat(a.weight) || 0), 0);
  const weightedSum = assignments.reduce((s, a) => {
    const g = parseFloat(a.grade) || 0;
    const w = parseFloat(a.weight) || 0;
    return s + (g * w / 100);
  }, 0);
  const finalGrade = totalWeight > 0 ? (weightedSum / totalWeight * 100) : 0;
  const letterGrade = finalGrade >= 90 ? 'A' : finalGrade >= 80 ? 'B' : finalGrade >= 70 ? 'C' : finalGrade >= 60 ? 'D' : 'F';
  const gradeColor = finalGrade >= 90 ? colors.success : finalGrade >= 80 ? colors.primary : finalGrade >= 70 ? colors.warning : colors.error;
  const weightWarning = Math.abs(totalWeight - 100) > 0.1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Grade Calculator</Text>
          <Text style={{ fontSize: 12, color: colors.textTertiary }}>Weighted average</Text>
        </View>
        <TrendingUp size={20} color={colors.primary} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Result card */}
        <Card style={styles.resultCard}>
          <Text style={{ fontSize: 52, fontWeight: '800', color: gradeColor }}>
            {Math.round(finalGrade * 10) / 10}%
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: gradeColor + '20', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: gradeColor }}>{letterGrade}</Text>
            </View>
            <View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Letter Grade</Text>
              <Text style={{ fontSize: 12, color: colors.textTertiary }}>
                {finalGrade >= 90 ? 'Excellent work!' : finalGrade >= 80 ? 'Good job!' : finalGrade >= 70 ? 'Keep going!' : 'Needs improvement'}
              </Text>
            </View>
          </View>
          {weightWarning && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: colors.warning + '15', borderRadius: 8, padding: 8 }}>
              <Text style={{ fontSize: 12, color: colors.warning, flex: 1 }}>
                ⚠️ Weights total {Math.round(totalWeight)}% — should add up to 100%
              </Text>
            </View>
          )}
        </Card>

        {/* Progress bar */}
        <View style={{ marginBottom: 20 }}>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' }}>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: gradeColor, width: `${Math.min(finalGrade, 100)}%` as any }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={{ fontSize: 10, color: colors.textTertiary }}>0%</Text>
            <Text style={{ fontSize: 10, color: colors.textTertiary }}>100%</Text>
          </View>
        </View>

        {/* Assignment rows */}
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
          ASSIGNMENTS
        </Text>

        {assignments.map((a, i) => (
          <Card key={i} style={{ marginBottom: 8 }} padding={false}>
            <View style={[styles.assignRow, { borderBottomColor: colors.border }]}>
              <TextInput
                style={[styles.nameInput, { color: colors.text, borderBottomColor: colors.border },
                  Platform.OS === 'web' ? { outlineWidth: 0 } as any : {}]}
                placeholder="Assignment name"
                placeholderTextColor={colors.textTertiary}
                value={a.name}
                onChangeText={v => update(i, 'name', v)}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <TextInput
                  style={[styles.numInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg },
                    Platform.OS === 'web' ? { outlineWidth: 0 } as any : {}]}
                  placeholder="Grade"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="decimal-pad"
                  value={a.grade}
                  onChangeText={v => update(i, 'grade', v)}
                />
                <Text style={[styles.pct, { color: colors.textTertiary }]}>%  ×</Text>
                <TextInput
                  style={[styles.numInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg },
                    Platform.OS === 'web' ? { outlineWidth: 0 } as any : {}]}
                  placeholder="Wt."
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="decimal-pad"
                  value={a.weight}
                  onChangeText={v => update(i, 'weight', v)}
                />
                <Text style={[styles.pct, { color: colors.textTertiary }]}>%</Text>
              </View>
              <TouchableOpacity onPress={() => remove(i)} style={{ padding: 6 }}>
                <Trash2 size={14} color={colors.error} />
              </TouchableOpacity>
            </View>
            {a.grade && a.weight && (
              <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
                <Text style={{ fontSize: 11, color: colors.textTertiary }}>
                  Contributes {Math.round((parseFloat(a.grade) || 0) * (parseFloat(a.weight) || 0) / 100 * 10) / 10} weighted points
                </Text>
              </View>
            )}
          </Card>
        ))}

        <Button
          variant="outline"
          onPress={add}
          leftIcon={<Plus size={15} color={colors.primary} />}
          fullWidth
          style={{ marginTop: 4 }}>
          Add Assignment
        </Button>

        {/* Grade scale reference */}
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 24, marginBottom: 8 }}>
          GRADE SCALE
        </Text>
        <Card padding={false}>
          {[
            { range: '90–100%', letter: 'A', color: colors.success },
            { range: '80–89%',  letter: 'B', color: colors.primary },
            { range: '70–79%',  letter: 'C', color: colors.warning },
            { range: '60–69%',  letter: 'D', color: colors.error },
            { range: 'Below 60%', letter: 'F', color: '#94a3b8' },
          ].map((row, i, arr) => (
            <View key={row.letter} style={{
              flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12,
              borderBottomWidth: i < arr.length - 1 ? 0.5 : 0, borderBottomColor: colors.border
            }}>
              <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: row.color + '20', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: row.color }}>{row.letter}</Text>
              </View>
              <Text style={{ fontSize: 14, color: colors.text, flex: 1 }}>{row.range}</Text>
              {Math.round(finalGrade) >= parseInt(row.range) && letterGrade === row.letter && (
                <Text style={{ fontSize: 11, color: row.color, fontWeight: '600' }}>← You</Text>
              )}
            </View>
          ))}
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 0.5 },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 0.5 },
  resultCard: { alignItems: 'center', paddingVertical: 32, marginBottom: 16 },
  assignRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 6 },
  nameInput: { flex: 1, fontSize: 14, borderBottomWidth: 0.5, paddingBottom: 2 },
  numInput: { width: 54, fontSize: 14, textAlign: 'center', borderWidth: 0.5, borderRadius: 8, padding: 5 },
  pct: { fontSize: 12 },
});
