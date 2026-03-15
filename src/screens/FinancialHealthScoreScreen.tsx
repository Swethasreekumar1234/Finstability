/**
 * Health Tab - Financial health score breakdown
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FinancialProfile, FinancialGoalLabels } from '../types';
import { AIColors, AISpacing, AIRadius } from '../theme/aiTheme';
import { ProgressBar } from '../components/ai';

const FINANCIAL_PROFILE_KEY = 'financial_profile';

interface Breakdown {
  label: string;
  score: number;
  max: number;
  desc: string;
  color: string;
  tip: string;
}

function buildBreakdown(p: FinancialProfile): Breakdown[] {
  const savingsRate = p.monthlyIncome > 0
    ? (p.totalSavings / (p.monthlyIncome * 12)) * 100 : 0;
  let savingsScore = 0;
  if (savingsRate >= 20) savingsScore = 15;
  else if (savingsRate >= 10) savingsScore = 10;
  else savingsScore = Math.round(savingsRate / 2);

  const dti = p.monthlyIncome > 0 ? p.existingLoans / p.monthlyIncome : 0;
  let debtScore = 0;
  if (dti <= 0.3) debtScore = 15;
  else if (dti <= 0.5) debtScore = 10;
  else debtScore = Math.max(0, 10 - Math.round((dti - 0.5) * 20));

  const goalsScore = p.financialGoals.length >= 3 ? 10 : p.financialGoals.length >= 1 ? 5 : 0;
  const expScore = p.investmentExperience * 2;

  return [
    {
      label: 'Savings Rate',
      score: savingsScore,
      max: 15,
      desc: savingsRate.toFixed(0) + '% annual savings rate',
      color: AIColors.primary,
      tip: savingsRate < 20
        ? 'Try to save at least 20% of annual income. Automate savings to build the habit.'
        : 'Great savings rate! Keep it consistent and grow it further.',
    },
    {
      label: 'Debt Health',
      score: debtScore,
      max: 15,
      desc: 'Debt-to-income ratio: ' + (dti * 100).toFixed(0) + '%',
      color: AIColors.secondary,
      tip: dti > 0.3
        ? 'Your debt ratio is elevated. Focus on paying off high-interest loans first.'
        : 'Healthy debt levels. Maintain this balance.',
    },
    {
      label: 'Goal Setting',
      score: goalsScore,
      max: 10,
      desc: p.financialGoals.length + ' active goal' + (p.financialGoals.length !== 1 ? 's' : ''),
      color: AIColors.success,
      tip: p.financialGoals.length < 3
        ? 'Define at least 3 financial goals to improve planning clarity.'
        : 'Well-defined goals! Review them quarterly.',
    },
    {
      label: 'Investment Experience',
      score: expScore,
      max: 20,
      desc: 'Experience level: ' + p.investmentExperience + '/10',
      color: AIColors.warning,
      tip: p.investmentExperience < 5
        ? 'Start with low-risk instruments like PPF or FDs to build confidence.'
        : 'Strong investment experience. Diversify across asset classes.',
    },
  ];
}

function getScoreInfo(s: number): { label: string; color: string } {
  if (s >= 80) return { label: 'Excellent', color: AIColors.success };
  if (s >= 60) return { label: 'Good', color: AIColors.primary };
  if (s >= 40) return { label: 'Fair', color: AIColors.warning };
  return { label: 'Needs Work', color: AIColors.error };
}

export default function FinancialHealthScoreScreen() {
  const [profile, setProfile] = useState<FinancialProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem(FINANCIAL_PROFILE_KEY)
      .then((d) => { if (d) setProfile(JSON.parse(d)); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []));

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
        <Text style={styles.emptyTitle}>No Profile Data</Text>
        <Text style={styles.emptyText}>Go to Home and tap "Update Financial Profile" to get started.</Text>
      </View>
    );
  }

  const breakdown = buildBreakdown(profile);
  let score = 50;
  breakdown.forEach((b) => { score += b.score; });
  score = Math.max(0, Math.min(100, score));
  const { label: scoreLabel, color: scoreColor } = getScoreInfo(score);

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <Text style={styles.pageTitle}>Financial Health</Text>
          <Text style={styles.pageSubtitle}>Your personalized score breakdown</Text>

          <View style={styles.scoreCard}>
            <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
              <Text style={[styles.scoreBig, { color: scoreColor }]}>{score}</Text>
              <Text style={styles.scoreOf}>/100</Text>
            </View>
            <View style={[styles.scoreLabelBadge, { backgroundColor: scoreColor + '20' }]}>
              <Text style={[styles.scoreLabelText, { color: scoreColor }]}>{scoreLabel}</Text>
            </View>
            <Text style={styles.scoreDesc}>
              Based on your savings rate, debt levels, goals, and investment experience.
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Score Breakdown</Text>
          {breakdown.map((b) => (
            <View key={b.label} style={styles.breakCard}>
              <View style={styles.breakHeader}>
                <Text style={styles.breakLabel}>{b.label}</Text>
                <Text style={[styles.breakScore, { color: b.color }]}>{b.score}/{b.max}</Text>
              </View>
              <ProgressBar progress={b.score / b.max} color={b.color} height={6} />
              <Text style={styles.breakDesc}>{b.desc}</Text>
            </View>
          ))}

          <Text style={styles.sectionTitle}>Improvement Tips</Text>
          {breakdown.map((b) => (
            <View key={b.label} style={styles.tipCard}>
              <View style={[styles.tipDot, { backgroundColor: b.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.tipLabel}>{b.label}</Text>
                <Text style={styles.tipText}>{b.tip}</Text>
              </View>
            </View>
          ))}

          {profile.financialGoals.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Your Goals</Text>
              <View style={styles.goalsRow}>
                {profile.financialGoals.map((g) => (
                  <View key={g} style={styles.goalPill}>
                    <Text style={styles.goalPillText}>{FinancialGoalLabels[g]}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AIColors.background },
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: AIColors.background, padding: 24,
  },
  scroll: { paddingHorizontal: AISpacing.lg, paddingTop: AISpacing.lg, paddingBottom: 96 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: AIColors.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: AIColors.textSecondary, textAlign: 'center', lineHeight: 20 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: AIColors.text, marginBottom: 4 },
  pageSubtitle: { fontSize: 14, color: AIColors.textSecondary, marginBottom: 20 },
  scoreCard: {
    backgroundColor: AIColors.surface, borderRadius: AIRadius.xl,
    padding: AISpacing.xl, borderWidth: 1, borderColor: AIColors.border,
    alignItems: 'center', marginBottom: AISpacing.xl,
  },
  scoreCircle: {
    width: 120, height: 120, borderRadius: 60, borderWidth: 4,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  scoreBig: { fontSize: 44, fontWeight: '800', lineHeight: 50 },
  scoreOf: { fontSize: 14, color: AIColors.textSecondary },
  scoreLabelBadge: {
    borderRadius: AIRadius.full, paddingHorizontal: 12,
    paddingVertical: 4, marginBottom: 10,
  },
  scoreLabelText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  scoreDesc: { fontSize: 13, color: AIColors.textSecondary, textAlign: 'center', lineHeight: 18 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: AIColors.text, marginBottom: 10, marginTop: 4 },
  breakCard: {
    backgroundColor: AIColors.surface, borderRadius: AIRadius.lg,
    padding: AISpacing.md, borderWidth: 1, borderColor: AIColors.border, marginBottom: 10,
  },
  breakHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  breakLabel: { fontSize: 14, fontWeight: '600', color: AIColors.text },
  breakScore: { fontSize: 14, fontWeight: '700' },
  breakDesc: { fontSize: 12, color: AIColors.textSecondary, marginTop: 6 },
  tipCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: AIColors.surface, borderRadius: AIRadius.lg,
    padding: AISpacing.md, borderWidth: 1, borderColor: AIColors.border, marginBottom: 10,
  },
  tipDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  tipLabel: { fontSize: 13, fontWeight: '600', color: AIColors.text, marginBottom: 3 },
  tipText: { fontSize: 13, color: AIColors.textSecondary, lineHeight: 18 },
  goalsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: AISpacing.md },
  goalPill: {
    backgroundColor: AIColors.primary + '15', borderRadius: AIRadius.full,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: AIColors.primary + '30',
  },
  goalPillText: { fontSize: 12, color: AIColors.primary, fontWeight: '500' },
});
