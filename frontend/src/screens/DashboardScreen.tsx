/**
 * Screen 1 - Finance Hub (Home Tab)
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Linking, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, FinancialProfile } from '../types';
import { useAuthStore } from '../store/authStore';
import { AIColors, AISpacing, AIRadius, AIShadows, AITypography, AISchemeCategoryColors } from '../theme/aiTheme';
import { ProgressBar } from '../components/ai';
import { GridBackdrop, PriorityActionsQueue } from '../components/ui';
import { getFinancialRecommendations } from '../services/recommendationEngine';
import { apiService, SchemeRecommendation } from '../services/apiService';
import { nextProfilePrompt, applyPromptAnswerToPayload } from '../utils/profilePrompts';

const PROFILE_KEY = 'financial_profile';
type StackNav = NativeStackNavigationProp<RootStackParamList>;
const OTHER_OCCUPATION_VALUE = '__other__';

export function calculateHealthScore(p: FinancialProfile | null): number {
  if (!p) return 0;
  let s = 50;
  const savRate = p.monthlyIncome > 0 ? (p.totalSavings / (p.monthlyIncome * 12)) * 100 : 0;
  s += savRate >= 20 ? 15 : savRate >= 10 ? 10 : savRate / 2;
  const dti = p.monthlyIncome > 0 ? p.existingLoans / p.monthlyIncome : 0;
  s += dti <= 0.3 ? 15 : dti <= 0.5 ? 8 : -Math.min(20, (dti - 0.5) * 30);
  s += (p.financialGoals?.length ?? 0) >= 3 ? 10 : (p.financialGoals?.length ?? 0) >= 1 ? 5 : 0;
  s += (p.investmentExperience || 0) * 2;
  return Math.max(0, Math.min(100, Math.round(s)));
}

function fmt(n: number): string {
  if (n >= 10000000) return '\u20B9' + (n / 10000000).toFixed(1) + 'Cr';
  if (n >= 100000)   return '\u20B9' + (n / 100000).toFixed(1) + 'L';
  if (n >= 1000)     return '\u20B9' + (n / 1000).toFixed(1) + 'K';
  return '\u20B9' + n.toLocaleString();
}
function scoreColor(s: number) {
  return s >= 75 ? AIColors.primary : s >= 50 ? AIColors.warning : AIColors.error;
}
function catColor(cat: string): string {
  return AISchemeCategoryColors[cat] ?? AIColors.primary;
}

function backendProfileToFinancialProfile(profile: any): FinancialProfile {
  return {
    monthlyIncome: Number(profile?.monthly_income ?? 0),
    monthlyExpenses: Number(profile?.monthly_expenses ?? 0),
    totalSavings: Number(profile?.total_savings ?? 0),
    existingLoans: Number(profile?.existing_loans ?? profile?.total_debts ?? 0),
    employmentType: String(profile?.employment_type ?? 'FULL_TIME').toUpperCase() as FinancialProfile['employmentType'],
    riskTolerance: String(profile?.risk_tolerance ?? 'MODERATE').toUpperCase() as FinancialProfile['riskTolerance'],
    investmentExperience: Number(profile?.investment_experience ?? 0),
    financialGoals: Array.isArray(profile?.financial_goals) ? profile.financial_goals : [],
    updatedAt: String(profile?.updated_at_client ?? profile?.updated_at ?? new Date().toISOString()),
  };
}

function formatCapabilityLabel(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function DashboardScreen() {
  const nav = useNavigation<StackNav>();
  const { currentUser: user, firebaseUid, logout } = useAuthStore();
  const [profile, setProfile] = useState<FinancialProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [schemes, setSchemes] = useState<SchemeRecommendation[]>([]);
  const [tips, setTips] = useState<string[]>([]);
  const [totalBenefits, setTotalBenefits] = useState(0);
  const [profileCompleteness, setProfileCompleteness] = useState(0);
  const [profileLayer, setProfileLayer] = useState('Identity & life stage');
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [unlockedCapabilities, setUnlockedCapabilities] = useState<string[]>([]);
  const [nextPrompt, setNextPrompt] = useState<string | null>(null);
  const [profileDoc, setProfileDoc] = useState<any | null>(null);
  const [promptDismissed, setPromptDismissed] = useState(false);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [customOccupationSubtype, setCustomOccupationSubtype] = useState('');
  const [showCustomOccupationInput, setShowCustomOccupationInput] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useFocusEffect(useCallback(() => { loadData(); }, [user]));
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 55, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const profileByUserId = firebaseUid ? await apiService.getProfileByUserId(firebaseUid) : null;
      const profileByEmail = !profileByUserId && user?.email
        ? await apiService.getProfileByEmail(user.email)
        : null;
      const profileDoc = profileByUserId || profileByEmail;
      const rawLocalProfile = await AsyncStorage.getItem(PROFILE_KEY);
      const localProfile: FinancialProfile | null = rawLocalProfile ? JSON.parse(rawLocalProfile) : null;
      const hydratedProfileDoc = profileDoc || localProfile;

      setProfileDoc(hydratedProfileDoc as any);
      const p: FinancialProfile | null = profileDoc
        ? backendProfileToFinancialProfile(profileDoc)
        : localProfile;
      if (profileDoc) {
        setProfileCompleteness(Number(profileDoc.profile_completeness ?? 0));
        setProfileLayer(String(profileDoc.profile_layer ?? 'Identity & life stage'));
        setMissingFields(Array.isArray(profileDoc.missing_fields) ? profileDoc.missing_fields : []);
        setUnlockedCapabilities(Array.isArray(profileDoc.unlocked_capabilities) ? profileDoc.unlocked_capabilities : []);
        setNextPrompt(profileDoc.next_prompt ?? null);
      } else if (localProfile) {
        setProfileCompleteness(0);
        setProfileLayer('Local profile saved');
        setMissingFields([]);
        setUnlockedCapabilities([]);
        setNextPrompt(null);
      } else {
        setProfileCompleteness(0);
        setProfileLayer('Identity & life stage');
        setMissingFields([]);
        setUnlockedCapabilities([]);
        setNextPrompt(null);
      }
      setProfile(p);
      if (p && user) {
        const recs = getFinancialRecommendations(user.userType, p.monthlyIncome, p.riskTolerance, p.financialGoals, p);
        setTips(recs.tips.slice(0, 3));
        try {
          const profilePayload = profileDoc || localProfile;
          const resp = await apiService.recommendSchemes({
            age: Number((profilePayload as any)?.age ?? 30),
            gender: String((profilePayload as any)?.gender ?? 'other').toLowerCase(),
            state: String((profilePayload as any)?.state ?? 'Delhi'),
            occupation: String((profilePayload as any)?.occupation ?? (profilePayload as any)?.employment_type ?? 'salaried').toLowerCase(),
            employment_type: String((profilePayload as any)?.employment_type ?? (p.employmentType ?? 'FULL_TIME')).toLowerCase(),
            monthly_income: p.monthlyIncome, monthly_expenses: p.monthlyExpenses,
            total_savings: p.totalSavings,
            total_debts: p.existingLoans,
            family_size: Number((profilePayload as any)?.family_size ?? (profilePayload as any)?.household_size ?? 1),
            city: (profilePayload as any)?.city,
            has_land: (profilePayload as any)?.has_land,
            has_bank_account: (profilePayload as any)?.has_bank_account,
            has_life_insurance: (profilePayload as any)?.has_life_insurance,
            has_health_insurance: (profilePayload as any)?.has_health_insurance,
          });
          setSchemes(resp.schemes.slice(0, 3));
          setTotalBenefits(resp.total_estimated_benefits);
        } catch { setSchemes([]); }
      }
    } finally { setLoading(false); }
  };

  const prompt = useMemo(() => {
    if (promptDismissed) return null;
    return nextProfilePrompt(profileDoc);
  }, [promptDismissed, profileDoc]);

  useEffect(() => {
    if (prompt?.key !== 'occupation_subtype') {
      setShowCustomOccupationInput(false);
      setCustomOccupationSubtype('');
    }
  }, [prompt?.key]);

  const handlePromptAnswer = async (value: string | boolean | number) => {
    if (!profileDoc || !prompt || savingPrompt) return;

    if (prompt.key === 'occupation_subtype' && value === OTHER_OCCUPATION_VALUE) {
      setShowCustomOccupationInput(true);
      return;
    }

    setShowCustomOccupationInput(false);
    setCustomOccupationSubtype('');

    const resolvedEmail = String(profileDoc.email || user?.email || '').trim().toLowerCase();
    const resolvedUserId = String(profileDoc.user_id || profileDoc.firebase_uid || firebaseUid || `email:${resolvedEmail}`);
    const payload: any = {
      user_id: resolvedUserId,
      firebase_uid: resolvedUserId,
      name: profileDoc.name || profileDoc.display_name || profileDoc.full_name || 'User',
      full_name: profileDoc.full_name || profileDoc.display_name || profileDoc.name || 'User',
      display_name: profileDoc.display_name || profileDoc.full_name || profileDoc.name || 'User',
      email: resolvedEmail,
      phone_number: profileDoc.phone_number || '',
      user_type: profileDoc.user_type || 'STUDENT',
      risk_tolerance: profileDoc.risk_tolerance || 'MODERATE',
      age: profileDoc.age_confirmed ? profileDoc.age : undefined,
      age_confirmed: profileDoc.age_confirmed ?? false,
      gender: profileDoc.gender,
      state: String(profileDoc.state ?? 'Delhi'),
      city: profileDoc.city,
      occupation: String(profileDoc.occupation ?? profileDoc.employment_type ?? 'salaried'),
      employment_type: String(profileDoc.employment_type ?? 'salaried'),
      monthly_income: Number(profileDoc.monthly_income ?? 0),
      monthly_expenses: Number(profileDoc.monthly_expenses ?? 0),
      total_savings: Number(profileDoc.total_savings ?? 0),
      total_debts: Number(profileDoc.total_debts ?? profileDoc.existing_loans ?? 0),
      existing_loans: Number(profileDoc.existing_loans ?? profileDoc.total_debts ?? 0),
      family_size: Number(profileDoc.family_size ?? profileDoc.household_size ?? 1),
      household_size: Number(profileDoc.household_size ?? profileDoc.family_size ?? 1),
      caste_category: profileDoc.caste_category,
      has_land: profileDoc.has_land,
      has_bank_account: profileDoc.has_bank_account,
      has_life_insurance: profileDoc.has_life_insurance,
      has_health_insurance: profileDoc.has_health_insurance,
      financial_goals: profileDoc.financial_goals,
      investment_experience: profileDoc.investment_experience,
      age_band: profileDoc.age_band,
      income_range: profileDoc.income_range,
      income_regular: profileDoc.income_regular,
      earning_members: profileDoc.earning_members,
      housing_status: profileDoc.housing_status,
      marital_status: profileDoc.marital_status,
      minority_status: profileDoc.minority_status,
      disability_status: profileDoc.disability_status,
      disability_percentage: profileDoc.disability_percentage,
      district: profileDoc.district,
      urban_rural: profileDoc.urban_rural,
      domicile_years: profileDoc.domicile_years,
      aspirational_district: profileDoc.aspirational_district,
      special_region_flag: profileDoc.special_region_flag,
      dependent_children: profileDoc.dependent_children,
      senior_citizens_in_household: profileDoc.senior_citizens_in_household,
      single_woman_led_household: profileDoc.single_woman_led_household,
      occupation_subtype: profileDoc.occupation_subtype,
      sector: profileDoc.sector,
      employment_proof_available: profileDoc.employment_proof_available,
      education_level: profileDoc.education_level,
      student_status: profileDoc.student_status,
      institution_type: profileDoc.institution_type,
      course_stream: profileDoc.course_stream,
      jan_dhan_account: profileDoc.jan_dhan_account,
      has_aadhaar: profileDoc.has_aadhaar,
      has_pan: profileDoc.has_pan,
      landholding_acres: profileDoc.landholding_acres,
      irrigation_status: profileDoc.irrigation_status,
      housing_ownership_type: profileDoc.housing_ownership_type,
      pmay_eligible: profileDoc.pmay_eligible,
      enrolled_pmjjby: profileDoc.enrolled_pmjjby,
      enrolled_pmsby: profileDoc.enrolled_pmsby,
      enrolled_apy: profileDoc.enrolled_apy,
      enrolled_esic: profileDoc.enrolled_esic,
      enrolled_epfo: profileDoc.enrolled_epfo,
      application_history_status: profileDoc.application_history_status,
      benefit_cap_reached: profileDoc.benefit_cap_reached,
      has_ration_card: profileDoc.has_ration_card,
      has_caste_certificate: profileDoc.has_caste_certificate,
      has_disability_certificate: profileDoc.has_disability_certificate,
      has_income_certificate: profileDoc.has_income_certificate,
      has_domicile_certificate: profileDoc.has_domicile_certificate,
      has_bank_passbook: profileDoc.has_bank_passbook,
      updated_at_client: new Date().toISOString(),
    };

    applyPromptAnswerToPayload(payload, prompt, value);
    setProfileDoc(payload);

    setSavingPrompt(true);
    try {
      await apiService.saveProfile(payload);
      await loadData();
    } finally {
      setSavingPrompt(false);
    }
  };

  const submitCustomOccupationSubtype = async () => {
    const normalized = customOccupationSubtype.trim().toLowerCase().replace(/\s+/g, '_');
    if (!normalized) return;
    await handlePromptAnswer(normalized);
  };

  const score = calculateHealthScore(profile);
  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const name = user?.displayName || user?.fullName || 'there';

  if (loading) return <View style={st.center}><ActivityIndicator size="large" color={AIColors.primary} /></View>;

  return (
    <SafeAreaView style={st.safe}>
      <GridBackdrop />
      <ScrollView
        style={st.scroll}
        contentContainerStyle={st.content}
        showsVerticalScrollIndicator
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Header */}
          <View style={st.header}>
            <View>
              <Text style={st.greeting}>{greet},</Text>
              <Text style={st.name}>{name}!</Text>
            </View>
            <TouchableOpacity style={st.avatar} onPress={logout}>
              <Text style={st.avatarTxt}>{(name[0] ?? 'U').toUpperCase()}</Text>
            </TouchableOpacity>
          </View>
          {/* Notice */}
          <View style={st.notice}>
            <Text style={st.noticeTxt}>
              This app helps you discover financial opportunities. Applications are processed on official external websites.
            </Text>
          </View>

          {prompt && (
            <View style={st.promptCard}>
              <Text style={st.promptTitle}>{prompt.title}</Text>
              <Text style={st.promptSubtitle}>{prompt.subtitle}</Text>
              <View style={st.promptOptions}>
                {prompt.options.map((option) => (
                  <TouchableOpacity
                    key={`${prompt.key}-${String(option.value)}`}
                    style={st.promptChip}
                    onPress={() => void handlePromptAnswer(option.value)}
                    disabled={savingPrompt}
                  >
                    <Text style={st.promptChipText}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {prompt.key === 'occupation_subtype' && showCustomOccupationInput && (
                <View style={st.promptCustomWrap}>
                  <TextInput
                    style={st.promptCustomInput}
                    value={customOccupationSubtype}
                    onChangeText={setCustomOccupationSubtype}
                    placeholder="Type your occupation subtype"
                    placeholderTextColor={AIColors.textMuted}
                    editable={!savingPrompt}
                    autoCapitalize="words"
                  />
                  <TouchableOpacity
                    style={[st.promptCustomBtn, (!customOccupationSubtype.trim() || savingPrompt) && st.promptCustomBtnDisabled]}
                    onPress={() => void submitCustomOccupationSubtype()}
                    disabled={!customOccupationSubtype.trim() || savingPrompt}
                  >
                    <Text style={st.promptCustomBtnText}>Save</Text>
                  </TouchableOpacity>
                </View>
              )}
              <TouchableOpacity onPress={() => setPromptDismissed(true)} disabled={savingPrompt}>
                <Text style={st.promptSkip}>{savingPrompt ? 'Saving...' : 'Skip for now'}</Text>
              </TouchableOpacity>
            </View>
          )}
          {/* Profile completeness */}
          <View style={st.completenessCard}>
            <View style={st.completenessRow}>
              <View>
                <Text style={st.completenessLabel}>Profile completeness</Text>
                <Text style={st.completenessValue}>{profileCompleteness}%</Text>
              </View>
              <View style={st.completenessRing}>
                <Text style={st.completenessRingText}>{profileCompleteness}</Text>
              </View>
            </View>
            <View style={st.completenessBarTrack}>
              <View style={[st.completenessBarFill, { width: `${profileCompleteness}%` }]} />
            </View>
            <Text style={st.completenessLayer}>{profileLayer}</Text>
            {nextPrompt ? <Text style={st.completenessPrompt}>{nextPrompt}</Text> : null}
            {missingFields.length > 0 ? <Text style={st.completenessMissing}>Missing: {missingFields.slice(0, 3).join(', ')}{missingFields.length > 3 ? '...' : ''}</Text> : null}
            {unlockedCapabilities.length > 0 && (
              <View style={st.capabilityWrap}>
                {unlockedCapabilities.slice(0, 4).map((cap) => (
                  <View key={cap} style={st.capabilityPill}>
                    <Text style={st.capabilityText}>{formatCapabilityLabel(cap)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          {/* Health Score */}
          <View style={[st.card, { borderColor: AIColors.borderGlow }]}>
            <View style={st.scoreRow}>
              <View>
                <Text style={st.scoreLbl}>Financial Health Score</Text>
                <Text style={[st.scoreNum, { color: scoreColor(score) }]}>
                  {score}<Text style={st.scoreOf}>/100</Text>
                </Text>
              </View>
              <View style={[st.ring, { borderColor: scoreColor(score) }]}>
                <Text style={[st.ringNum, { color: scoreColor(score) }]}>{score}</Text>
              </View>
            </View>
            <View style={{ marginTop: AISpacing.md, marginBottom: AISpacing.sm }}>
              <ProgressBar progress={score / 100} color={scoreColor(score)} />
            </View>
            <Text style={st.scoreTip}>
              {score >= 75 ? 'Excellent! Keep it up.' : score >= 50 ? 'Good - boost savings to improve.' : 'Focus on reducing debt & saving more.'}
            </Text>
          </View>
          {/* Stats */}
          {profile && (
            <View style={st.grid}>
              {[
                { lbl: 'Income',   val: fmt(profile.monthlyIncome),   c: AIColors.primary },
                { lbl: 'Savings',  val: fmt(profile.totalSavings),    c: AIColors.success },
                { lbl: 'Expenses', val: fmt(profile.monthlyExpenses), c: AIColors.warning },
                { lbl: 'Loans',    val: fmt(profile.existingLoans),   c: AIColors.error   },
              ].map((x) => (
                <View key={x.lbl} style={st.statCard}>
                  <Text style={[st.statVal, { color: x.c }]}>{x.val}</Text>
                  <Text style={st.statLbl}>{x.lbl}</Text>
                </View>
              ))}
            </View>
          )}
          {/* Benefits banner */}
          {totalBenefits > 0 && (
            <View style={st.benefitBanner}>
              <Text style={st.benefitLbl}>Estimated yearly eligible benefits</Text>
              <Text style={st.benefitVal}>{fmt(totalBenefits)}/yr</Text>
            </View>
          )}
          {/* Scheme previews */}
          {schemes.length > 0 && (
            <>
              <Text style={st.section}>Recommended for You</Text>
              {schemes.map((r) => (
                <View key={r.scheme.scheme_id} style={st.schemeCard}>
                  <View style={st.schemeTop}>
                    <View style={[st.tag, { backgroundColor: catColor(r.scheme.category) + '22' }]}>
                      <Text style={[st.tagTxt, { color: catColor(r.scheme.category) }]}>
                        {r.scheme.category.replace('_',' ').toUpperCase()}
                      </Text>
                    </View>
                    {r.scheme.estimated_annual_benefit != null && (
                      <Text style={st.schemeBen}>{fmt(r.scheme.estimated_annual_benefit)}/yr</Text>
                    )}
                  </View>
                  <Text style={st.schemeName}>{r.scheme.scheme_name}</Text>
                  <Text style={st.schemeDesc} numberOfLines={2}>{r.scheme.description}</Text>
                  <TouchableOpacity style={st.applyBtn} onPress={() => Linking.openURL(r.scheme.application_link)}>
                    <Text style={st.applyTxt}>Apply Now</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}
          {/* Tips */}
          {tips.length > 0 && (
            <PriorityActionsQueue
              title="Next Best Actions"
              items={tips.map((tip, i) => ({
                id: `tip-${i}`,
                title: tip,
                ctaLabel: 'Open Tips',
                onPress: () => nav.navigate('Tips'),
              }))}
            />
          )}
          {/* Quick actions */}
          <Text style={st.section}>Quick Actions</Text>
          <View style={st.actions}>
            {[
              { icon: 'Edit', lbl: 'Update Profile',  fn: () => nav.navigate('FinancialInput') },
              { icon: 'Tips', lbl: 'All Tips',         fn: () => nav.navigate('Tips') },
              { icon: 'Invest', lbl: 'Investments',   fn: () => nav.navigate('InvestmentRecommendations') },
              { icon: 'AI', lbl: 'AI Coach',          fn: () => nav.navigate('AIChat') },
            ].map((a) => (
              <TouchableOpacity key={a.lbl} style={st.actionBtn} onPress={a.fn}>
                <Text style={st.actionIcon}>{a.icon}</Text>
                <Text style={st.actionLbl}>{a.lbl}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ height: 96 }} />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AIColors.background },
  scroll: { flex: 1 },
  content: { flexGrow: 1, padding: AISpacing.md, paddingBottom: 140 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: AIColors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: AISpacing.md },
  greeting: { ...AITypography.label, color: AIColors.textSecondary },
  name: { ...AITypography.h1, color: AIColors.text, marginTop: 2 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: AIColors.primaryDim, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: AIColors.primary },
  avatarTxt: { ...AITypography.h3, color: AIColors.primary },
  notice: { backgroundColor: AIColors.secondaryDim, borderRadius: AIRadius.md, padding: AISpacing.sm, marginBottom: AISpacing.md, borderLeftWidth: 3, borderLeftColor: AIColors.secondary },
  noticeTxt: { ...AITypography.bodySmall, color: AIColors.textSecondary },
  promptCard: { backgroundColor: AIColors.surface, borderRadius: AIRadius.lg, borderWidth: 1, borderColor: AIColors.borderGlow, padding: AISpacing.md, marginBottom: AISpacing.md },
  promptTitle: { ...AITypography.h3, color: AIColors.text, marginBottom: 4 },
  promptSubtitle: { ...AITypography.bodySmall, color: AIColors.textSecondary, marginBottom: AISpacing.sm },
  promptOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: AISpacing.sm, marginBottom: AISpacing.sm },
  promptChip: { backgroundColor: AIColors.backgroundSecondary, borderWidth: 1, borderColor: AIColors.border, borderRadius: AIRadius.full, paddingHorizontal: AISpacing.md, paddingVertical: 7 },
  promptChipText: { ...AITypography.label, color: AIColors.textSecondary },
  promptCustomWrap: { marginBottom: AISpacing.sm, gap: AISpacing.sm },
  promptCustomInput: {
    borderWidth: 1,
    borderColor: AIColors.border,
    borderRadius: AIRadius.md,
    backgroundColor: AIColors.backgroundSecondary,
    color: AIColors.text,
    paddingHorizontal: AISpacing.md,
    paddingVertical: 10,
  },
  promptCustomBtn: {
    alignSelf: 'flex-start',
    backgroundColor: AIColors.primary,
    borderRadius: AIRadius.md,
    paddingHorizontal: AISpacing.md,
    paddingVertical: 8,
  },
  promptCustomBtnDisabled: { opacity: 0.5 },
  promptCustomBtnText: { ...AITypography.label, color: AIColors.background },
  promptSkip: { ...AITypography.bodySmall, color: AIColors.primary },
  completenessCard: { backgroundColor: AIColors.surface, borderRadius: AIRadius.xl, padding: AISpacing.md, marginBottom: AISpacing.md, borderWidth: 1, borderColor: AIColors.borderGlow, ...AIShadows.md },
  completenessRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  completenessLabel: { ...AITypography.labelSmall, color: AIColors.textMuted, marginBottom: 2 },
  completenessValue: { ...AITypography.h1, color: AIColors.primary },
  completenessRing: { width: 54, height: 54, borderRadius: 27, borderWidth: 4, borderColor: AIColors.primary, alignItems: 'center', justifyContent: 'center' },
  completenessRingText: { ...AITypography.label, color: AIColors.primary },
  completenessBarTrack: { height: 8, borderRadius: 999, backgroundColor: AIColors.backgroundSecondary, marginTop: 12, overflow: 'hidden' },
  completenessBarFill: { height: 8, borderRadius: 999, backgroundColor: AIColors.primary },
  completenessLayer: { ...AITypography.labelSmall, color: AIColors.textSecondary, marginTop: 10 },
  completenessPrompt: { ...AITypography.bodySmall, color: AIColors.textSecondary, marginTop: 6 },
  completenessMissing: { ...AITypography.bodySmall, color: AIColors.textMuted, marginTop: 6 },
  capabilityWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  capabilityPill: { backgroundColor: AIColors.backgroundSecondary, borderWidth: 1, borderColor: AIColors.border, borderRadius: AIRadius.full, paddingHorizontal: AISpacing.sm, paddingVertical: 4 },
  capabilityText: { ...AITypography.labelSmall, color: AIColors.textSecondary },
  card: { backgroundColor: AIColors.surface, borderRadius: AIRadius.xl, padding: AISpacing.lg, marginBottom: AISpacing.md, borderWidth: 1, borderColor: AIColors.border, ...AIShadows.md },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scoreLbl: { ...AITypography.label, color: AIColors.textSecondary, marginBottom: 4 },
  scoreNum: { ...AITypography.displayLarge },
  scoreOf: { ...AITypography.bodyLarge, color: AIColors.textMuted },
  ring: { width: 72, height: 72, borderRadius: 36, borderWidth: 5, justifyContent: 'center', alignItems: 'center' },
  ringNum: { ...AITypography.h2 },
  scoreTip: { ...AITypography.bodySmall, color: AIColors.textSecondary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: AISpacing.sm, marginBottom: AISpacing.md },
  statCard: { flex: 1, minWidth: '44%', backgroundColor: AIColors.surface, borderRadius: AIRadius.lg, padding: AISpacing.md, borderWidth: 1, borderColor: AIColors.border },
  statVal: { ...AITypography.h3, marginBottom: 4 },
  statLbl: { ...AITypography.labelSmall, color: AIColors.textSecondary },
  benefitBanner: { backgroundColor: AIColors.primary + '1A', borderRadius: AIRadius.lg, padding: AISpacing.md, marginBottom: AISpacing.md, borderWidth: 1, borderColor: AIColors.primary + '40', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  benefitLbl: { ...AITypography.bodySmall, color: AIColors.textSecondary, flex: 1 },
  benefitVal: { ...AITypography.h2, color: AIColors.primary },
  section: { ...AITypography.h3, color: AIColors.text, marginBottom: AISpacing.sm, marginTop: AISpacing.sm },
  schemeCard: { backgroundColor: AIColors.surface, borderRadius: AIRadius.lg, padding: AISpacing.md, marginBottom: AISpacing.sm, borderWidth: 1, borderColor: AIColors.border },
  schemeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: AISpacing.sm },
  tag: { paddingHorizontal: AISpacing.sm, paddingVertical: 3, borderRadius: AIRadius.sm },
  tagTxt: { ...AITypography.labelSmall },
  schemeBen: { ...AITypography.bodySmall, color: AIColors.primary },
  schemeName: { ...AITypography.bodyLarge, color: AIColors.text, marginBottom: 4 },
  schemeDesc: { ...AITypography.bodySmall, color: AIColors.textSecondary, marginBottom: AISpacing.sm },
  applyBtn: { alignSelf: 'flex-start', backgroundColor: AIColors.primaryDim, paddingHorizontal: AISpacing.md, paddingVertical: 6, borderRadius: AIRadius.full, borderWidth: 1, borderColor: AIColors.primary },
  applyTxt: { ...AITypography.buttonSmall, color: AIColors.primary },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: AISpacing.sm, marginTop: AISpacing.sm },
  actionBtn: { width: '48%', backgroundColor: AIColors.surface, borderRadius: AIRadius.lg, padding: AISpacing.md, alignItems: 'center', borderWidth: 1, borderColor: AIColors.border },
  actionIcon: { ...AITypography.bodySmall, marginBottom: 6, color: AIColors.primary },
  actionLbl: { ...AITypography.labelSmall, color: AIColors.textSecondary, textAlign: 'center' },
});
