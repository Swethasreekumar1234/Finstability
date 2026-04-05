/**
 * Health Tab - Financial health score dashboard
 */

import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FinancialGoalLabels, FinancialProfile } from '../types';
import { AIColors, AIRadius, AISpacing, AIShadows } from '../theme/aiTheme';
import { calculateHealthScore } from './DashboardScreen';

const FINANCIAL_PROFILE_KEY = 'financial_profile';

interface Metric {
  key: string;
  label: string;
  score: number;
  max: number;
  color: string;
  detail: string;
}

function scoreLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Excellent', color: AIColors.success };
  if (score >= 60) return { label: 'Good', color: AIColors.primary };
  if (score >= 40) return { label: 'Fair', color: AIColors.warning };
  return { label: 'Needs Attention', color: AIColors.error };
}

function money(n: number): string {
  if (n >= 10000000) return '\u20B9' + (n / 10000000).toFixed(1) + 'Cr';
  if (n >= 100000) return '\u20B9' + (n / 100000).toFixed(1) + 'L';
  if (n >= 1000) return '\u20B9' + (n / 1000).toFixed(1) + 'K';
  return '\u20B9' + n.toFixed(0);
}

function buildMetrics(p: FinancialProfile): Metric[] {
  const annualIncome = p.monthlyIncome * 12;
  const savingsRate = annualIncome > 0 ? (p.totalSavings / annualIncome) * 100 : 0;
  const debtRatio = p.monthlyIncome > 0 ? p.existingLoans / p.monthlyIncome : 0;
  const expenseRatio = p.monthlyIncome > 0 ? p.monthlyExpenses / p.monthlyIncome : 1;

  const savingsScore = savingsRate >= 20 ? 25 : savingsRate >= 10 ? 18 : Math.max(6, Math.round(savingsRate));
  const debtScore = debtRatio <= 0.3 ? 25 : debtRatio <= 0.6 ? 16 : Math.max(3, 20 - Math.round((debtRatio - 0.6) * 15));
  const planningScore = p.financialGoals.length >= 3 ? 25 : p.financialGoals.length >= 1 ? 16 : 8;
  const cashflowScore = expenseRatio <= 0.6 ? 25 : expenseRatio <= 0.8 ? 16 : Math.max(4, 18 - Math.round((expenseRatio - 0.8) * 20));

  return [
    {
      key: 'savings',
      label: 'Savings Strength',
      score: Math.min(25, savingsScore),
      max: 25,
      color: AIColors.primary,
      detail: savingsRate.toFixed(0) + '% annual savings rate',
    },
    {
      key: 'debt',
      label: 'Debt Health',
      score: Math.min(25, debtScore),
      max: 25,
      color: AIColors.secondary,
      detail: 'Debt-to-income: ' + (debtRatio * 100).toFixed(0) + '%',
    },
    {
      key: 'goals',
      label: 'Goal Planning',
      score: Math.min(25, planningScore),
      max: 25,
      color: AIColors.success,
      detail: p.financialGoals.length + ' active goal' + (p.financialGoals.length === 1 ? '' : 's'),
    },
    {
      key: 'cashflow',
      label: 'Cashflow Discipline',
      score: Math.min(25, cashflowScore),
      max: 25,
      color: AIColors.warning,
      detail: (expenseRatio * 100).toFixed(0) + '% income used for monthly expenses',
    },
  ];
}

function sparkline(seed: number): number[] {
  const base = Math.max(25, Math.min(95, seed));
  return [
    Math.max(10, base - 15),
    Math.max(10, base - 10),
    Math.max(10, base - 5),
    Math.max(10, base - 8),
    Math.max(10, base - 3),
    base,
  ];
}

export default function FinancialHealthScoreScreen() {
  const [profile, setProfile] = useState<FinancialProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      AsyncStorage.getItem(FINANCIAL_PROFILE_KEY)
        .then((raw) => {
          if (!mounted) return;
          setProfile(raw ? JSON.parse(raw) : null);
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });
      return () => {
        mounted = false;
      };
    }, [])
  );

  const score = useMemo(() => calculateHealthScore(profile), [profile]);
  const level = scoreLabel(score);
  const trend = useMemo(() => sparkline(score), [score]);
  const metrics = useMemo(() => (profile ? buildMetrics(profile) : []), [profile]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={AIColors.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No Financial Profile</Text>
        <Text style={styles.emptyText}>Go to Home and open Update Financial Profile to calculate your health score.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Financial Health</Text>
        <Text style={styles.pageSubtitle}>Score built from savings, debt, goals, and cashflow quality.</Text>

        <View style={styles.heroCard}>
          <View style={[styles.circleOuter, { borderColor: level.color + '44' }]}>
            <View style={[styles.circleInner, { borderColor: level.color }]}> 
              <Text style={[styles.scoreValue, { color: level.color }]}>{score}</Text>
              <Text style={styles.scoreUnit}>/100</Text>
            </View>
          </View>
          <View style={[styles.levelPill, { backgroundColor: level.color + '22' }]}>
            <Text style={[styles.levelText, { color: level.color }]}>{level.label}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>6-Month Trend</Text>
          <View style={styles.sparkWrap}>
            {trend.map((v, i) => (
              <View key={i} style={styles.sparkCol}>
                <View style={[styles.sparkBar, { height: Math.max(20, v), backgroundColor: i === trend.length - 1 ? AIColors.primary : AIColors.surfaceLight }]} />
              </View>
            ))}
          </View>
          <Text style={styles.trendNote}>Upward consistency compounds your long-term wealth.</Text>
        </View>

        <Text style={styles.sectionTitle}>Breakdown</Text>
        {metrics.map((m) => {
          const pct = Math.round((m.score / m.max) * 100);
          const fillWidth = `${pct}%` as `${number}%`;
          return (
            <View key={m.key} style={styles.metricCard}>
              <View style={styles.metricTop}>
                <Text style={styles.metricLabel}>{m.label}</Text>
                <Text style={[styles.metricScore, { color: m.color }]}>{m.score}/{m.max}</Text>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: fillWidth, backgroundColor: m.color }]} />
              </View>
              <Text style={styles.metricDetail}>{m.detail}</Text>
            </View>
          );
        })}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Snapshot</Text>
          <View style={styles.grid}>
            <View style={styles.gridCell}>
              <Text style={styles.gridLabel}>Income</Text>
              <Text style={styles.gridValue}>{money(profile.monthlyIncome)}/mo</Text>
            </View>
            <View style={styles.gridCell}>
              <Text style={styles.gridLabel}>Expenses</Text>
              <Text style={styles.gridValue}>{money(profile.monthlyExpenses)}/mo</Text>
            </View>
            <View style={styles.gridCell}>
              <Text style={styles.gridLabel}>Savings</Text>
              <Text style={styles.gridValue}>{money(profile.totalSavings)}</Text>
            </View>
            <View style={styles.gridCell}>
              <Text style={styles.gridLabel}>Debt</Text>
              <Text style={styles.gridValue}>{money(profile.existingLoans)}</Text>
            </View>
          </View>
        </View>

        {profile.financialGoals.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Goal Focus</Text>
            <View style={styles.goalWrap}>
              {profile.financialGoals.map((g) => (
                <View key={g} style={styles.goalPill}>
                  <Text style={styles.goalPillText}>{FinancialGoalLabels[g]}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 96 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AIColors.background },
  content: { padding: AISpacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: AIColors.background, padding: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: AIColors.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: AIColors.textSecondary, textAlign: 'center', lineHeight: 20 },
  pageTitle: { fontSize: 28, fontWeight: '900', color: AIColors.text, marginBottom: 2 },
  pageSubtitle: { fontSize: 13, color: AIColors.textSecondary, marginBottom: AISpacing.md },
  heroCard: {
    backgroundColor: AIColors.surface,
    borderRadius: AIRadius.xl,
    borderWidth: 1,
    borderColor: AIColors.border,
    padding: AISpacing.lg,
    alignItems: 'center',
    marginBottom: AISpacing.md,
    ...AIShadows.md,
  },
  circleOuter: {
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleInner: {
    width: 146,
    height: 146,
    borderRadius: 73,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AIColors.backgroundSecondary,
  },
  scoreValue: { fontSize: 52, fontWeight: '900', lineHeight: 56 },
  scoreUnit: { fontSize: 13, color: AIColors.textSecondary },
  levelPill: {
    marginTop: AISpacing.md,
    borderRadius: AIRadius.full,
    paddingHorizontal: AISpacing.md,
    paddingVertical: 6,
  },
  levelText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  card: {
    backgroundColor: AIColors.surface,
    borderRadius: AIRadius.lg,
    borderWidth: 1,
    borderColor: AIColors.border,
    padding: AISpacing.md,
    marginBottom: AISpacing.md,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: AIColors.text, marginBottom: AISpacing.sm },
  sparkWrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 120, marginBottom: AISpacing.sm },
  sparkCol: { flex: 1, alignItems: 'center' },
  sparkBar: { width: 22, borderRadius: 8 },
  trendNote: { fontSize: 12, color: AIColors.textSecondary },
  metricCard: {
    backgroundColor: AIColors.surface,
    borderRadius: AIRadius.lg,
    borderWidth: 1,
    borderColor: AIColors.border,
    padding: AISpacing.md,
    marginBottom: AISpacing.sm,
  },
  metricTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  metricLabel: { fontSize: 14, fontWeight: '700', color: AIColors.text },
  metricScore: { fontSize: 13, fontWeight: '800' },
  barTrack: { height: 8, borderRadius: 999, backgroundColor: AIColors.backgroundSecondary, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 999 },
  metricDetail: { fontSize: 12, color: AIColors.textSecondary, marginTop: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: AISpacing.sm },
  gridCell: {
    width: '48%',
    backgroundColor: AIColors.backgroundSecondary,
    borderRadius: AIRadius.md,
    padding: AISpacing.sm,
    borderWidth: 1,
    borderColor: AIColors.border,
  },
  gridLabel: { fontSize: 11, color: AIColors.textMuted, marginBottom: 2 },
  gridValue: { fontSize: 14, fontWeight: '700', color: AIColors.text },
  goalWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: AISpacing.sm },
  goalPill: {
    backgroundColor: AIColors.primaryDim,
    borderRadius: AIRadius.full,
    borderWidth: 1,
    borderColor: AIColors.borderGlow,
    paddingHorizontal: AISpacing.md,
    paddingVertical: 6,
  },
  goalPillText: { fontSize: 11, color: AIColors.primary, fontWeight: '600' },
});
