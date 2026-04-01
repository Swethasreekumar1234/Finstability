/**
 * Screen 4 – Benefits (Government Schemes & Missing Benefits)
 * Key screen: missing benefits summary + filterable scheme cards with Apply/View buttons
 */
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, Linking, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FinancialProfile } from '../types';
import { AIColors, AISpacing, AIRadius, AIShadows, AITypography, AISchemeCategoryColors } from '../theme/aiTheme';
import { GridBackdrop } from '../components/ui';
import { apiService, SchemeRecommendation } from '../services/apiService';
import { getFinancialRecommendations } from '../services/recommendationEngine';

const PROFILE_KEY = 'financial_profile';

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

export default function BenefitsScreen() {
  const [schemes, setSchemes]         = useState<SchemeRecommendation[]>([]);
  const [filtered, setFiltered]       = useState<SchemeRecommendation[]>([]);
  const [totalBenefits, setTotal]     = useState(0);
  const [missingCount, setMissing]    = useState(0);
  const [loading, setLoading]         = useState(true);
  const [activeCat, setActiveCat]     = useState('All');
  const [expanded, setExpanded]       = useState<Record<string, boolean>>({});
  const [backendAvail, setBackendAvail] = useState(false);

  useFocusEffect(useCallback(() => {
    loadSchemes();
  }, []));

  const loadSchemes = async () => {
    setLoading(true);
    try {
      const raw = await AsyncStorage.getItem(PROFILE_KEY);
      const p: FinancialProfile | null = raw ? JSON.parse(raw) : null;

      const bp = {
        age: p ? 28 : 28,
        gender: 'male',
        state: 'Delhi',
        occupation: 'salaried',
        employment_type: (p?.employmentType ?? 'FULL_TIME').toLowerCase(),
        monthly_income: p?.monthlyIncome ?? 30000,
        monthly_expenses: p?.monthlyExpenses ?? 20000,
        total_savings: p?.totalSavings ?? 0,
        total_debts: p?.existingLoans ?? 0,
        family_size: 3,
      };

      try {
        const resp = await apiService.recommendSchemes(bp);
        setSchemes(resp.schemes);
        setFiltered(resp.schemes);
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

  if (loading) {
    return <View style={st.center}><ActivityIndicator size="large" color={AIColors.primary} /></View>;
  }

  return (
    <SafeAreaView style={st.safe}>
      <GridBackdrop />
      <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>

        {/* Missing Benefits Hero */}
        <View style={st.hero}>
          <Text style={st.heroTag}>Estimated Benefits You're Missing</Text>
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
