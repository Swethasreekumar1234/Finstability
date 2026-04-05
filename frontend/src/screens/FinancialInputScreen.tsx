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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
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
import { AIColors, AIRadius, AISpacing, AIShadows, AITypography } from '../theme/aiTheme';
import { apiService, BackendProfile } from '../services/apiService';
import { useAuthStore } from '../store/authStore';
import { GridBackdrop, ScreenHeader } from '../components/ui';
import { nextProfilePrompt, applyPromptAnswerToPayload } from '../utils/profilePrompts';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'FinancialInput'>;
  route: RouteProp<RootStackParamList, 'FinancialInput'>;
};

function money(n: number): string {
  if (n >= 10000000) return '\u20B9' + (n / 10000000).toFixed(1) + 'Cr';
  if (n >= 100000) return '\u20B9' + (n / 100000).toFixed(1) + 'L';
  if (n >= 1000) return '\u20B9' + (n / 1000).toFixed(1) + 'K';
  return '\u20B9' + n.toFixed(0);
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

export default function FinancialInputScreen({ navigation, route }: Props) {
  const { currentUser, firebaseUid, loadUserProfile } = useAuthStore();
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
  const [profileDoc, setProfileDoc] = useState<BackendProfile | null>(null);
  const [savingPrompt, setSavingPrompt] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profileByUserId = firebaseUid ? await apiService.getProfileByUserId(firebaseUid) : null;
        const profileByEmail = !profileByUserId && currentUser?.email
          ? await apiService.getProfileByEmail(currentUser.email)
          : null;
        const profile = profileByUserId || profileByEmail;
        if (profile) {
          setProfileDoc(profile);
          setMonthlyIncome(String(profile.monthly_income ?? 0));
          setMonthlyExpenses(String(profile.monthly_expenses ?? 0));
          setTotalSavings(String(profile.total_savings ?? 0));
          setExistingLoans(String(profile.existing_loans ?? profile.total_debts ?? 0));
          setEmploymentType((String(profile.employment_type ?? 'FULL_TIME').toUpperCase() as EmploymentType));
          setRiskTolerance((String(profile.risk_tolerance ?? 'MODERATE').toUpperCase() as RiskTolerance));
          setInvestmentExperience(Number(profile.investment_experience ?? 4));
          setGoals(Array.isArray(profile.financial_goals) ? profile.financial_goals as FinancialGoal[] : []);
        }
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, [currentUser?.email, firebaseUid]);

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

  const profilePrompt = useMemo(() => nextProfilePrompt(profileDoc), [profileDoc]);

  const handleProfilePromptAnswer = async (value: string | boolean | number) => {
    if (!profileDoc || !profilePrompt || savingPrompt) return;

    const resolvedEmail = String(profileDoc.email || currentUser?.email || '').trim().toLowerCase();
    const resolvedUserId = String(profileDoc.user_id || profileDoc.firebase_uid || firebaseUid || `email:${resolvedEmail}`);

    const payload: BackendProfile = {
      ...profileDoc,
      user_id: resolvedUserId,
      firebase_uid: resolvedUserId,
      email: resolvedEmail,
      name: profileDoc.name || profileDoc.display_name || profileDoc.full_name || 'User',
      full_name: profileDoc.full_name || profileDoc.display_name || profileDoc.name || 'User',
      display_name: profileDoc.display_name || profileDoc.full_name || profileDoc.name || 'User',
      state: String(profileDoc.state ?? 'Delhi'),
      occupation: String(profileDoc.occupation ?? profileDoc.employment_type ?? 'salaried'),
      employment_type: String(profileDoc.employment_type ?? 'salaried'),
      monthly_income: Number(profileDoc.monthly_income ?? 0),
      monthly_expenses: Number(profileDoc.monthly_expenses ?? 0),
      total_savings: Number(profileDoc.total_savings ?? 0),
      total_debts: Number(profileDoc.total_debts ?? profileDoc.existing_loans ?? 0),
      family_size: Number(profileDoc.family_size ?? profileDoc.household_size ?? 1),
    };

    applyPromptAnswerToPayload(payload, profilePrompt, value);

    setSavingPrompt(true);
    try {
      await apiService.saveProfile(payload);
      const refreshed = await apiService.getProfileByUserId(resolvedUserId)
        || (resolvedEmail ? await apiService.getProfileByEmail(resolvedEmail) : null);
      setProfileDoc((refreshed || payload) as BackendProfile);
      await loadUserProfile();
    } finally {
      setSavingPrompt(false);
    }
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

      await AsyncStorage.setItem('financial_profile', JSON.stringify(profile));

      // Sync full financial profile to backend MongoDB using the same user document.
      try {
        const normalizedEmail = (currentUser?.email || '').trim().toLowerCase();
        const uid = (firebaseUid && firebaseUid.trim())
          ? firebaseUid
          : normalizedEmail
            ? `email:${normalizedEmail}`
            : `guest:${Date.now()}`;
        const displayName = currentUser?.displayName || currentUser?.fullName || '';
        const existingProfile = await apiService.getProfileByUserId(uid)
          || (normalizedEmail ? await apiService.getProfileByEmail(normalizedEmail) : null);

        const mergedProfilePayload = {
          user_id: uid,
          firebase_uid: uid,
          name: displayName || existingProfile?.name || existingProfile?.full_name || 'User',
          full_name: currentUser?.fullName || existingProfile?.full_name || displayName || 'User',
          display_name: displayName || existingProfile?.display_name || existingProfile?.full_name || 'User',
          email: currentUser?.email || existingProfile?.email || '',
          phone_number: currentUser?.phoneNumber || existingProfile?.phone_number || '',
          user_type: currentUser?.userType || existingProfile?.user_type || '',
          risk_tolerance: riskTolerance,
          employment_type: employmentType.toLowerCase(),
          monthly_income: Number(monthlyIncome) || 0,
          monthly_expenses: Number(monthlyExpenses) || 0,
          total_savings: Number(totalSavings) || 0,
          total_debts: Number(existingLoans) || Number(existingProfile?.total_debts ?? existingProfile?.existing_loans ?? 0),
          existing_loans: Number(existingLoans) || Number(existingProfile?.existing_loans ?? existingProfile?.total_debts ?? 0),
          financial_goals: goals,
          investment_experience: investmentExperience,
          updated_at_client: new Date().toISOString(),
          family_size: Number(existingProfile?.family_size ?? existingProfile?.household_size ?? 1),
          age: existingProfile?.age,
          age_confirmed: existingProfile?.age_confirmed ?? false,
          gender: existingProfile?.gender,
          state: existingProfile?.state || 'Delhi',
          city: existingProfile?.city,
          occupation: existingProfile?.occupation || 'salaried',
          household_size: Number(existingProfile?.household_size ?? existingProfile?.family_size ?? 1),
          housing_status: existingProfile?.housing_status,
          income_range: existingProfile?.income_range,
          income_regular: existingProfile?.income_regular,
          earning_members: existingProfile?.earning_members,
          has_bank_account: existingProfile?.has_bank_account,
          has_land: existingProfile?.has_land,
          has_life_insurance: existingProfile?.has_life_insurance,
          has_health_insurance: existingProfile?.has_health_insurance,
          has_ppf: existingProfile?.has_ppf,
          has_fd: existingProfile?.has_fd,
          has_mutual_funds: existingProfile?.has_mutual_funds,
          has_gold_investments: existingProfile?.has_gold_investments,
          caste_category: existingProfile?.caste_category,
          marital_status: existingProfile?.marital_status,
          minority_status: existingProfile?.minority_status,
          disability_status: existingProfile?.disability_status,
          disability_percentage: existingProfile?.disability_percentage,
          district: existingProfile?.district,
          urban_rural: existingProfile?.urban_rural,
          domicile_years: existingProfile?.domicile_years,
          aspirational_district: existingProfile?.aspirational_district,
          special_region_flag: existingProfile?.special_region_flag,
          dependent_children: existingProfile?.dependent_children,
          senior_citizens_in_household: existingProfile?.senior_citizens_in_household,
          single_woman_led_household: existingProfile?.single_woman_led_household,
          occupation_subtype: existingProfile?.occupation_subtype,
          sector: existingProfile?.sector,
          employment_proof_available: existingProfile?.employment_proof_available,
          education_level: existingProfile?.education_level,
          student_status: existingProfile?.student_status,
          institution_type: existingProfile?.institution_type,
          course_stream: existingProfile?.course_stream,
          jan_dhan_account: existingProfile?.jan_dhan_account,
          has_aadhaar: existingProfile?.has_aadhaar,
          has_pan: existingProfile?.has_pan,
          landholding_acres: existingProfile?.landholding_acres,
          irrigation_status: existingProfile?.irrigation_status,
          housing_ownership_type: existingProfile?.housing_ownership_type,
          pmay_eligible: existingProfile?.pmay_eligible,
          enrolled_pmjjby: existingProfile?.enrolled_pmjjby,
          enrolled_pmsby: existingProfile?.enrolled_pmsby,
          enrolled_apy: existingProfile?.enrolled_apy,
          enrolled_esic: existingProfile?.enrolled_esic,
          enrolled_epfo: existingProfile?.enrolled_epfo,
          application_history_status: existingProfile?.application_history_status,
          benefit_cap_reached: existingProfile?.benefit_cap_reached,
          has_ration_card: existingProfile?.has_ration_card,
          has_caste_certificate: existingProfile?.has_caste_certificate,
          has_disability_certificate: existingProfile?.has_disability_certificate,
          has_income_certificate: existingProfile?.has_income_certificate,
          has_domicile_certificate: existingProfile?.has_domicile_certificate,
          has_bank_passbook: existingProfile?.has_bank_passbook,
        };

        await apiService.saveProfile(mergedProfilePayload as any);
        await loadUserProfile();
      } catch (mongoError: any) {
        console.warn('Mongo financial profile sync skipped:', mongoError);
      }

      // Redirect immediately after save so the flow continues without extra taps.
      if (route.params?.fromOnboarding || !navigation.canGoBack()) {
        navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
      } else {
        navigation.goBack();
      }
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
      <GridBackdrop />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ScreenHeader
            title="Update Financial Profile"
            subtitle="Complete these 5 sections for better recommendations."
            onBack={() => navigation.goBack()}
            backLabel="Back"
          />

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

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Scheme Identification Questions</Text>
            {profilePrompt ? (
              <>
                <Text style={styles.inputLabel}>{profilePrompt.title}</Text>
                <Text style={styles.helper}>{profilePrompt.subtitle}</Text>
                <View style={styles.wrap}>
                  {profilePrompt.options.map((option) => (
                    <TouchableOpacity
                      key={`${profilePrompt.key}-${String(option.value)}`}
                      style={styles.chip}
                      onPress={() => void handleProfilePromptAnswer(option.value)}
                      disabled={savingPrompt}
                    >
                      <Text style={styles.chipText}>{option.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {savingPrompt ? <Text style={styles.helper}>Saving answer...</Text> : null}
              </>
            ) : (
              <Text style={styles.helper}>All additional eligibility questions are completed.</Text>
            )}
          </View>

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
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: AIColors.backgroundSecondary,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: { height: 8, borderRadius: 999, backgroundColor: AIColors.primary },
  progressText: { ...AITypography.labelSmall, color: AIColors.textMuted, marginBottom: AISpacing.sm },
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
  stepText: { ...AITypography.bodySmall, color: AIColors.textSecondary },
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
  sectionTitle: { ...AITypography.h3, color: AIColors.text, marginBottom: AISpacing.sm },
  inputLabel: { ...AITypography.label, color: AIColors.textSecondary, marginBottom: 6, marginTop: 6 },
  input: {
    backgroundColor: AIColors.backgroundSecondary,
    borderWidth: 1,
    borderColor: AIColors.border,
    borderRadius: AIRadius.md,
    color: AIColors.text,
    paddingHorizontal: AISpacing.sm,
    paddingVertical: 10,
    ...AITypography.body,
  },
  helper: { ...AITypography.bodySmall, color: AIColors.textMuted, marginTop: 8 },
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
  chipText: { ...AITypography.labelSmall, color: AIColors.textSecondary },
  chipTextActive: { color: AIColors.primary },
  sliderValue: { ...AITypography.displaySmall, color: AIColors.primary, marginBottom: 4 },
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
  secondaryText: { ...AITypography.buttonSmall, color: AIColors.textSecondary },
  primaryBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: AIRadius.lg,
    paddingVertical: 13,
    backgroundColor: AIColors.primary,
  },
  primaryText: { ...AITypography.buttonSmall, color: AIColors.background },
  btnDisabled: { opacity: 0.5 },
});
