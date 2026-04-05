import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GridBackdrop, PriorityActionsQueue, ScreenHeader } from '../components/ui';
import { calculateHealthScore } from './DashboardScreen';
import { AIColors, AIRadius, AISpacing, AITypography } from '../theme/aiTheme';
import { FinancialProfile, RootStackParamList, TabParamList, UserGoal } from '../types';

const PROFILE_KEY = 'financial_profile';
const GOALS_KEY = 'user_goals';

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Goals'>,
  NativeStackNavigationProp<RootStackParamList>
>;

function money(v: number): string {
  if (v >= 10000000) return '\u20B9' + (v / 10000000).toFixed(1) + 'Cr';
  if (v >= 100000) return '\u20B9' + (v / 100000).toFixed(1) + 'L';
  if (v >= 1000) return '\u20B9' + (v / 1000).toFixed(1) + 'K';
  return '\u20B9' + v.toFixed(0);
}

function healthStatus(score: number): { label: string; color: string } {
  if (score >= 75) return { label: 'Strong', color: AIColors.success };
  if (score >= 50) return { label: 'Stable', color: AIColors.primary };
  return { label: 'Needs Focus', color: AIColors.warning };
}

export default function PlanScreen({ navigation }: { navigation: NavigationProp }) {
  const [profile, setProfile] = useState<FinancialProfile | null>(null);
  const [goals, setGoals] = useState<UserGoal[]>([]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        const [rawProfile, rawGoals] = await Promise.all([
          AsyncStorage.getItem(PROFILE_KEY),
          AsyncStorage.getItem(GOALS_KEY),
        ]);
        if (!mounted) return;
        setProfile(rawProfile ? JSON.parse(rawProfile) : null);
        setGoals(rawGoals ? JSON.parse(rawGoals) : []);
      })();
      return () => {
        mounted = false;
      };
    }, [])
  );

  const score = useMemo(() => calculateHealthScore(profile), [profile]);
  const status = useMemo(() => healthStatus(score), [score]);
  const totalMonthlyGoalContribution = useMemo(
    () => goals.reduce((sum, g) => sum + (g.monthlyContribution || 0), 0),
    [goals]
  );
  const monthlySurplus = useMemo(() => {
    if (!profile) return 0;
    return Math.max(0, profile.monthlyIncome - profile.monthlyExpenses);
  }, [profile]);
  const suggestedInvestment = useMemo(() => {
    if (!profile) return 3000;
    return Math.max(1500, Math.round(monthlySurplus * 0.5));
  }, [profile, monthlySurplus]);

  const actions = useMemo(() => {
    if (!profile) {
      return ['Complete your profile', 'Add your first goal', 'Enable recommendations'];
    }
    const list: string[] = [];
    if (monthlySurplus <= 0) list.push('Reduce monthly expenses to create surplus');
    if (goals.length === 0) list.push('Set your first financial goal');
    if (score < 60) list.push('Improve debt and savings balance');
    if (list.length === 0) list.push('Increase SIP by 10% this year');
    return list.slice(0, 3);
  }, [profile, monthlySurplus, goals.length, score]);

  return (
    <SafeAreaView style={styles.safe}>
      <GridBackdrop />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Plan"
          subtitle="Health, goals, and investing in one clear workflow."
        />

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Health Snapshot</Text>
            <View style={[styles.statusPill, { backgroundColor: status.color + '22' }]}>
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>
          <Text style={styles.scoreText}>{score}<Text style={styles.scoreOutOf}>/100</Text></Text>
          <Text style={styles.cardSub}>Your overall financial baseline for this month.</Text>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('FinancialHealth')}
          >
            <Text style={styles.secondaryBtnText}>View Full Health Breakdown</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Goal Planning</Text>
          <Text style={styles.metricText}>{goals.length} active goals</Text>
          <Text style={styles.cardSub}>Monthly contribution: {money(totalMonthlyGoalContribution)}</Text>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('Goals')}>
            <Text style={styles.secondaryBtnText}>Manage Goals</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Investment Action</Text>
          <Text style={styles.metricText}>{money(suggestedInvestment)}/mo</Text>
          <Text style={styles.cardSub}>Suggested monthly SIP based on your current surplus.</Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('InvestmentRecommendations')}
          >
            <Text style={styles.primaryBtnText}>Open Investment Plans</Text>
          </TouchableOpacity>
        </View>

        <PriorityActionsQueue
          title="Next 3 Priorities"
          items={actions.map((a, i) => ({
            id: `priority-${i}`,
            title: a,
            ctaLabel: 'Update Inputs',
            onPress: () => navigation.navigate('FinancialInput'),
          }))}
        />

        <View style={{ height: 96 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AIColors.background },
  content: { padding: AISpacing.md },
  card: {
    backgroundColor: AIColors.surface,
    borderWidth: 1,
    borderColor: AIColors.border,
    borderRadius: AIRadius.xl,
    padding: AISpacing.md,
    marginBottom: AISpacing.md,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitle: {
    ...AITypography.h3,
    color: AIColors.text,
    marginBottom: 4,
  },
  cardSub: {
    ...AITypography.bodySmall,
    color: AIColors.textSecondary,
    marginBottom: AISpacing.sm,
  },
  metricText: {
    ...AITypography.h2,
    color: AIColors.text,
    marginBottom: 4,
  },
  scoreText: {
    ...AITypography.displayMedium,
    color: AIColors.primary,
    marginBottom: 4,
  },
  scoreOutOf: {
    ...AITypography.body,
    color: AIColors.textSecondary,
  },
  statusPill: {
    borderRadius: AIRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    ...AITypography.labelSmall,
  },
  primaryBtn: {
    backgroundColor: AIColors.primary,
    borderRadius: AIRadius.lg,
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: AISpacing.xs,
  },
  primaryBtnText: {
    ...AITypography.button,
    color: AIColors.background,
  },
  secondaryBtn: {
    backgroundColor: AIColors.backgroundSecondary,
    borderColor: AIColors.border,
    borderWidth: 1,
    borderRadius: AIRadius.lg,
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: AISpacing.xs,
  },
  secondaryBtnText: {
    ...AITypography.buttonSmall,
    color: AIColors.text,
  },
});