/**
 * Investment recommendations with backend portfolios
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AIColors, AIRadius, AISpacing, AIShadows } from '../theme/aiTheme';
import { FinancialProfile } from '../types';
import { apiService, InvestmentPortfolio } from '../services/apiService';

const FINANCIAL_PROFILE_KEY = 'financial_profile';

function money(v: number): string {
  if (v >= 10000000) return '\\u20B9' + (v / 10000000).toFixed(1) + 'Cr';
  if (v >= 100000) return '\\u20B9' + (v / 100000).toFixed(1) + 'L';
  if (v >= 1000) return '\\u20B9' + (v / 1000).toFixed(1) + 'K';
  return '\\u20B9' + v.toFixed(0);
}

function toBackendProfile(profile: FinancialProfile | null) {
  return {
    age: 30,
    gender: 'male',
    state: 'Delhi',
    occupation: 'salaried',
    employment_type: (profile?.employmentType ?? 'FULL_TIME').toLowerCase(),
    monthly_income: profile?.monthlyIncome ?? 30000,
    monthly_expenses: profile?.monthlyExpenses ?? 18000,
    total_savings: profile?.totalSavings ?? 0,
    total_debts: profile?.existingLoans ?? 0,
    family_size: 3,
  };
}

function fallbackPortfolios(): InvestmentPortfolio[] {
  return [
    {
      name: 'Conservative Wealth Builder',
      risk_level: 'low',
      risk_color: AIColors.success,
      description: 'Capital protection with steady growth and low volatility.',
      allocation: { 'Liquid Fund': 20, 'PPF/EPF': 35, 'Debt Fund': 30, Gold: 15 },
      expected_return_min: 7,
      expected_return_max: 9,
      platforms: ['Groww', 'Paytm Money'],
      platform_urls: ['https://groww.in', 'https://www.paytmmoney.com'],
      explanation: 'Useful if your short-term safety and stability are top priorities.',
      min_monthly_sip: 2000,
    },
    {
      name: 'Balanced Growth Mix',
      risk_level: 'moderate',
      risk_color: AIColors.warning,
      description: 'Blend of equity and debt with moderate risk and inflation-beating return.',
      allocation: { 'Index Funds': 45, 'Debt Funds': 25, Gold: 10, 'Flexi-cap': 20 },
      expected_return_min: 10,
      expected_return_max: 13,
      platforms: ['Zerodha Coin', 'Kuvera'],
      platform_urls: ['https://coin.zerodha.com', 'https://kuvera.in'],
      explanation: 'Good baseline for most long-term investors with controlled drawdowns.',
      min_monthly_sip: 3000,
    },
    {
      name: 'High Growth Equity Tilt',
      risk_level: 'high',
      risk_color: AIColors.error,
      description: 'Equity-heavy allocation focused on long time horizons and growth.',
      allocation: { 'Large Cap': 30, 'Mid Cap': 30, 'Small Cap': 20, International: 20 },
      expected_return_min: 12,
      expected_return_max: 17,
      platforms: ['Groww', 'INDmoney'],
      platform_urls: ['https://groww.in', 'https://www.indmoney.com'],
      explanation: 'Designed for investors who can handle volatility for higher upside.',
      min_monthly_sip: 5000,
    },
  ];
}

function riskColor(level: string): string {
  const v = level.toLowerCase();
  if (v.includes('low') || v.includes('conservative')) return AIColors.success;
  if (v.includes('high') || v.includes('aggressive')) return AIColors.error;
  return AIColors.warning;
}

export default function InvestmentRecommendationsScreen() {
  const [loading, setLoading] = useState(true);
  const [portfolios, setPortfolios] = useState<InvestmentPortfolio[]>([]);
  const [monthlyAmount, setMonthlyAmount] = useState(0);
  const [primary, setPrimary] = useState('Balanced Growth Mix');
  const [reasoning, setReasoning] = useState('Based on income, savings and debt profile.');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        setLoading(true);
        try {
          const raw = await AsyncStorage.getItem(FINANCIAL_PROFILE_KEY);
          const profile: FinancialProfile | null = raw ? JSON.parse(raw) : null;
          const resp = await apiService.recommendInvestments(toBackendProfile(profile));
          if (!active) return;
          setPortfolios(resp.portfolios);
          setMonthlyAmount(resp.recommended_monthly_investment);
          setPrimary(resp.primary_recommendation);
          setReasoning(resp.reasoning);
        } catch {
          if (!active) return;
          setPortfolios(fallbackPortfolios());
          setMonthlyAmount(3000);
          setPrimary('Balanced Growth Mix');
          setReasoning('Using offline recommendations. Start backend for live RAG-based guidance.');
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  const sorted = useMemo(() => {
    const data = [...portfolios];
    data.sort((a, b) => {
      if (a.name === primary) return -1;
      if (b.name === primary) return 1;
      return 0;
    });
    return data;
  }, [portfolios, primary]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={AIColors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Investment Recommendations</Text>
        <Text style={styles.subtitle}>Three portfolios tailored to your current profile.</Text>

        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Suggested Monthly Investment</Text>
          <Text style={styles.heroAmount}>{money(monthlyAmount)}/mo</Text>
          <Text style={styles.heroReason}>{reasoning}</Text>
        </View>

        {sorted.map((p) => {
          const color = p.risk_color || riskColor(p.risk_level);
          const isPrimary = p.name === primary;
          const allocationRows = Object.entries(p.allocation || {});
          const firstLink = p.platform_urls?.[0] || '';
          return (
            <View key={p.name} style={[styles.card, isPrimary && styles.cardPrimary]}>
              <View style={styles.cardTop}>
                <View style={[styles.riskBadge, { backgroundColor: color + '22' }]}>
                  <Text style={[styles.riskText, { color }]}>{p.risk_level.toUpperCase()} RISK</Text>
                </View>
                <Text style={styles.returnText}>{p.expected_return_min}% - {p.expected_return_max}%</Text>
              </View>

              <Text style={styles.cardTitle}>{p.name}</Text>
              <Text style={styles.cardDesc}>{p.description}</Text>
              {isPrimary && <Text style={styles.primaryNote}>Primary recommendation</Text>}

              <View style={styles.allocWrap}>
                {allocationRows.map(([name, pct]) => (
                  <View key={name} style={styles.allocRow}>
                    <Text style={styles.allocName}>{name}</Text>
                    <Text style={styles.allocPct}>{pct}%</Text>
                  </View>
                ))}
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaText}>Minimum SIP: {money(p.min_monthly_sip)}/mo</Text>
              </View>

              <TouchableOpacity
                style={styles.cta}
                onPress={() => {
                  if (firstLink) Linking.openURL(firstLink);
                }}
              >
                <Text style={styles.ctaText}>Start Investing</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        <View style={styles.notice}>
          <Text style={styles.noticeText}>Investments are market-linked. Review risk and diversify before investing.</Text>
        </View>

        <View style={{ height: 96 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AIColors.background },
  content: { padding: AISpacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: AIColors.background },
  title: { fontSize: 27, fontWeight: '900', color: AIColors.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: AIColors.textSecondary, marginBottom: AISpacing.md },
  heroCard: {
    backgroundColor: AIColors.surface,
    borderRadius: AIRadius.xl,
    borderWidth: 1,
    borderColor: AIColors.primary + '44',
    padding: AISpacing.lg,
    marginBottom: AISpacing.md,
    ...AIShadows.glow,
  },
  heroLabel: { fontSize: 12, color: AIColors.textSecondary, marginBottom: 4 },
  heroAmount: { fontSize: 38, lineHeight: 42, fontWeight: '900', color: AIColors.primary },
  heroReason: { fontSize: 12, color: AIColors.textSecondary, marginTop: 6, lineHeight: 18 },
  card: {
    backgroundColor: AIColors.surface,
    borderRadius: AIRadius.xl,
    borderWidth: 1,
    borderColor: AIColors.border,
    padding: AISpacing.md,
    marginBottom: AISpacing.md,
    ...AIShadows.sm,
  },
  cardPrimary: { borderColor: AIColors.primary + '66' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  riskBadge: { borderRadius: AIRadius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  riskText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  returnText: { fontSize: 13, color: AIColors.success, fontWeight: '700' },
  cardTitle: { fontSize: 17, color: AIColors.text, fontWeight: '800', marginBottom: 4 },
  cardDesc: { fontSize: 13, color: AIColors.textSecondary, lineHeight: 18, marginBottom: 8 },
  primaryNote: { fontSize: 11, color: AIColors.primary, marginBottom: 8, fontWeight: '600' },
  allocWrap: {
    backgroundColor: AIColors.backgroundSecondary,
    borderRadius: AIRadius.md,
    borderWidth: 1,
    borderColor: AIColors.border,
    padding: AISpacing.sm,
    marginBottom: 8,
  },
  allocRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  allocName: { fontSize: 12, color: AIColors.textSecondary },
  allocPct: { fontSize: 12, color: AIColors.text, fontWeight: '700' },
  metaRow: { marginBottom: AISpacing.sm },
  metaText: { fontSize: 12, color: AIColors.textMuted },
  cta: {
    backgroundColor: AIColors.primary,
    borderRadius: AIRadius.lg,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ctaText: { fontSize: 13, fontWeight: '800', color: AIColors.background },
  notice: {
    backgroundColor: AIColors.warningDim,
    borderRadius: AIRadius.lg,
    borderLeftWidth: 3,
    borderLeftColor: AIColors.warning,
    padding: AISpacing.sm,
  },
  noticeText: { fontSize: 11, color: AIColors.textSecondary, lineHeight: 16 },
});
