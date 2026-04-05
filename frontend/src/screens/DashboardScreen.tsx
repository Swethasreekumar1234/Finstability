/**
 * Screen 1 - Finance Hub (Home Tab)
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Linking, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
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

const PROFILE_KEY = 'financial_profile';
type StackNav = NativeStackNavigationProp<RootStackParamList>;

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
      const profileDoc = user?.email
        ? await apiService.getProfileByEmail(user.email)
        : firebaseUid
          ? await apiService.getProfileByUserId(firebaseUid)
          : null;
      const p: FinancialProfile | null = profileDoc ? backendProfileToFinancialProfile(profileDoc) : null;
      if (profileDoc) {
        setProfileCompleteness(Number(profileDoc.profile_completeness ?? 0));
        setProfileLayer(String(profileDoc.profile_layer ?? 'Identity & life stage'));
        setMissingFields(Array.isArray(profileDoc.missing_fields) ? profileDoc.missing_fields : []);
        setUnlockedCapabilities(Array.isArray(profileDoc.unlocked_capabilities) ? profileDoc.unlocked_capabilities : []);
        setNextPrompt(profileDoc.next_prompt ?? null);
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
          const resp = await apiService.recommendSchemes({
            age: 28, gender: 'male', state: 'Delhi', occupation: 'salaried',
            employment_type: (p.employmentType ?? 'FULL_TIME').toLowerCase(),
            monthly_income: p.monthlyIncome, monthly_expenses: p.monthlyExpenses,
            total_savings: p.totalSavings, total_debts: p.existingLoans, family_size: 3,
          });
          setSchemes(resp.schemes.slice(0, 3));
          setTotalBenefits(resp.total_estimated_benefits);
        } catch { setSchemes([]); }
      }
    } finally { setLoading(false); }
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
        showsVerticalScrollIndicator={false}
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
