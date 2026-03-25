/**
 * Financial Input Screen - compact 5-step form with sliders
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  EmploymentType,
  EmploymentTypeLabels,
  FinancialGoal,
  FinancialGoalLabels,
  FinancialProfile,
  RiskTolerance,
  RiskToleranceLabels,
  RootStackParamList,
} from '../types';
import { AIColors, AIRadius, AISpacing, AIShadows } from '../theme/aiTheme';
import { apiService } from '../services/apiService';
import { useAuthStore } from '../store/authStore';

const FINANCIAL_PROFILE_KEY = 'financial_profile';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'FinancialInput'>;
};

function money(n: number): string {
  if (n >= 10000000) return '\\u20B9' + (n / 10000000).toFixed(1) + 'Cr';
  if (n >= 100000) return '\\u20B9' + (n / 100000).toFixed(1) + 'L';
  if (n >= 1000) return '\\u20B9' + (n / 1000).toFixed(1) + 'K';
  return '\\u20B9' + n.toFixed(0);
}

const EMPLOYMENT_OPTIONS = [
  EmploymentType.FULL_TIME,
  EmploymentType.PART_TIME,
  EmploymentType.SELF_EMPLOYED,
  EmploymentType.FREELANCER,
  EmploymentType.UNEMPLOYED,
  EmploymentType.RETIRED,
];

const RISK_OPTIONS = [RiskTolerance.LOW, RiskTolerance.MODERATE, RiskTolerance.HIGH];
const GOAL_OPTIONS = Object.values(FinancialGoal);

export default function FinancialInputScreen({ navigation }: Props) {
  const { currentUser, firebaseUid } = useAuthStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [monthlyIncome, setMonthlyIncome] = useState('30000');
  const [monthlyExpenses, setMonthlyExpenses] = useState('18000');
  const [totalSavings, setTotalSavings] = useState('60000');
  const [existingLoans, setExistingLoans] = useState('0');
  const [employmentType, setEmploymentType] = useState<EmploymentType>(EmploymentType.FULL_TIME);
  const [riskTolerance, setRiskTolerance] = useState<RiskTolerance>(RiskTolerance.MODERATE);
  const [investmentExperience, setInvestmentExperience] = useState(4);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(FINANCIAL_PROFILE_KEY)
      .then((raw) => {
        if (!raw) return;
        const p: FinancialProfile = JSON.parse(raw);
        setMonthlyIncome(String(p.monthlyIncome));
        setMonthlyExpenses(String(p.monthlyExpenses));
        setTotalSavings(String(p.totalSavings));
        setExistingLoans(String(p.existingLoans));
        setEmploymentType(p.employmentType);
        setRiskTolerance(p.riskTolerance);
        setInvestmentExperience(p.investmentExperience);
        setGoals(p.financialGoals || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const completion = useMemo(() => {
    let done = 0;
    if (Number(monthlyIncome) > 0) done += 1;
    if (Number(monthlyExpenses) >= 0) done += 1;
    if (Number(totalSavings) >= 0) done += 1;
    if (goals.length > 0) done += 1;
    if (investmentExperience >= 0) done += 1;
    return done / 5;
  }, [monthlyIncome, monthlyExpenses, totalSavings, goals.length, investmentExperience]);

  const toggleGoal = (g: FinancialGoal) => {
    setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  };

  const save = async () => {
    if (Number(monthlyIncome) <= 0) {
      Alert.alert('Missing income', 'Please enter a valid monthly income.');
      return;
    }

    setSaving(true);
    try {
      const profile: FinancialProfile = {
        monthlyIncome: Number(monthlyIncome) || 0,
        monthlyExpenses: Number(monthlyExpenses) || 0,
        totalSavings: Number(totalSavings) || 0,
        existingLoans: Number(existingLoans) || 0,
        employmentType,
        riskTolerance,
        investmentExperience,
        financialGoals: goals,
        updatedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(FINANCIAL_PROFILE_KEY, JSON.stringify(profile));

      // Sync full financial profile to backend MongoDB using the same user document.
      try {
        const uid = firebaseUid || await AsyncStorage.getItem('firebaseUid') || `local-${Date.now()}`;
        const displayName = currentUser?.displayName || currentUser?.fullName || '';

        await apiService.saveProfile({
          user_id: uid,
          firebase_uid: uid,
          name: displayName,
          full_name: currentUser?.fullName || displayName,
          display_name: displayName,
          email: currentUser?.email || '',
          phone_number: currentUser?.phoneNumber || '',
          user_type: currentUser?.userType || '',
          risk_tolerance: riskTolerance,
          employment_type: employmentType.toLowerCase(),
          monthly_income: Number(monthlyIncome) || 0,
          monthly_expenses: Number(monthlyExpenses) || 0,
          total_savings: Number(totalSavings) || 0,
          total_debts: Number(existingLoans) || 0,
          existing_loans: Number(existingLoans) || 0,
          financial_goals: goals,
          investment_experience: investmentExperience,
          updated_at_client: new Date().toISOString(),
          family_size: 1,
          age: 25,
          gender: 'other',
          state: 'Delhi',
          occupation: 'salaried',
        });
      } catch (mongoError) {
        console.warn('Mongo financial profile sync skipped:', mongoError);
      }

      Alert.alert('Profile saved', 'Your financial profile has been updated.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Save failed', 'Could not save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><Text style={styles.loadingText}>Loading profile...</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Update Financial Profile</Text>
          <Text style={styles.subtitle}>Complete these 5 sections for better recommendations.</Text>

          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.round(completion * 100)}%` }]} /></View>
          <Text style={styles.progressText}>{Math.round(completion * 100)}% complete</Text>

          <View style={styles.stepRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <TouchableOpacity key={s} style={[styles.stepPill, step === s && styles.stepPillActive]} onPress={() => setStep(s)}>
                <Text style={[styles.stepText, step === s && styles.stepTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {step === 1 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Income & Expenses</Text>
              <Text style={styles.inputLabel}>Monthly Income</Text>
              <TextInput value={monthlyIncome} onChangeText={setMonthlyIncome} keyboardType="numeric" style={styles.input} placeholder="30000" placeholderTextColor={AIColors.textMuted} />
              <Text style={styles.inputLabel}>Monthly Expenses</Text>
              <TextInput value={monthlyExpenses} onChangeText={setMonthlyExpenses} keyboardType="numeric" style={styles.input} placeholder="18000" placeholderTextColor={AIColors.textMuted} />
              <Text style={styles.helper}>Current surplus: {money((Number(monthlyIncome) || 0) - (Number(monthlyExpenses) || 0))}</Text>
            </View>
          )}

          {step === 2 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Assets & Liabilities</Text>
              <Text style={styles.inputLabel}>Total Savings</Text>
              <TextInput value={totalSavings} onChangeText={setTotalSavings} keyboardType="numeric" style={styles.input} placeholder="60000" placeholderTextColor={AIColors.textMuted} />
              <Text style={styles.inputLabel}>Existing Loans</Text>
              <TextInput value={existingLoans} onChangeText={setExistingLoans} keyboardType="numeric" style={styles.input} placeholder="0" placeholderTextColor={AIColors.textMuted} />
            </View>
          )}

          {step === 3 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Employment & Risk</Text>
              <Text style={styles.inputLabel}>Employment Type</Text>
              <View style={styles.wrap}>
                {EMPLOYMENT_OPTIONS.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.chip, employmentType === t && styles.chipActive]}
                    onPress={() => setEmploymentType(t)}
                  >
                    <Text style={[styles.chipText, employmentType === t && styles.chipTextActive]}>{EmploymentTypeLabels[t]}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Risk Tolerance</Text>
              <View style={styles.wrap}>
                {RISK_OPTIONS.map((r) => (
                  <TouchableOpacity key={r} style={[styles.chip, riskTolerance === r && styles.chipActive]} onPress={() => setRiskTolerance(r)}>
                    <Text style={[styles.chipText, riskTolerance === r && styles.chipTextActive]}>{RiskToleranceLabels[r]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {step === 4 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Financial Goals</Text>
              <View style={styles.wrap}>
                {GOAL_OPTIONS.map((g) => (
                  <TouchableOpacity key={g} style={[styles.chip, goals.includes(g) && styles.chipActive]} onPress={() => toggleGoal(g)}>
                    <Text style={[styles.chipText, goals.includes(g) && styles.chipTextActive]}>{FinancialGoalLabels[g]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.helper}>{goals.length} goal(s) selected</Text>
            </View>
          )}

          {step === 5 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Investment Experience</Text>
              <Text style={styles.sliderValue}>{investmentExperience}/10</Text>
              <Slider
                style={{ width: '100%', height: 40 }}
                minimumValue={0}
                maximumValue={10}
                step={1}
                minimumTrackTintColor={AIColors.primary}
                maximumTrackTintColor={AIColors.border}
                thumbTintColor={AIColors.primary}
                value={investmentExperience}
                onValueChange={(v) => setInvestmentExperience(v)}
              />
              <Text style={styles.helper}>Higher values indicate more comfort with volatility and complex products.</Text>
            </View>
          )}

          <View style={styles.navRow}>
            <TouchableOpacity
              style={[styles.secondaryBtn, step === 1 && styles.btnDisabled]}
              onPress={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
            >
              <Text style={styles.secondaryText}>Back</Text>
            </TouchableOpacity>

            {step < 5 ? (
              <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep((s) => Math.min(5, s + 1))}>
                <Text style={styles.primaryText}>Next</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.primaryBtn, saving && styles.btnDisabled]} onPress={save} disabled={saving}>
                <Text style={styles.primaryText}>{saving ? 'Saving...' : 'Save Profile'}</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ height: 72 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AIColors.background },
  content: { padding: AISpacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: AIColors.textSecondary, fontSize: 14 },
  title: { fontSize: 28, fontWeight: '900', color: AIColors.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: AIColors.textSecondary, marginBottom: AISpacing.md },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: AIColors.backgroundSecondary,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: { height: 8, borderRadius: 999, backgroundColor: AIColors.primary },
  progressText: { fontSize: 11, color: AIColors.textMuted, marginBottom: AISpacing.sm },
  stepRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: AISpacing.md },
  stepPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: AIColors.border,
    backgroundColor: AIColors.surface,
  },
  stepPillActive: { borderColor: AIColors.primary, backgroundColor: AIColors.primaryDim },
  stepText: { color: AIColors.textSecondary, fontWeight: '700' },
  stepTextActive: { color: AIColors.primary },
  card: {
    backgroundColor: AIColors.surface,
    borderRadius: AIRadius.xl,
    borderWidth: 1,
    borderColor: AIColors.border,
    padding: AISpacing.md,
    marginBottom: AISpacing.md,
    ...AIShadows.sm,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: AIColors.text, marginBottom: AISpacing.sm },
  inputLabel: { fontSize: 12, color: AIColors.textSecondary, marginBottom: 6, marginTop: 6 },
  input: {
    backgroundColor: AIColors.backgroundSecondary,
    borderWidth: 1,
    borderColor: AIColors.border,
    borderRadius: AIRadius.md,
    color: AIColors.text,
    paddingHorizontal: AISpacing.sm,
    paddingVertical: 10,
    fontSize: 15,
  },
  helper: { fontSize: 12, color: AIColors.textMuted, marginTop: 8, lineHeight: 18 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    borderRadius: AIRadius.full,
    borderWidth: 1,
    borderColor: AIColors.border,
    backgroundColor: AIColors.backgroundSecondary,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipActive: { borderColor: AIColors.primary, backgroundColor: AIColors.primaryDim },
  chipText: { fontSize: 11, color: AIColors.textSecondary, fontWeight: '600' },
  chipTextActive: { color: AIColors.primary },
  sliderValue: { fontSize: 26, color: AIColors.primary, fontWeight: '900', marginBottom: 4 },
  navRow: { flexDirection: 'row', gap: AISpacing.sm },
  secondaryBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: AIColors.border,
    borderRadius: AIRadius.lg,
    paddingVertical: 13,
    backgroundColor: AIColors.surface,
  },
  secondaryText: { fontSize: 13, color: AIColors.textSecondary, fontWeight: '700' },
  primaryBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: AIRadius.lg,
    paddingVertical: 13,
    backgroundColor: AIColors.primary,
  },
  primaryText: { fontSize: 13, color: AIColors.background, fontWeight: '800' },
  btnDisabled: { opacity: 0.5 },
});
