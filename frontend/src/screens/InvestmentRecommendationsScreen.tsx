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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AIColors, AIRadius, AISpacing, AIShadows, AITypography } from '../theme/aiTheme';
import { FinancialProfile, RootStackParamList } from '../types';
import { apiService, InvestmentPortfolio, FundNavSnapshot } from '../services/apiService';
import { GridBackdrop, ScreenHeader } from '../components/ui';

const FINANCIAL_PROFILE_KEY = 'financial_profile';

function money(v: number): string {
  if (v >= 10000000) return '\u20B9' + (v / 10000000).toFixed(1) + 'Cr';
  if (v >= 100000) return '\u20B9' + (v / 100000).toFixed(1) + 'L';
  if (v >= 1000) return '\u20B9' + (v / 1000).toFixed(1) + 'K';
  return '\u20B9' + v.toFixed(0);
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

function formatDate(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function explainAllocationName(name: string): string {
  const value = name.toLowerCase();
  if (value.includes('mid') || value.includes('small')) return 'Faster-growing companies with higher volatility.';
  if (value.includes('large') || value.includes('index')) return 'Established companies that offer more stability.';
  if (value.includes('international')) return 'Global diversification beyond domestic markets.';
  if (value.includes('elss')) return 'Tax-saving equity allocation with lock-in period.';
  if (value.includes('debt') || value.includes('bond') || value.includes('liquid') || value.includes('fd')) return 'Income-focused instruments with lower risk.';
  if (value.includes('gold')) return 'Inflation hedge and diversification support.';
  if (value.includes('reit')) return 'Real-estate exposure without direct property purchase.';
  return 'Part of a diversified portfolio allocation.';
}

function plainPlanLabel(level: string): string {
  const value = level.toLowerCase();
  if (value.includes('low') || value.includes('conservative')) return 'Stable Plan';
  if (value.includes('high') || value.includes('aggressive')) return 'Growth-focused Plan';
  return 'Balanced Plan';
}

function riskRank(level: string): number {
  const value = level.toLowerCase();
  if (value.includes('low') || value.includes('conservative')) return 1;
  if (value.includes('high') || value.includes('aggressive')) return 3;
  return 2;
}

export default function InvestmentRecommendationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(true);
  const [portfolios, setPortfolios] = useState<InvestmentPortfolio[]>([]);
  const [monthlyAmount, setMonthlyAmount] = useState(0);
  const [primary, setPrimary] = useState('Balanced Growth Mix');
  const [reasoning, setReasoning] = useState('Based on income, savings and debt profile.');
  const [asOf, setAsOf] = useState<string | null>(null);
  const [mode, setMode] = useState<'beginner' | 'confident'>('beginner');
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [showAlternatives, setShowAlternatives] = useState(true);
  const [showGlossary, setShowGlossary] = useState(false);

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
          setAsOf(resp.as_of ?? null);
          const initialExpanded: Record<string, boolean> = {};
          resp.portfolios.forEach((portfolio) => {
            initialExpanded[portfolio.name] = portfolio.name === resp.primary_recommendation;
          });
          setExpandedCards(initialExpanded);
        } catch {
          if (!active) return;
          const fallback = fallbackPortfolios();
          setPortfolios(fallback);
          setMonthlyAmount(3000);
          setPrimary('Balanced Growth Mix');
          setReasoning('Using offline recommendations. Start backend for live RAG-based guidance.');
          setAsOf(null);
          const initialExpanded: Record<string, boolean> = {};
          fallback.forEach((portfolio) => {
            initialExpanded[portfolio.name] = portfolio.name === 'Balanced Growth Mix';
          });
          setExpandedCards(initialExpanded);
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

  const primaryPortfolio = useMemo(
    () => sorted.find((p) => p.name === primary) ?? sorted[0] ?? null,
    [sorted, primary]
  );

  const saferPortfolio = useMemo(() => {
    if (!primaryPortfolio) return null;
    const currentRank = riskRank(primaryPortfolio.risk_level);
    return (
      [...portfolios]
        .filter((p) => riskRank(p.risk_level) < currentRank)
        .sort((a, b) => riskRank(b.risk_level) - riskRank(a.risk_level))[0] ?? null
    );
  }, [portfolios, primaryPortfolio]);

  const portfoliosToRender = useMemo(() => {
    if (mode === 'beginner') {
      return primaryPortfolio ? [primaryPortfolio] : [];
    }
    return sorted;
  }, [mode, primaryPortfolio, sorted]);

  const alternativePortfolios = useMemo(() => {
    if (mode !== 'beginner' || !primaryPortfolio) return [];
    return sorted.filter((p) => p.name !== primaryPortfolio.name);
  }, [mode, primaryPortfolio, sorted]);

  const primaryRupeeSplit = useMemo(() => {
    if (!primaryPortfolio) return [] as Array<{ name: string; amount: number }>;
    const rows = Object.entries(primaryPortfolio.allocation || {}).map(([name, pct]) => ({
      name,
      amount: Math.round((monthlyAmount * Number(pct || 0)) / 100),
    }));
    return rows.filter((row) => row.amount > 0).sort((a, b) => b.amount - a.amount);
  }, [primaryPortfolio, monthlyAmount]);

  const modeSubtitle =
    mode === 'beginner'
      ? 'One clear plan with plain-language guidance.'
      : 'Full allocation details for confident investors.';

  const toggleCard = (name: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const applySaferPlan = () => {
    if (!saferPortfolio) return;
    setPrimary(saferPortfolio.name);
    setExpandedCards((prev) => ({ ...prev, [saferPortfolio.name]: true }));
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={AIColors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <GridBackdrop />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader
          title="Investment Recommendations"
          subtitle={modeSubtitle}
          onBack={() => navigation.goBack()}
          backLabel="Back"
        />

        <View style={styles.modeSwitcher}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'beginner' && styles.modeBtnActive]}
            onPress={() => setMode('beginner')}
          >
            <Text style={[styles.modeText, mode === 'beginner' && styles.modeTextActive]}>Beginner</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'confident' && styles.modeBtnActive]}
            onPress={() => setMode('confident')}
          >
            <Text style={[styles.modeText, mode === 'confident' && styles.modeTextActive]}>Confident</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Suggested Monthly Investment</Text>
          <Text style={styles.heroAmount}>{money(monthlyAmount)}/mo</Text>
          <Text style={styles.heroReason}>{reasoning}</Text>
          {mode === 'beginner' ? (
            <View style={styles.beginnerExplainBox}>
              <Text style={styles.beginnerExplainText}>
                This amount is a starting point, not a fixed rule. You can begin small and increase over time as income grows.
              </Text>
            </View>
          ) : (
            <View style={styles.insightPills}>
              <View style={styles.pill}><Text style={styles.pillText}>Inputs: Age, Income, Savings, Debt</Text></View>
              <View style={styles.pill}><Text style={styles.pillText}>Method: Profile fit + Risk alignment</Text></View>
            </View>
          )}
          {asOf ? <Text style={styles.snapshotText}>AMFI snapshot updated {formatDate(asOf)}</Text> : null}
        </View>

        {primaryPortfolio ? (
          <View style={styles.actionCard}>
            <Text style={styles.actionEyebrow}>Do This Now</Text>
            <Text style={styles.actionTitle}>Start with {money(monthlyAmount)}/month in {plainPlanLabel(primaryPortfolio.risk_level)}</Text>
            <Text style={styles.actionSubtitle}>Why this fits you: based on your current income, savings, and debt profile.</Text>

            <View style={styles.actionSplitBox}>
              <Text style={styles.actionSplitTitle}>Monthly split in rupees</Text>
              {primaryRupeeSplit.slice(0, 4).map((row) => (
                <View key={row.name} style={styles.actionSplitRow}>
                  <Text style={styles.actionSplitName}>{row.name}</Text>
                  <Text style={styles.actionSplitAmount}>{money(row.amount)}</Text>
                </View>
              ))}
            </View>

            <View style={styles.guardrailsBox}>
              <Text style={styles.guardrailsText}>Start small if needed. Do not invest emergency savings. Review every 6 months.</Text>
            </View>

            {mode === 'beginner' ? (
              <View style={styles.quickActionsRow}>
                <TouchableOpacity style={styles.quickActionGhost} onPress={() => setShowAlternatives((v) => !v)}>
                  <Text style={styles.quickActionGhostText}>{showAlternatives ? 'Hide other options' : 'Compare other options'}</Text>
                </TouchableOpacity>
                {saferPortfolio ? (
                  <TouchableOpacity style={styles.quickActionSafe} onPress={applySaferPlan}>
                    <Text style={styles.quickActionSafeText}>Make this safer</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}

        {portfoliosToRender.map((p) => {
          const color = p.risk_color || riskColor(p.risk_level);
          const isPrimary = p.name === primary;
          const expanded = mode === 'beginner' ? true : (expandedCards[p.name] ?? isPrimary);
          const allocationRows = Object.entries(p.allocation || {});
          const firstLink = p.platform_urls?.[0] || '';
          const totalAllocation = allocationRows.reduce((sum, [, pct]) => sum + Number(pct || 0), 0) || 100;
          const topMix = [...allocationRows]
            .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))
            .slice(0, 2)
            .map(([name, pct]) => `${name} ${pct}%`)
            .join(' • ');
          return (
            <View key={p.name} style={[styles.card, isPrimary && styles.cardPrimary]}>
              <View style={styles.cardTop}>
                <View style={[styles.riskBadge, { backgroundColor: color + '22' }]}>
                  <Text style={[styles.riskText, { color }]}>{plainPlanLabel(p.risk_level).toUpperCase()}</Text>
                </View>
                <Text style={styles.returnText}>Typical: {p.expected_return_min}% - {p.expected_return_max}%</Text>
              </View>

              <Text style={styles.cardTitle}>{p.name}</Text>
              <Text style={styles.cardDesc}>{p.description}</Text>
              {isPrimary && <Text style={styles.primaryNote}>Primary recommendation</Text>}

              {!expanded ? (
                <View style={styles.collapsedInfoBox}>
                  <Text style={styles.collapsedLine} numberOfLines={2}>{p.explanation}</Text>
                  <Text style={styles.collapsedLine}>Top mix: {topMix}</Text>
                  <Text style={styles.collapsedLine}>Minimum SIP: {money(p.min_monthly_sip)}/mo</Text>
                </View>
              ) : null}

              {mode !== 'beginner' ? (
                <TouchableOpacity style={styles.expandBtn} onPress={() => toggleCard(p.name)}>
                  <Text style={styles.expandBtnText}>{expanded ? 'Show less' : 'See details'}</Text>
                </TouchableOpacity>
              ) : null}

              {expanded && (
                <>
                  <View style={styles.allocBar}>
                    {allocationRows.map(([name, pct], index) => {
                      const width = `${(Number(pct || 0) / totalAllocation) * 100}%` as `${number}%`;
                      const segColor = [AIColors.primary, AIColors.secondary, AIColors.warning, '#a87ee8', AIColors.error][index % 5];
                      return <View key={`seg-${name}`} style={[styles.allocBarSeg, { width, backgroundColor: segColor }]} />;
                    })}
                  </View>

                  <View style={styles.allocWrap}>
                    {allocationRows.map(([name, pct]) => (
                      <View key={name} style={styles.allocRow}>
                        <View style={styles.allocInfo}>
                          <Text style={styles.allocName}>{name}</Text>
                          {mode === 'beginner' ? (
                            <Text style={styles.allocExplain}>{explainAllocationName(name)}</Text>
                          ) : null}
                        </View>
                        <Text style={styles.allocPct}>{pct}%</Text>
                      </View>
                    ))}
                  </View>

                  {mode === 'beginner' ? (
                    <View style={styles.beginnerExplainBox}>
                      <Text style={styles.beginnerExplainText}>{p.explanation}</Text>
                    </View>
                  ) : null}

                  {p.nav_highlights?.length ? (
                    <View style={styles.liveNavBox}>
                      <Text style={styles.liveNavTitle}>Live AMFI matches</Text>
                      {p.nav_highlights.map((nav: FundNavSnapshot) => (
                        <View key={`${nav.scheme_code}-${nav.nav_date}`} style={styles.liveNavRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.liveNavName}>{nav.scheme_name}</Text>
                            <Text style={styles.liveNavMeta}>{nav.scheme_code} • {nav.nav_date}</Text>
                          </View>
                          <Text style={styles.liveNavValue}>{money(nav.nav)}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>Minimum monthly auto-invest: {money(p.min_monthly_sip)}/mo</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.cta}
                    onPress={() => {
                      if (firstLink) Linking.openURL(firstLink);
                    }}
                  >
                    <Text style={styles.ctaText}>Start with this plan</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          );
        })}

        {mode === 'beginner' && showAlternatives && alternativePortfolios.length ? (
          <View style={styles.compareSection}>
            <Text style={styles.compareTitle}>Other options (simple comparison)</Text>
            {alternativePortfolios.map((p) => (
              <TouchableOpacity
                key={`alt-${p.name}`}
                style={styles.compareCard}
                onPress={() => {
                  setPrimary(p.name);
                  setExpandedCards((prev) => ({ ...prev, [p.name]: true }));
                }}
              >
                <View style={styles.compareTopRow}>
                  <Text style={styles.compareName}>{p.name}</Text>
                  <Text style={styles.compareType}>{plainPlanLabel(p.risk_level)}</Text>
                </View>
                <Text style={styles.compareDesc} numberOfLines={2}>{p.explanation}</Text>
                <Text style={styles.compareMeta}>Typical long-term range: {p.expected_return_min}% - {p.expected_return_max}%</Text>
                <Text style={styles.compareMeta}>Start from: {money(p.min_monthly_sip)}/mo</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <TouchableOpacity style={styles.glossaryToggle} onPress={() => setShowGlossary((v) => !v)}>
          <Text style={styles.glossaryToggleText}>{showGlossary ? 'Hide term help' : 'Need help with terms?'}</Text>
        </TouchableOpacity>

        {showGlossary ? (
          <View style={styles.glossaryBox}>
            <Text style={styles.glossaryLine}>Monthly auto-invest: amount invested automatically every month.</Text>
            <Text style={styles.glossaryLine}>Typical long-term range: possible average returns over many years.</Text>
            <Text style={styles.glossaryLine}>Stable/Balanced/Growth-focused: lower to higher ups-and-downs in value.</Text>
          </View>
        ) : null}

        <View style={styles.notice}>
          <Text style={styles.noticeText}>Investments are market-linked. Review risk and diversify before investing.</Text>
        </View>

        <View style={{ height: 140 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AIColors.background },
  content: { padding: AISpacing.md, paddingBottom: AISpacing.xxxl, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: AIColors.background },
  heroCard: {
    backgroundColor: AIColors.surface,
    borderRadius: AIRadius.xl,
    borderWidth: 1,
    borderColor: AIColors.primary + '44',
    padding: AISpacing.lg,
    marginBottom: AISpacing.md,
    ...AIShadows.glow,
  },
  heroLabel: { ...AITypography.label, color: AIColors.textSecondary, marginBottom: 4 },
  heroAmount: { ...AITypography.displayMedium, color: AIColors.primary },
  heroReason: { ...AITypography.bodySmall, color: AIColors.textSecondary, marginTop: 6 },
  snapshotText: { ...AITypography.labelSmall, color: AIColors.textMuted, marginTop: 10 },
  actionCard: {
    backgroundColor: AIColors.surface,
    borderRadius: AIRadius.xl,
    borderWidth: 1,
    borderColor: AIColors.primary + '44',
    padding: AISpacing.md,
    marginBottom: AISpacing.md,
  },
  actionEyebrow: { ...AITypography.label, color: AIColors.primary, marginBottom: 6 },
  actionTitle: { ...AITypography.h3, color: AIColors.text },
  actionSubtitle: { ...AITypography.bodySmall, color: AIColors.textSecondary, marginTop: 6 },
  actionSplitBox: {
    backgroundColor: AIColors.backgroundSecondary,
    borderWidth: 1,
    borderColor: AIColors.border,
    borderRadius: AIRadius.md,
    marginTop: AISpacing.sm,
    padding: AISpacing.sm,
  },
  actionSplitTitle: { ...AITypography.labelSmall, color: AIColors.textMuted, marginBottom: 6 },
  actionSplitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionSplitName: { ...AITypography.bodySmall, color: AIColors.textSecondary, flex: 1, paddingRight: 8 },
  actionSplitAmount: { ...AITypography.bodySmall, color: AIColors.primary },
  guardrailsBox: {
    backgroundColor: AIColors.warningDim,
    borderLeftWidth: 3,
    borderLeftColor: AIColors.warning,
    borderRadius: AIRadius.md,
    padding: AISpacing.sm,
    marginTop: AISpacing.sm,
  },
  guardrailsText: { ...AITypography.bodySmall, color: AIColors.textSecondary },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: AISpacing.sm,
  },
  quickActionGhost: {
    flex: 1,
    borderWidth: 1,
    borderColor: AIColors.border,
    borderRadius: AIRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: AIColors.backgroundSecondary,
  },
  quickActionGhostText: { ...AITypography.buttonSmall, color: AIColors.textSecondary },
  quickActionSafe: {
    flex: 1,
    borderRadius: AIRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: AIColors.warning,
  },
  quickActionSafeText: { ...AITypography.buttonSmall, color: AIColors.background },
  modeSwitcher: {
    flexDirection: 'row',
    backgroundColor: AIColors.surface,
    borderWidth: 1,
    borderColor: AIColors.border,
    borderRadius: AIRadius.full,
    padding: 4,
    marginBottom: AISpacing.md,
  },
  modeBtn: {
    flex: 1,
    borderRadius: AIRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  modeBtnActive: {
    backgroundColor: AIColors.primary,
  },
  modeText: {
    ...AITypography.label,
    color: AIColors.textSecondary,
  },
  modeTextActive: {
    color: AIColors.background,
  },
  insightPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: AISpacing.sm,
  },
  pill: {
    backgroundColor: AIColors.backgroundSecondary,
    borderWidth: 1,
    borderColor: AIColors.border,
    borderRadius: AIRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillText: {
    ...AITypography.labelSmall,
    color: AIColors.textMuted,
  },
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
  riskText: { ...AITypography.labelSmall, letterSpacing: 0.4 },
  returnText: { ...AITypography.bodySmall, color: AIColors.success },
  cardTitle: { ...AITypography.h3, color: AIColors.text, marginBottom: 4 },
  cardDesc: { ...AITypography.bodySmall, color: AIColors.textSecondary, marginBottom: 8 },
  primaryNote: { ...AITypography.labelSmall, color: AIColors.primary, marginBottom: 8 },
  collapsedInfoBox: {
    backgroundColor: AIColors.backgroundSecondary,
    borderRadius: AIRadius.md,
    borderWidth: 1,
    borderColor: AIColors.border,
    padding: AISpacing.sm,
    marginBottom: AISpacing.sm,
  },
  collapsedLine: {
    ...AITypography.bodySmall,
    color: AIColors.textSecondary,
    marginBottom: 4,
  },
  expandBtn: {
    alignSelf: 'flex-end',
    marginBottom: AISpacing.sm,
  },
  expandBtnText: {
    ...AITypography.labelSmall,
    color: AIColors.textMuted,
  },
  allocBar: {
    height: 10,
    borderRadius: AIRadius.full,
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: AISpacing.sm,
    backgroundColor: AIColors.backgroundSecondary,
  },
  allocBarSeg: {
    height: 10,
  },
  allocWrap: {
    backgroundColor: AIColors.backgroundSecondary,
    borderRadius: AIRadius.md,
    borderWidth: 1,
    borderColor: AIColors.border,
    padding: AISpacing.sm,
    marginBottom: 8,
  },
  allocRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, gap: 12 },
  allocInfo: { flex: 1 },
  allocName: { ...AITypography.bodySmall, color: AIColors.textSecondary },
  allocExplain: { ...AITypography.labelSmall, color: AIColors.textMuted, marginTop: 2, textTransform: 'none' },
  allocPct: { ...AITypography.bodySmall, color: AIColors.text },
  beginnerExplainBox: {
    backgroundColor: AIColors.primary + '14',
    borderRadius: AIRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: AIColors.primary,
    padding: AISpacing.sm,
    marginTop: AISpacing.sm,
  },
  beginnerExplainText: {
    ...AITypography.bodySmall,
    color: AIColors.textSecondary,
  },
  liveNavBox: {
    backgroundColor: AIColors.backgroundSecondary,
    borderRadius: AIRadius.md,
    borderWidth: 1,
    borderColor: AIColors.border,
    padding: AISpacing.sm,
    marginTop: AISpacing.sm,
  },
  liveNavTitle: { ...AITypography.label, color: AIColors.textSecondary, marginBottom: 8 },
  liveNavRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  liveNavName: { ...AITypography.bodySmall, color: AIColors.text },
  liveNavMeta: { ...AITypography.labelSmall, color: AIColors.textMuted, marginTop: 2 },
  liveNavValue: { ...AITypography.bodySmall, color: AIColors.primary },
  metaRow: { marginBottom: AISpacing.sm },
  metaText: { ...AITypography.bodySmall, color: AIColors.textMuted },
  cta: {
    backgroundColor: AIColors.primary,
    borderRadius: AIRadius.lg,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ctaText: { ...AITypography.buttonSmall, color: AIColors.background },
  compareSection: {
    marginBottom: AISpacing.md,
  },
  compareTitle: {
    ...AITypography.label,
    color: AIColors.textSecondary,
    marginBottom: AISpacing.sm,
  },
  compareCard: {
    backgroundColor: AIColors.surface,
    borderWidth: 1,
    borderColor: AIColors.border,
    borderRadius: AIRadius.lg,
    padding: AISpacing.sm,
    marginBottom: AISpacing.sm,
  },
  compareTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  compareName: { ...AITypography.h3, color: AIColors.text },
  compareType: { ...AITypography.labelSmall, color: AIColors.textMuted },
  compareDesc: { ...AITypography.bodySmall, color: AIColors.textSecondary, marginTop: 4 },
  compareMeta: { ...AITypography.bodySmall, color: AIColors.textMuted, marginTop: 4 },
  glossaryToggle: {
    borderWidth: 1,
    borderColor: AIColors.border,
    borderRadius: AIRadius.md,
    backgroundColor: AIColors.surface,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: AISpacing.sm,
  },
  glossaryToggleText: { ...AITypography.bodySmall, color: AIColors.textSecondary },
  glossaryBox: {
    backgroundColor: AIColors.backgroundSecondary,
    borderWidth: 1,
    borderColor: AIColors.border,
    borderRadius: AIRadius.md,
    padding: AISpacing.sm,
    marginBottom: AISpacing.md,
  },
  glossaryLine: { ...AITypography.bodySmall, color: AIColors.textSecondary, marginBottom: 6 },
  notice: {
    backgroundColor: AIColors.warningDim,
    borderRadius: AIRadius.lg,
    borderLeftWidth: 3,
    borderLeftColor: AIColors.warning,
    padding: AISpacing.sm,
  },
  noticeText: { ...AITypography.bodySmall, color: AIColors.textSecondary },
});
