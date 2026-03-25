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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList, FinancialProfile } from '../types';
import { useAuthStore } from '../store/authStore';
import { AIColors, AISpacing, AIRadius, AIShadows } from '../theme/aiTheme';
import { ProgressBar } from '../components/ai';
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
  const m: Record<string,string> = {
    subsidy: '#F59E0B', pension: '#8B5CF6', insurance: '#3B82F6',
    grant: '#10B981', loan_support: '#EF4444', scholarship: '#EC4899',
  };
  return m[cat] ?? AIColors.primary;
}

export default function DashboardScreen() {
  const nav = useNavigation<StackNav>();
  const { currentUser: user, logout } = useAuthStore();
  const [profile, setProfile] = useState<FinancialProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [schemes, setSchemes] = useState<SchemeRecommendation[]>([]);
  const [tips, setTips] = useState<string[]>([]);
  const [totalBenefits, setTotalBenefits] = useState(0);
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
      const raw = await AsyncStorage.getItem(PROFILE_KEY);
      const p: FinancialProfile | null = raw ? JSON.parse(raw) : null;
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
      <ScrollView style={st.scroll} contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
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
              <Text style={st.benefitLbl}>Estimated missing benefits</Text>
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
            <>
              <Text style={st.section}>Financial Tips</Text>
              {tips.map((tip, i) => (
                <View key={i} style={st.tipCard}>
                  <Text style={st.tipNum}>#{i + 1}</Text>
                  <Text style={st.tipTxt}>{tip}</Text>
                </View>
              ))}
            </>
          )}
          {/* Quick actions */}
          <Text style={st.section}>Quick Actions</Text>
          <View style={st.actions}>
            {[
              { icon: 'Edit', lbl: 'Update Profile',  fn: () => nav.navigate('FinancialInput') },
              { icon: 'Tips', lbl: 'All Tips',         fn: () => nav.navigate('Tips') },
              { icon: 'Invest', lbl: 'Investments',   fn: () => nav.navigate('InvestmentRecommendations') },
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
  content: { padding: AISpacing.md },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: AIColors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: AISpacing.md },
  greeting: { fontSize: 13, color: AIColors.textSecondary },
  name: { fontSize: 22, fontWeight: '700', color: AIColors.text, marginTop: 2 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: AIColors.primaryDim, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: AIColors.primary },
  avatarTxt: { fontSize: 18, fontWeight: '700', color: AIColors.primary },
  notice: { backgroundColor: AIColors.secondaryDim, borderRadius: AIRadius.md, padding: AISpacing.sm, marginBottom: AISpacing.md, borderLeftWidth: 3, borderLeftColor: AIColors.secondary },
  noticeTxt: { fontSize: 11, color: AIColors.textSecondary, lineHeight: 16 },
  card: { backgroundColor: AIColors.surface, borderRadius: AIRadius.xl, padding: AISpacing.lg, marginBottom: AISpacing.md, borderWidth: 1, borderColor: AIColors.border, ...AIShadows.md },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scoreLbl: { fontSize: 12, color: AIColors.textSecondary, marginBottom: 4 },
  scoreNum: { fontSize: 52, fontWeight: '800' },
  scoreOf: { fontSize: 16, color: AIColors.textMuted, fontWeight: '400' },
  ring: { width: 72, height: 72, borderRadius: 36, borderWidth: 5, justifyContent: 'center', alignItems: 'center' },
  ringNum: { fontSize: 20, fontWeight: '700' },
  scoreTip: { fontSize: 13, color: AIColors.textSecondary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: AISpacing.sm, marginBottom: AISpacing.md },
  statCard: { flex: 1, minWidth: '44%', backgroundColor: AIColors.surface, borderRadius: AIRadius.lg, padding: AISpacing.md, borderWidth: 1, borderColor: AIColors.border },
  statVal: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  statLbl: { fontSize: 11, color: AIColors.textSecondary },
  benefitBanner: { backgroundColor: AIColors.primary + '1A', borderRadius: AIRadius.lg, padding: AISpacing.md, marginBottom: AISpacing.md, borderWidth: 1, borderColor: AIColors.primary + '40', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  benefitLbl: { fontSize: 13, color: AIColors.textSecondary, flex: 1 },
  benefitVal: { fontSize: 20, fontWeight: '800', color: AIColors.primary },
  section: { fontSize: 16, fontWeight: '700', color: AIColors.text, marginBottom: AISpacing.sm, marginTop: AISpacing.sm },
  schemeCard: { backgroundColor: AIColors.surface, borderRadius: AIRadius.lg, padding: AISpacing.md, marginBottom: AISpacing.sm, borderWidth: 1, borderColor: AIColors.border },
  schemeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: AISpacing.sm },
  tag: { paddingHorizontal: AISpacing.sm, paddingVertical: 3, borderRadius: AIRadius.sm },
  tagTxt: { fontSize: 10, fontWeight: '700' },
  schemeBen: { fontSize: 13, fontWeight: '700', color: AIColors.primary },
  schemeName: { fontSize: 15, fontWeight: '700', color: AIColors.text, marginBottom: 4 },
  schemeDesc: { fontSize: 12, color: AIColors.textSecondary, lineHeight: 18, marginBottom: AISpacing.sm },
  applyBtn: { alignSelf: 'flex-start', backgroundColor: AIColors.primaryDim, paddingHorizontal: AISpacing.md, paddingVertical: 6, borderRadius: AIRadius.full, borderWidth: 1, borderColor: AIColors.primary },
  applyTxt: { fontSize: 12, fontWeight: '700', color: AIColors.primary },
  tipCard: { flexDirection: 'row', backgroundColor: AIColors.surface, borderRadius: AIRadius.md, padding: AISpacing.md, marginBottom: AISpacing.sm, borderWidth: 1, borderColor: AIColors.border, gap: AISpacing.sm },
  tipNum: { fontSize: 18, fontWeight: '800', color: AIColors.primary },
  tipTxt: { flex: 1, fontSize: 13, color: AIColors.textSecondary, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: AISpacing.sm, marginTop: AISpacing.sm },
  actionBtn: { flex: 1, backgroundColor: AIColors.surface, borderRadius: AIRadius.lg, padding: AISpacing.md, alignItems: 'center', borderWidth: 1, borderColor: AIColors.border },
  actionIcon: { fontSize: 13, marginBottom: 6, color: AIColors.primary, fontWeight: '700' },
  actionLbl: { fontSize: 11, color: AIColors.textSecondary, textAlign: 'center' },
});
