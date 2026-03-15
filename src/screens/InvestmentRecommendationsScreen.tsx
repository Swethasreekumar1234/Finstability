/**
 * Invest Tab - Loans and investment recommendations
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FinancialProfile, RiskTolerance } from '../types';
import { useAuthStore } from '../store/authStore';
import { AIColors, AISpacing, AIRadius } from '../theme/aiTheme';
import {
  getFinancialRecommendations,
  LoanRecommendation,
  InvestmentRecommendation,
} from '../services/recommendationEngine';

const FINANCIAL_PROFILE_KEY = 'financial_profile';

const RISK_COLORS: Record<RiskTolerance, string> = {
  LOW: AIColors.success,
  MODERATE: AIColors.warning,
  HIGH: AIColors.error,
};

type SubTab = 'invest' | 'loans' | 'tips';

export default function InvestmentRecommendationsScreen() {
  const { currentUser: user } = useAuthStore();
  const [loans, setLoans] = useState<LoanRecommendation[]>([]);
  const [investments, setInvestments] = useState<InvestmentRecommendation[]>([]);
  const [tips, setTips] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<SubTab>('invest');

  useFocusEffect(useCallback(() => {
    (async () => {
      try {
        const data = await AsyncStorage.getItem(FINANCIAL_PROFILE_KEY);
        const profile: FinancialProfile | undefined = data ? JSON.parse(data) : undefined;
        if (user) {
          const recs = getFinancialRecommendations(
            user.userType,
            profile?.monthlyIncome ?? user.monthlyIncome ?? 0,
            profile?.riskTolerance ?? user.riskTolerance,
            profile?.financialGoals ?? [],
            profile
          );
          setInvestments(recs.investments);
          setLoans(recs.loans);
          setTips(recs.tips);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={AIColors.primary} />
      </View>
    );
  }

  const TABS: Array<{ key: SubTab; label: string; count: number }> = [
    { key: 'invest', label: 'Investments', count: investments.length },
    { key: 'loans', label: 'Loans', count: loans.length },
    { key: 'tips', label: 'Tips', count: tips.length },
  ];

  const isEmpty =
    (activeTab === 'invest' && !investments.length) ||
    (activeTab === 'loans' && !loans.length) ||
    (activeTab === 'tips' && !tips.length);

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <Text style={styles.pageTitle}>Invest &amp; Finance</Text>
          <Text style={styles.pageSubtitle}>Personalized recommendations for your goals</Text>

          <View style={styles.tabRow}>
            {TABS.map((t) => (
              <TouchableOpacity
                key={t.key}
                style={[styles.tabBtn, activeTab === t.key && styles.tabBtnActive]}
                onPress={() => setActiveTab(t.key)}
              >
                <Text style={[styles.tabLabel, activeTab === t.key && styles.tabLabelActive]}>
                  {t.label} ({t.count})
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === 'invest' && investments.map((inv) => {
            const riskColor = RISK_COLORS[inv.riskLevel] ?? AIColors.primary;
            return (
              <View key={inv.name} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={[styles.badge, { backgroundColor: riskColor + '20' }]}>
                    <Text style={[styles.badgeText, { color: riskColor }]}>{inv.riskLevel} RISK</Text>
                  </View>
                  <Text style={[styles.returnRate, { color: AIColors.success }]}>{inv.expectedReturns}</Text>
                </View>
                <Text style={styles.cardTitle}>{inv.name}</Text>
                <Text style={styles.cardDesc}>{inv.description}</Text>
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Min Investment</Text>
                    <Text style={styles.metaValue}>{inv.minInvestment}</Text>
                  </View>
                  <View style={styles.metaSep} />
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Lock-in Period</Text>
                    <Text style={styles.metaValue}>{inv.lockInPeriod}</Text>
                  </View>
                </View>
                {inv.taxBenefits && (
                  <View style={styles.taxBadge}>
                    <Text style={styles.taxBadgeText}>Tax Benefits Available</Text>
                  </View>
                )}
              </View>
            );
          })}

          {activeTab === 'loans' && loans.map((loan) => (
            <View key={loan.name} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.badge, { backgroundColor: AIColors.secondary + '20' }]}>
                  <Text style={[styles.badgeText, { color: AIColors.secondary }]}>{loan.type.toUpperCase()}</Text>
                </View>
                <Text style={[styles.returnRate, { color: AIColors.secondary }]}>{loan.interestRange}</Text>
              </View>
              <Text style={styles.cardTitle}>{loan.name}</Text>
              <Text style={styles.cardDesc}>{loan.description}</Text>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Max Amount</Text>
                  <Text style={styles.metaValue}>{loan.maxAmount}</Text>
                </View>
              </View>
              <View style={styles.featuresList}>
                {loan.features.slice(0, 3).map((f) => (
                  <Text key={f} style={styles.featureItem}>{'\u2022'} {f}</Text>
                ))}
              </View>
            </View>
          ))}

          {activeTab === 'tips' && tips.map((tip, i) => (
            <View key={i} style={styles.tipCard}>
              <View style={styles.tipNum}>
                <Text style={styles.tipNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}

          {isEmpty && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Complete your profile to see personalized recommendations.</Text>
            </View>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AIColors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: AIColors.background },
  scroll: { paddingHorizontal: AISpacing.lg, paddingTop: AISpacing.lg, paddingBottom: 96 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: AIColors.text, marginBottom: 4 },
  pageSubtitle: { fontSize: 14, color: AIColors.textSecondary, marginBottom: 16 },
  tabRow: {
    flexDirection: 'row', gap: 6, marginBottom: 16,
    backgroundColor: AIColors.surface, borderRadius: AIRadius.lg,
    padding: 4, borderWidth: 1, borderColor: AIColors.border,
  },
  tabBtn: { flex: 1, borderRadius: AIRadius.md, paddingVertical: 8, alignItems: 'center' },
  tabBtnActive: { backgroundColor: AIColors.primary },
  tabLabel: { fontSize: 12, fontWeight: '600', color: AIColors.textSecondary },
  tabLabelActive: { color: AIColors.background },
  card: {
    backgroundColor: AIColors.surface, borderRadius: AIRadius.xl,
    padding: AISpacing.md, borderWidth: 1, borderColor: AIColors.border, marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  badge: { borderRadius: AIRadius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  returnRate: { fontSize: 14, fontWeight: '700' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: AIColors.text, marginBottom: 4 },
  cardDesc: { fontSize: 13, color: AIColors.textSecondary, lineHeight: 18, marginBottom: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  metaItem: { flex: 1 },
  metaSep: { width: 1, height: 28, backgroundColor: AIColors.border, marginHorizontal: 10 },
  metaLabel: { fontSize: 10, color: AIColors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  metaValue: { fontSize: 13, fontWeight: '600', color: AIColors.text },
  taxBadge: {
    backgroundColor: AIColors.success + '15', borderRadius: AIRadius.sm,
    paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start',
    borderWidth: 1, borderColor: AIColors.success + '30',
  },
  taxBadgeText: { fontSize: 11, color: AIColors.success, fontWeight: '600' },
  featuresList: { gap: 3 },
  featureItem: { fontSize: 12, color: AIColors.textSecondary },
  tipCard: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: AIColors.surface, borderRadius: AIRadius.lg,
    padding: AISpacing.md, borderWidth: 1, borderColor: AIColors.border, marginBottom: 10,
  },
  tipNum: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: AIColors.primary + '20', justifyContent: 'center', alignItems: 'center',
  },
  tipNumText: { fontSize: 12, fontWeight: '700', color: AIColors.primary },
  tipText: { flex: 1, fontSize: 13, color: AIColors.text, lineHeight: 19 },
  emptyState: { padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 14, color: AIColors.textSecondary, textAlign: 'center' },
});
