import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react-native';
import { Card, Button } from '../../components/ui';
import { colors } from '../../lib/theme';

interface Assignment { name: string; grade: string; weight: string; }

export default function GradeCalculator() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([
    { name: 'Midterm', grade: '85', weight: '30' },
    { name: 'Final', grade: '90', weight: '40' },
    { name: 'Homework', grade: '95', weight: '30' },
  ]);

  const add = () => setAssignments([...assignments, { name: '', grade: '', weight: '' }]);
  const remove = (i: number) => setAssignments(assignments.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof Assignment, val: string) => {
    const a = [...assignments]; a[i] = { ...a[i], [field]: val }; setAssignments(a);
  };

  const totalWeight = assignments.reduce((s, a) => s + (parseFloat(a.weight) || 0), 0);
  const weightedGrade = assignments.reduce((s, a) => {
    const g = parseFloat(a.grade) || 0;
    const w = parseFloat(a.weight) || 0;
    return s + (g * w / 100);
  }, 0);
  const finalGrade = totalWeight > 0 ? (weightedGrade / totalWeight * 100) : 0;
  const letterGrade = finalGrade >= 90 ? 'A' : finalGrade >= 80 ? 'B' : finalGrade >= 70 ? 'C' : finalGrade >= 60 ? 'D' : 'F';
  const gradeColor = finalGrade >= 90 ? colors.success : finalGrade >= 80 ? colors.primary : finalGrade >= 70 ? colors.warning : colors.error;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Grade Calculator</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Card style={styles.resultCard}>
          <Text style={[styles.gradeNum, { color: gradeColor }]}>{Math.round(finalGrade * 10) / 10}%</Text>
          <Text style={[styles.gradeLetter, { color: gradeColor }]}>{letterGrade}</Text>
          <Text style={styles.gradeLabel}>Weighted Average</Text>
          {Math.abs(totalWeight - 100) > 0.1 && <Text style={{ color: colors.warning, fontSize: 12, marginTop: 4 }}>Weights total {Math.round(totalWeight)}% (should be 100%)</Text>}
        </Card>

        {assignments.map((a, i) => (
          <Card key={i} style={{ marginBottom: 8 }} padding={false}>
            <View style={styles.assignRow}>
              <TextInput style={styles.nameInput} placeholder="Assignment name" placeholderTextColor={colors.textTertiary} value={a.name} onChangeText={v => update(i,'name',v)} />
              <TextInput style={styles.numInput} placeholder="Grade" placeholderTextColor={colors.textTertiary} keyboardType="decimal-pad" value={a.grade} onChangeText={v => update(i,'grade',v)} />
              <Text style={styles.pct}>%  ×</Text>
              <TextInput style={styles.numInput} placeholder="Weight" placeholderTextColor={colors.textTertiary} keyboardType="decimal-pad" value={a.weight} onChangeText={v => update(i,'weight',v)} />
              <Text style={styles.pct}>%</Text>
              <TouchableOpacity onPress={() => remove(i)} style={{ padding: 6 }}>
                <Trash2 size={14} color={colors.error} />
              </TouchableOpacity>
            </View>
          </Card>
        ))}

        <Button variant="outline" onPress={add} leftIcon={<Plus size={15} color={colors.text} />} fullWidth style={{ marginTop: 8 }}>Add Assignment</Button>
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 0.5, borderColor: colors.border },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  resultCard: { alignItems: 'center', paddingVertical: 24, marginBottom: 16 },
  gradeNum: { fontSize: 52, fontWeight: '800' },
  gradeLetter: { fontSize: 32, fontWeight: '700' },
  gradeLabel: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  assignRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 6 },
  nameInput: { flex: 1, fontSize: 14, color: colors.text, borderBottomWidth: 0.5, borderBottomColor: colors.border, paddingBottom: 2 },
  numInput: { width: 52, fontSize: 14, color: colors.text, textAlign: 'center', borderWidth: 0.5, borderColor: colors.border, borderRadius: 6, padding: 4 },
  pct: { fontSize: 12, color: colors.textTertiary },
});
