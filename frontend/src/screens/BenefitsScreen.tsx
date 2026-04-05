/**
 * Screen 4 – Benefits (Government Schemes & Missing Benefits)
 * Key screen: missing benefits summary + filterable scheme cards with Apply/View buttons
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator, Linking, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FinancialProfile } from '../types';
import { AIColors, AISpacing, AIRadius, AIShadows, AITypography, AISchemeCategoryColors } from '../theme/aiTheme';
import { GridBackdrop } from '../components/ui';
import { apiService, BackendProfile, SchemeRecommendation } from '../services/apiService';
import { getFinancialRecommendations } from '../services/recommendationEngine';
import { useAuthStore } from '../store/authStore';
import { nextProfilePrompt, applyPromptAnswerToPayload } from '../utils/profilePrompts';

const PROFILE_KEY = 'financial_profile';
const OTHER_OCCUPATION_VALUE = '__other__';

const CATEGORIES = ['All', 'subsidy', 'pension', 'insurance', 'grant', 'loan_support', 'scholarship'];

function fmt(n: number): string {
  if (n >= 10000000) return '₹' + (n / 10000000).toFixed(1) + 'Cr';
  if (n >= 100000)   return '₹' + (n / 100000).toFixed(1) + 'L';
  if (n >= 1000)     return '₹' + (n / 1000).toFixed(1) + 'K';
  return '₹' + n.toFixed(0);
}

function catColor(cat: string): string {
  return AISchemeCategoryColors[cat] ?? AIColors.primary;
}

function buildRelevanceKeywords(profile: BackendProfile | null, localProfile: FinancialProfile | null, topExpenseCategories: string[]): string[] {
  const keywords: string[] = [];

  if (!profile && !localProfile) return keywords;

  const goals = localProfile?.financialGoals || profile?.financial_goals || [];
  goals.forEach((goal) => {
    const g = String(goal).toLowerCase();
    if (g.includes('retire')) keywords.push('pension', 'retirement', 'apy');
    if (g.includes('education')) keywords.push('education', 'scholarship', 'student');
    if (g.includes('home')) keywords.push('housing', 'home', 'pmay');
    if (g.includes('debt')) keywords.push('loan', 'subsidy', 'interest');
    if (g.includes('emergency')) keywords.push('insurance', 'health', 'life');
    if (g.includes('business')) keywords.push('msme', 'enterprise', 'business');
  });

  if (profile?.occupation_subtype) keywords.push(String(profile.occupation_subtype).toLowerCase());
  if (profile?.sector) keywords.push(String(profile.sector).toLowerCase());
  if (profile?.employment_type) keywords.push(String(profile.employment_type).toLowerCase());
  if (profile?.student_status && profile.student_status !== 'not_student') keywords.push('student', 'scholarship');
  if (profile?.has_land) keywords.push('farmer', 'agri', 'agriculture');
  if (profile?.caste_category) keywords.push(String(profile.caste_category).toLowerCase());
  if (profile?.minority_status) keywords.push('minority');
  if (profile?.disability_status) keywords.push('disability', 'divyang');

  topExpenseCategories.forEach((c) => keywords.push(c.toLowerCase()));

  return Array.from(new Set(keywords.filter(Boolean)));
}

function rankRelevantSchemes(schemes: SchemeRecommendation[], keywords: string[]): SchemeRecommendation[] {
  if (!keywords.length) return schemes;

  const scored = schemes.map((item) => {
    const haystack = [
      item.scheme.scheme_name,
      item.scheme.description,
      item.scheme.category,
      item.reason,
      item.scheme.eligibility,
      item.scheme.benefits,
    ].join(' ').toLowerCase();

    const keywordMatches = keywords.reduce((acc, kw) => (haystack.includes(kw) ? acc + 1 : acc), 0);
    const relevance = (item.eligibility_match * 100) + keywordMatches * 8;
    return { item, relevance };
  });

  const stronglyRelevant = scored
    .filter((x) => x.relevance >= 60)
    .sort((a, b) => b.relevance - a.relevance)
    .map((x) => x.item);

  if (stronglyRelevant.length >= 3) return stronglyRelevant;

  const fallback = scored
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, Math.max(3, Math.min(8, schemes.length)))
    .map((x) => x.item);

  return fallback;
}

export default function BenefitsScreen() {
  const { currentUser, firebaseUid } = useAuthStore();
  const [schemes, setSchemes]         = useState<SchemeRecommendation[]>([]);
  const [filtered, setFiltered]       = useState<SchemeRecommendation[]>([]);
  const [totalBenefits, setTotal]     = useState(0);
  const [missingCount, setMissing]    = useState(0);
  const [loading, setLoading]         = useState(true);
  const [activeCat, setActiveCat]     = useState('All');
  const [expanded, setExpanded]       = useState<Record<string, boolean>>({});
  const [backendAvail, setBackendAvail] = useState(false);
  const [profileDoc, setProfileDoc] = useState<BackendProfile | null>(null);
  const [promptDismissed, setPromptDismissed] = useState(false);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [customOccupationSubtype, setCustomOccupationSubtype] = useState('');
  const [showCustomOccupationInput, setShowCustomOccupationInput] = useState(false);

  useFocusEffect(useCallback(() => {
    loadSchemes();
  }, []));

  const prompt = useMemo(() => {
    if (promptDismissed) return null;
    return nextProfilePrompt(profileDoc);
  }, [promptDismissed, profileDoc]);

  const handleCustomPromptVisibility = (value: string | boolean | number) => {
    if (prompt?.key === 'occupation_subtype' && value === OTHER_OCCUPATION_VALUE) {
      setShowCustomOccupationInput(true);
      return true;
    }
    setShowCustomOccupationInput(false);
    setCustomOccupationSubtype('');
    return false;
  };

  const loadSchemes = async () => {
    setLoading(true);
    try {
      setPromptDismissed(false);
      const raw = await AsyncStorage.getItem(PROFILE_KEY);
      const p: FinancialProfile | null = raw ? JSON.parse(raw) : null;
      const profileByUserId = firebaseUid ? await apiService.getProfileByUserId(firebaseUid) : null;
      const profileByEmail = !profileByUserId && currentUser?.email
        ? await apiService.getProfileByEmail(currentUser.email)
        : null;
      const profileDoc = profileByUserId || profileByEmail;
      setProfileDoc(profileDoc);
      const resolvedEmail = String(profileDoc?.email || currentUser?.email || '').trim().toLowerCase();
      const resolvedUserId = String(profileDoc?.user_id || profileDoc?.firebase_uid || firebaseUid || `email:${resolvedEmail}`);

      const bp = {
        user_id: resolvedUserId,
        firebase_uid: resolvedUserId,
        email: resolvedEmail,
        age: profileDoc?.age_confirmed ? Number(profileDoc?.age ?? 30) : undefined,
        age_confirmed: profileDoc?.age_confirmed ?? false,
        gender: String(profileDoc?.gender ?? 'other').toLowerCase(),
        state: String(profileDoc?.state ?? 'Delhi'),
        city: profileDoc?.city,
        occupation: String(profileDoc?.occupation ?? profileDoc?.employment_type ?? 'salaried').toLowerCase(),
        employment_type: String(profileDoc?.employment_type ?? (p?.employmentType ?? 'FULL_TIME')).toLowerCase(),
        monthly_income: Number(profileDoc?.monthly_income ?? p?.monthlyIncome ?? 30000),
        monthly_expenses: Number(profileDoc?.monthly_expenses ?? p?.monthlyExpenses ?? 20000),
        total_savings: Number(profileDoc?.total_savings ?? p?.totalSavings ?? 0),
        total_debts: Number(profileDoc?.total_debts ?? profileDoc?.existing_loans ?? p?.existingLoans ?? 0),
        family_size: Number(profileDoc?.family_size ?? profileDoc?.household_size ?? 1),
        has_land: profileDoc?.has_land,
        has_bank_account: profileDoc?.has_bank_account,
        has_life_insurance: profileDoc?.has_life_insurance,
        has_health_insurance: profileDoc?.has_health_insurance,
      };

      try {
        const resolvedUserId = String(profileDoc?.user_id || profileDoc?.firebase_uid || firebaseUid || `email:${String(currentUser?.email || '').trim().toLowerCase()}`);
        let topExpenseCategories: string[] = [];
        try {
          const month = new Date().toISOString().slice(0, 7);
          const monthlySummary = await apiService.getMonthlySummary(resolvedUserId, month);
          topExpenseCategories = Object.entries(monthlySummary.category_breakdown || {})
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([category]) => category);
        } catch {
          topExpenseCategories = [];
        }

        const resp = await apiService.recommendSchemes(bp);
        const keywords = buildRelevanceKeywords(profileDoc, p, topExpenseCategories);
        const relevantSchemes = rankRelevantSchemes(resp.schemes, keywords);
        setSchemes(relevantSchemes);
        setFiltered(relevantSchemes);
        setTotal(resp.total_estimated_benefits);
        setMissing(resp.missing_benefit_count);
        setBackendAvail(true);
      } catch {
        // Fallback to local recommendation engine
        setBackendAvail(false);
        if (p) {
          const recs = getFinancialRecommendations('WORKING_PROFESSIONAL' as any, p.monthlyIncome, p.riskTolerance, p.financialGoals, p);
          const localSchemes: SchemeRecommendation[] = recs.schemes.map((s, i) => ({
            scheme: {
              scheme_id: `local_${i}`,
              scheme_name: s.scheme_name,
              ministry: s.ministry,
              description: s.description,
              benefits: s.benefits,
              eligibility: s.eligibility,
              category: s.category || 'grant',
              application_link: s.application_link,
              estimated_annual_benefit: undefined,
            },
            eligibility_match: 0.8,
            reason: s.target_beneficiaries || 'Based on your profile',
            estimated_annual_benefit: 0,
          }));
          setSchemes(localSchemes);
          setFiltered(localSchemes);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const filterBy = (cat: string) => {
    setActiveCat(cat);
    setFiltered(
      cat === 'All'
        ? schemes
        : schemes.filter((r) => r.scheme.category === cat)
    );
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handlePromptAnswer = async (value: string | boolean | number) => {
    if (!profileDoc || !prompt || savingPrompt) return;
    if (handleCustomPromptVisibility(value)) return;

    const resolvedEmail = String(profileDoc.email || currentUser?.email || '').trim().toLowerCase();
    const resolvedUserId = String(profileDoc.user_id || profileDoc.firebase_uid || firebaseUid || `email:${resolvedEmail}`);

    const payload: BackendProfile = {
      user_id: resolvedUserId,
      firebase_uid: resolvedUserId,
      name: profileDoc.name || profileDoc.display_name || profileDoc.full_name || 'User',
      full_name: profileDoc.full_name || profileDoc.display_name || profileDoc.name || 'User',
      display_name: profileDoc.display_name || profileDoc.full_name || profileDoc.name || 'User',
      email: resolvedEmail,
      phone_number: profileDoc.phone_number || '',
      user_type: profileDoc.user_type || 'STUDENT',
      risk_tolerance: profileDoc.risk_tolerance || 'MODERATE',
      age: profileDoc.age_confirmed ? Number(profileDoc.age ?? 30) : undefined,
      age_confirmed: profileDoc.age_confirmed ?? false,
      gender: String(profileDoc.gender ?? 'other'),
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
      await loadSchemes();
    } finally {
      setSavingPrompt(false);
    }
  };

  const submitCustomOccupationSubtype = async () => {
    const normalized = customOccupationSubtype.trim().toLowerCase().replace(/\s+/g, '_');
    if (!normalized) return;
    await handlePromptAnswer(normalized);
  };

  if (loading) {
    return <View style={st.center}><ActivityIndicator size="large" color={AIColors.primary} /></View>;
  }

  return (
    <SafeAreaView style={st.safe}>
      <GridBackdrop />
      <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator>

        {/* Missing Benefits Hero */}
        <View style={st.hero}>
          <Text style={st.heroTag}>Estimated Benefits You&apos;re Missing</Text>
          <Text style={st.heroAmount}>{fmt(totalBenefits)}<Text style={st.heroYear}>/year</Text></Text>
          {missingCount > 0 && (
            <Text style={st.heroSub}>{missingCount} more scheme{missingCount !== 1 ? 's' : ''} may also apply</Text>
          )}
          {!backendAvail && (
            <View style={st.offlinePill}>
              <Text style={st.offlineTxt}>Offline — start backend for live data</Text>
            </View>
          )}
        </View>

        {/* Safety notice */}
        <View style={st.notice}>
          <Text style={st.noticeTxt}>
            ℹ️  Applications are processed on official government websites. This app only helps you discover eligible schemes.
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

        {/* Category filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.filterRow}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                st.filterChip,
                activeCat === cat && {
                  backgroundColor: (cat === 'All' ? AIColors.primary : catColor(cat)) + '22',
                  borderColor: cat === 'All' ? AIColors.primary : catColor(cat),
                },
              ]}
              onPress={() => filterBy(cat)}
            >
              <Text style={[
                st.filterChipTxt,
                activeCat === cat && { color: cat === 'All' ? AIColors.primary : catColor(cat) },
              ]}>
                {cat === 'All' ? 'All' : cat.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Scheme count */}
        <Text style={st.countTxt}>{filtered.length} scheme{filtered.length !== 1 ? 's' : ''} found</Text>

        {/* Scheme cards */}
        {filtered.map((rec) => {
          const isOpen = expanded[rec.scheme.scheme_id] ?? false;
          const cc = catColor(rec.scheme.category);
          return (
            <View key={rec.scheme.scheme_id} style={[st.schemeCard, { borderLeftColor: cc }]}>
              {/* Top row */}
              <View style={st.schemeTop}>
                <View style={[st.catTag, { backgroundColor: cc + '22' }]}>
                  <Text style={[st.catTagTxt, { color: cc }]}>
                    {rec.scheme.category.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
                {rec.scheme.estimated_annual_benefit != null && rec.scheme.estimated_annual_benefit > 0 && (
                  <Text style={st.benefitAmt}>{fmt(rec.scheme.estimated_annual_benefit)}/yr</Text>
                )}
              </View>

              <Text style={st.schemeName}>{rec.scheme.scheme_name}</Text>
              <Text style={st.schemeMini}>{rec.scheme.ministry}</Text>
              <Text style={st.schemeDesc} numberOfLines={isOpen ? undefined : 2}>{rec.scheme.description}</Text>

              {/* Eligibility reason */}
              <View style={st.reasonRow}>
                <Text style={st.reasonIcon}>✓</Text>
                <Text style={st.reasonTxt}>{rec.reason}</Text>
              </View>

              {/* Expandable detail */}
              {isOpen && (
                <View style={st.detail}>
                  <Text style={st.detailHdr}>Benefits</Text>
                  <Text style={st.detailTxt}>{rec.scheme.benefits}</Text>
                  <Text style={st.detailHdr}>Eligibility</Text>
                  <Text style={st.detailTxt}>{rec.scheme.eligibility}</Text>
                </View>
              )}

              {/* Action buttons */}
              <View style={st.btns}>
                <TouchableOpacity
                  style={st.applyBtn}
                  onPress={() => Linking.openURL(rec.scheme.application_link)}
                >
                  <Text style={st.applyTxt}>Apply Now</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={st.detailBtn}
                  onPress={() => toggleExpand(rec.scheme.scheme_id)}
                >
                  <Text style={st.detailBtnTxt}>{isOpen ? 'Hide Details' : 'View Details'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {filtered.length === 0 && (
          <View style={st.emptyCard}>
            <Text style={st.emptyTxt}>No schemes found for this category. Try a different filter.</Text>
          </View>
        )}

        <View style={{ height: 96 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AIColors.background },
  content: { padding: AISpacing.md },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: AIColors.background },
  hero: { backgroundColor: AIColors.surface, borderRadius: AIRadius.xl, padding: AISpacing.lg, marginBottom: AISpacing.md, borderWidth: 1, borderColor: AIColors.primary + '40', alignItems: 'center', ...AIShadows.glow },
  heroTag: { ...AITypography.label, color: AIColors.textSecondary, marginBottom: AISpacing.sm },
  heroAmount: { ...AITypography.displayMedium, color: AIColors.primary },
  heroYear: { ...AITypography.bodyLarge, color: AIColors.textSecondary },
  heroSub: { ...AITypography.bodySmall, color: AIColors.textSecondary, marginTop: 6 },
  offlinePill: { marginTop: AISpacing.sm, backgroundColor: AIColors.warningDim, paddingHorizontal: AISpacing.md, paddingVertical: 4, borderRadius: AIRadius.full },
  offlineTxt: { ...AITypography.labelSmall, color: AIColors.warning },
  notice: { backgroundColor: AIColors.secondaryDim, borderRadius: AIRadius.md, padding: AISpacing.sm, marginBottom: AISpacing.md, borderLeftWidth: 3, borderLeftColor: AIColors.secondary },
  noticeTxt: { ...AITypography.bodySmall, color: AIColors.textSecondary },
  promptCard: {
    backgroundColor: AIColors.surface,
    borderRadius: AIRadius.lg,
    borderWidth: 1,
    borderColor: AIColors.borderGlow,
    padding: AISpacing.md,
    marginBottom: AISpacing.md,
  },
  promptTitle: { ...AITypography.h3, color: AIColors.text, marginBottom: 4 },
  promptSubtitle: { ...AITypography.bodySmall, color: AIColors.textSecondary, marginBottom: AISpacing.sm },
  promptOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: AISpacing.sm, marginBottom: AISpacing.sm },
  promptChip: {
    backgroundColor: AIColors.backgroundSecondary,
    borderWidth: 1,
    borderColor: AIColors.border,
    borderRadius: AIRadius.full,
    paddingHorizontal: AISpacing.md,
    paddingVertical: 7,
  },
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
  filterRow: { marginBottom: AISpacing.sm },
  filterChip: { paddingHorizontal: AISpacing.md, paddingVertical: 7, borderRadius: AIRadius.full, borderWidth: 1, borderColor: AIColors.border, marginRight: AISpacing.sm, backgroundColor: AIColors.surfaceLight },
  filterChipTxt: { ...AITypography.label, color: AIColors.textSecondary },
  countTxt: { ...AITypography.bodySmall, color: AIColors.textMuted, marginBottom: AISpacing.md },
  schemeCard: { backgroundColor: AIColors.surface, borderRadius: AIRadius.xl, padding: AISpacing.lg, marginBottom: AISpacing.md, borderWidth: 1, borderColor: AIColors.border, borderLeftWidth: 4, ...AIShadows.sm },
  schemeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: AISpacing.sm },
  catTag: { paddingHorizontal: AISpacing.sm, paddingVertical: 3, borderRadius: AIRadius.sm },
  catTagTxt: { ...AITypography.labelSmall },
  benefitAmt: { ...AITypography.bodySmall, color: AIColors.primary },
  schemeName: { ...AITypography.h3, color: AIColors.text, marginBottom: 2 },
  schemeMini: { ...AITypography.labelSmall, color: AIColors.textMuted, marginBottom: AISpacing.sm },
  schemeDesc: { ...AITypography.bodySmall, color: AIColors.textSecondary, marginBottom: AISpacing.sm },
  reasonRow: { flexDirection: 'row', gap: 6, backgroundColor: AIColors.successDim, borderRadius: AIRadius.sm, padding: AISpacing.sm, marginBottom: AISpacing.md },
  reasonIcon: { ...AITypography.bodySmall, color: AIColors.success },
  reasonTxt: { ...AITypography.bodySmall, flex: 1, color: AIColors.success },
  detail: { backgroundColor: AIColors.backgroundSecondary, borderRadius: AIRadius.md, padding: AISpacing.md, marginBottom: AISpacing.md },
  detailHdr: { ...AITypography.label, color: AIColors.textSecondary, marginBottom: 4, marginTop: AISpacing.sm },
  detailTxt: { ...AITypography.bodySmall, color: AIColors.text },
  btns: { flexDirection: 'row', gap: AISpacing.sm },
  applyBtn: { flex: 1, backgroundColor: AIColors.primary, padding: AISpacing.md, borderRadius: AIRadius.lg, alignItems: 'center' },
  applyTxt: { ...AITypography.buttonSmall, color: AIColors.background },
  detailBtn: { flex: 1, padding: AISpacing.md, borderRadius: AIRadius.lg, alignItems: 'center', borderWidth: 1, borderColor: AIColors.border },
  detailBtnTxt: { ...AITypography.buttonSmall, color: AIColors.textSecondary },
  emptyCard: { backgroundColor: AIColors.surface, borderRadius: AIRadius.xl, padding: AISpacing.xl, alignItems: 'center', borderWidth: 1, borderColor: AIColors.border },
  emptyTxt: { ...AITypography.body, color: AIColors.textSecondary, textAlign: 'center' },
});
