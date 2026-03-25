/**
 * Screen 3 – Financial Goals (Goals Tab)
 * Goal cards with progress, monthly contributions, add/delete goals
 */
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FinancialGoal, FinancialGoalLabels, FinancialProfile, UserGoal } from '../types';
import { AIColors, AISpacing, AIRadius, AIShadows } from '../theme/aiTheme';
import { ProgressBar } from '../components/ai';

const PROFILE_KEY = 'financial_profile';
const GOALS_KEY   = 'user_goals';

const GOAL_META: Record<FinancialGoal, { icon: string; color: string; defaultTarget: number }> = {
  [FinancialGoal.EMERGENCY_FUND]: { icon: '🛡️', color: '#10B981', defaultTarget: 150000 },
  [FinancialGoal.HOME_PURCHASE]:  { icon: '🏠', color: '#3B82F6', defaultTarget: 5000000 },
  [FinancialGoal.EDUCATION]:      { icon: '🎓', color: '#8B5CF6', defaultTarget: 1000000 },
  [FinancialGoal.RETIREMENT]:     { icon: '🌅', color: '#F59E0B', defaultTarget: 10000000 },
  [FinancialGoal.INVESTMENT]:     { icon: '📈', color: '#2EE6A6', defaultTarget: 500000 },
  [FinancialGoal.DEBT_FREE]:      { icon: '🔓', color: '#EF4444', defaultTarget: 200000 },
  [FinancialGoal.TRAVEL]:         { icon: '✈️', color: '#EC4899', defaultTarget: 200000 },
  [FinancialGoal.BUSINESS]:       { icon: '💼', color: '#F97316', defaultTarget: 2000000 },
};

function fmt(n: number): string {
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
  if (n >= 1000)   return '₹' + (n / 1000).toFixed(1) + 'K';
  return '₹' + n.toLocaleString();
}

function monthsToGoal(target: number, current: number, monthly: number): number {
  if (monthly <= 0 || current >= target) return 0;
  return Math.ceil((target - current) / monthly);
}

function completionDate(months: number): string {
  if (months <= 0) return 'Achieved!';
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

const PRESET_GOALS: FinancialGoal[] = [
  FinancialGoal.EMERGENCY_FUND,
  FinancialGoal.HOME_PURCHASE,
  FinancialGoal.EDUCATION,
  FinancialGoal.RETIREMENT,
];

export default function GoalsScreen() {
  const [goals, setGoals]       = useState<UserGoal[]>([]);
  const [profile, setProfile]   = useState<FinancialProfile | null>(null);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selType, setSelType]   = useState<FinancialGoal>(FinancialGoal.EMERGENCY_FUND);
  const [targetAmt, setTargetAmt] = useState('');
  const [currentAmt, setCurrentAmt] = useState('');
  const [monthlyContrib, setMonthlyContrib] = useState('');

  useFocusEffect(useCallback(() => {
    (async () => {
      try {
        const [goalsRaw, profRaw] = await Promise.all([
          AsyncStorage.getItem(GOALS_KEY),
          AsyncStorage.getItem(PROFILE_KEY),
        ]);
        setGoals(goalsRaw ? JSON.parse(goalsRaw) : []);
        if (profRaw) setProfile(JSON.parse(profRaw));
      } finally {
        setLoading(false);
      }
    })();
  }, []));

  const saveGoals = async (updated: UserGoal[]) => {
    setGoals(updated);
    await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(updated));
  };

  const addGoal = async () => {
    const meta = GOAL_META[selType];
    const target  = parseFloat(targetAmt)  || meta.defaultTarget;
    const current = parseFloat(currentAmt) || 0;
    const monthly = parseFloat(monthlyContrib) || (profile?.monthlyIncome ? profile.monthlyIncome * 0.1 : 5000);
    const newGoal: UserGoal = {
      id: Date.now().toString(),
      type: selType,
      label: FinancialGoalLabels[selType],
      icon: meta.icon,
      color: meta.color,
      targetAmount: target,
      currentAmount: current,
      monthlyContribution: monthly,
      targetDate: completionDate(monthsToGoal(target, current, monthly)),
      createdAt: new Date().toISOString(),
    };
    await saveGoals([...goals, newGoal]);
    setShowModal(false);
    setTargetAmt(''); setCurrentAmt(''); setMonthlyContrib('');
  };

  const deleteGoal = (id: string) => {
    Alert.alert('Delete Goal', 'Remove this goal?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => saveGoals(goals.filter((g) => g.id !== id)) },
    ]);
  };

  const updateContrib = async (id: string, delta: number) => {
    const updated = goals.map((g) =>
      g.id === id ? { ...g, monthlyContribution: Math.max(0, g.monthlyContribution + delta) } : g
    );
    await saveGoals(updated);
  };

  if (loading) return <View style={st.center}><ActivityIndicator size="large" color={AIColors.primary} /></View>;

  return (
    <SafeAreaView style={st.safe}>
      {/* Header */}
      <View style={st.header}>
        <Text style={st.title}>Financial Goals</Text>
        <TouchableOpacity style={st.addBtn} onPress={() => setShowModal(true)}>
          <Text style={st.addBtnTxt}>+ Add Goal</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
        {goals.length === 0 ? (
          <View style={st.emptyCard}>
            <Text style={st.emptyEmoji}>🎯</Text>
            <Text style={st.emptyTitle}>No Goals Yet</Text>
            <Text style={st.emptyDesc}>
              Add goals like emergency fund, buying a home, or retirement to track your progress.
            </Text>
            <TouchableOpacity style={st.addGoalCta} onPress={() => setShowModal(true)}>
              <Text style={st.addGoalCtaTxt}>Set Your First Goal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          goals.map((goal) => {
            const progress = Math.min(1, goal.currentAmount / goal.targetAmount);
            const months   = monthsToGoal(goal.targetAmount, goal.currentAmount, goal.monthlyContribution);
            const eta      = completionDate(months);
            return (
              <View key={goal.id} style={[st.goalCard, { borderLeftColor: goal.color }]}>
                {/* Goal header */}
                <View style={st.goalHead}>
                  <View style={st.goalTitleRow}>
                    <Text style={st.goalEmoji}>{goal.icon}</Text>
                    <Text style={st.goalLabel}>{goal.label}</Text>
                  </View>
                  <TouchableOpacity onPress={() => deleteGoal(goal.id)} style={st.deleteBtn}>
                    <Text style={st.deleteTxt}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Amounts */}
                <View style={st.amountRow}>
                  <View>
                    <Text style={st.amountLbl}>Current</Text>
                    <Text style={[st.amountVal, { color: goal.color }]}>{fmt(goal.currentAmount)}</Text>
                  </View>
                  <Text style={st.amountSep}>→</Text>
                  <View>
                    <Text style={st.amountLbl}>Target</Text>
                    <Text style={st.amountVal}>{fmt(goal.targetAmount)}</Text>
                  </View>
                  <View>
                    <Text style={st.amountLbl}>Progress</Text>
                    <Text style={[st.amountVal, { color: goal.color }]}>{Math.round(progress * 100)}%</Text>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={{ marginVertical: AISpacing.sm }}>
                  <ProgressBar progress={progress} color={goal.color} />
                </View>

                {/* Monthly contribution */}
                <View style={st.contribRow}>
                  <Text style={st.contribLbl}>Monthly SIP</Text>
                  <View style={st.contribCtrl}>
                    <TouchableOpacity style={st.ctrlBtn} onPress={() => updateContrib(goal.id, -500)}>
                      <Text style={st.ctrlBtnTxt}>−</Text>
                    </TouchableOpacity>
                    <Text style={st.contribVal}>{fmt(goal.monthlyContribution)}</Text>
                    <TouchableOpacity style={st.ctrlBtn} onPress={() => updateContrib(goal.id, 500)}>
                      <Text style={st.ctrlBtnTxt}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* ETA */}
                <View style={st.etaRow}>
                  <Text style={st.etaLbl}>
                    {months > 0 ? `Est. completion: ${eta} (${months} months)` : '🎉 Goal Achieved!'}
                  </Text>
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 96 }} />
      </ScrollView>

      {/* Add Goal Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={st.modalCard}>
            <Text style={st.modalTitle}>Add New Goal</Text>

            <Text style={st.fieldLabel}>Goal Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.typeList}>
              {(Object.values(FinancialGoal) as FinancialGoal[]).map((g) => {
                const m = GOAL_META[g];
                return (
                  <TouchableOpacity
                    key={g}
                    style={[st.typeChip, selType === g && { backgroundColor: m.color + '30', borderColor: m.color }]}
                    onPress={() => setSelType(g)}
                  >
                    <Text style={st.typeChipEmoji}>{m.icon}</Text>
                    <Text style={[st.typeChipTxt, selType === g && { color: m.color }]}>
                      {FinancialGoalLabels[g]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={st.fieldLabel}>Target Amount (₹)</Text>
            <TextInput
              style={st.input}
              placeholder={`e.g. ${GOAL_META[selType].defaultTarget.toLocaleString()}`}
              placeholderTextColor={AIColors.textMuted}
              keyboardType="numeric"
              value={targetAmt}
              onChangeText={setTargetAmt}
            />

            <Text style={st.fieldLabel}>Already Saved (₹)</Text>
            <TextInput
              style={st.input}
              placeholder="0"
              placeholderTextColor={AIColors.textMuted}
              keyboardType="numeric"
              value={currentAmt}
              onChangeText={setCurrentAmt}
            />

            <Text style={st.fieldLabel}>Monthly Contribution (₹)</Text>
            <TextInput
              style={st.input}
              placeholder={profile ? String(Math.round(profile.monthlyIncome * 0.1)) : '5000'}
              placeholderTextColor={AIColors.textMuted}
              keyboardType="numeric"
              value={monthlyContrib}
              onChangeText={setMonthlyContrib}
            />

            <View style={st.modalActions}>
              <TouchableOpacity style={st.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={st.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.saveBtn} onPress={addGoal}>
                <Text style={st.saveTxt}>Add Goal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AIColors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: AISpacing.md, paddingBottom: 0 },
  title: { fontSize: 22, fontWeight: '800', color: AIColors.text },
  addBtn: { backgroundColor: AIColors.primaryDim, paddingHorizontal: AISpacing.md, paddingVertical: 8, borderRadius: AIRadius.full, borderWidth: 1, borderColor: AIColors.primary },
  addBtnTxt: { fontSize: 13, fontWeight: '700', color: AIColors.primary },
  content: { padding: AISpacing.md },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: AIColors.background },
  emptyCard: { backgroundColor: AIColors.surface, borderRadius: AIRadius.xl, padding: AISpacing.xl, alignItems: 'center', borderWidth: 1, borderColor: AIColors.border, marginTop: AISpacing.xl },
  emptyEmoji: { fontSize: 48, marginBottom: AISpacing.md },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: AIColors.text, marginBottom: AISpacing.sm },
  emptyDesc: { fontSize: 13, color: AIColors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: AISpacing.lg },
  addGoalCta: { backgroundColor: AIColors.primary, paddingHorizontal: AISpacing.xl, paddingVertical: AISpacing.md, borderRadius: AIRadius.full },
  addGoalCtaTxt: { fontSize: 14, fontWeight: '700', color: AIColors.background },
  goalCard: { backgroundColor: AIColors.surface, borderRadius: AIRadius.xl, padding: AISpacing.lg, marginBottom: AISpacing.md, borderWidth: 1, borderColor: AIColors.border, borderLeftWidth: 4, ...AIShadows.sm },
  goalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: AISpacing.md },
  goalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: AISpacing.sm },
  goalEmoji: { fontSize: 24 },
  goalLabel: { fontSize: 16, fontWeight: '700', color: AIColors.text },
  deleteBtn: { padding: 6, backgroundColor: AIColors.error + '20', borderRadius: AIRadius.sm },
  deleteTxt: { fontSize: 12, color: AIColors.error, fontWeight: '700' },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: AISpacing.sm },
  amountLbl: { fontSize: 11, color: AIColors.textMuted, marginBottom: 2 },
  amountVal: { fontSize: 15, fontWeight: '700', color: AIColors.text },
  amountSep: { fontSize: 18, color: AIColors.textMuted },
  contribRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: AISpacing.sm },
  contribLbl: { fontSize: 13, color: AIColors.textSecondary },
  contribCtrl: { flexDirection: 'row', alignItems: 'center', gap: AISpacing.sm },
  ctrlBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: AIColors.surfaceLight, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: AIColors.border },
  ctrlBtnTxt: { fontSize: 16, color: AIColors.text, fontWeight: '700' },
  contribVal: { fontSize: 14, fontWeight: '700', color: AIColors.primary, minWidth: 64, textAlign: 'center' },
  etaRow: { marginTop: AISpacing.sm },
  etaLbl: { fontSize: 12, color: AIColors.textSecondary },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: AIColors.surface, borderTopLeftRadius: AIRadius.xxl, borderTopRightRadius: AIRadius.xxl, padding: AISpacing.lg, paddingBottom: AISpacing.xl },
  modalTitle: { fontSize: 20, fontWeight: '800', color: AIColors.text, marginBottom: AISpacing.lg },
  fieldLabel: { fontSize: 12, color: AIColors.textSecondary, fontWeight: '600', marginBottom: 6, marginTop: AISpacing.sm },
  typeList: { marginBottom: AISpacing.sm },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: AISpacing.md, paddingVertical: 8, borderRadius: AIRadius.full, borderWidth: 1, borderColor: AIColors.border, marginRight: AISpacing.sm, backgroundColor: AIColors.surfaceLight },
  typeChipEmoji: { fontSize: 16 },
  typeChipTxt: { fontSize: 12, color: AIColors.textSecondary, fontWeight: '600' },
  input: { backgroundColor: AIColors.surfaceLight, borderRadius: AIRadius.md, padding: AISpacing.md, color: AIColors.text, fontSize: 15, borderWidth: 1, borderColor: AIColors.border, marginBottom: AISpacing.sm },
  modalActions: { flexDirection: 'row', gap: AISpacing.sm, marginTop: AISpacing.lg },
  cancelBtn: { flex: 1, padding: AISpacing.md, borderRadius: AIRadius.lg, borderWidth: 1, borderColor: AIColors.border, alignItems: 'center' },
  cancelTxt: { color: AIColors.textSecondary, fontWeight: '600' },
  saveBtn: { flex: 2, padding: AISpacing.md, borderRadius: AIRadius.lg, backgroundColor: AIColors.primary, alignItems: 'center' },
  saveTxt: { color: AIColors.background, fontWeight: '700', fontSize: 15 },
});
