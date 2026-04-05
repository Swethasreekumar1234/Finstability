/**
 * Profile tab - financial profile overview and insights
 */

import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  EmploymentTypeLabels,
  FinancialGoalLabels,
  FinancialProfile,
  RootStackParamList,
  RiskToleranceLabels,
  UserTypeLabels,
} from '../types';
import { useAuthStore } from '../store/authStore';
import { AIColors, AIRadius, AISpacing, AIShadows, AITypography } from '../theme/aiTheme';
import { GridBackdrop, ScreenHeader } from '../components/ui';
import { apiService } from '../services/apiService';

type StackNav = NativeStackNavigationProp<RootStackParamList>;

function money(v: number): string {
  if (v >= 10000000) return '\u20B9' + (v / 10000000).toFixed(1) + 'Cr';
  if (v >= 100000) return '\u20B9' + (v / 100000).toFixed(1) + 'L';
  if (v >= 1000) return '\u20B9' + (v / 1000).toFixed(1) + 'K';
  return '\u20B9' + v.toLocaleString();
}

export default function FinancialProfileScreen() {
  const nav = useNavigation<StackNav>();
  const { currentUser: user, firebaseUid, logout } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [profile, setProfile] = useState<FinancialProfile | null>(null);
  const [profileCompleteness, setProfileCompleteness] = useState<number>(0);
  const [profileLayer, setProfileLayer] = useState<string>('Identity & life stage');
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [unlockedCapabilities, setUnlockedCapabilities] = useState<string[]>([]);
  const [nextPrompt, setNextPrompt] = useState<string | null>(null);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      nav.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const loadProfile = async () => {
        const data = user?.email
          ? await apiService.getProfileByEmail(user.email)
          : firebaseUid
            ? await apiService.getProfileByUserId(firebaseUid)
            : null;
        if (!active) return;

        if (data) {
          setProfile({
            monthlyIncome: Number(data.monthly_income ?? 0),
            monthlyExpenses: Number(data.monthly_expenses ?? 0),
            totalSavings: Number(data.total_savings ?? 0),
            existingLoans: Number(data.existing_loans ?? data.total_debts ?? 0),
            employmentType: (String(data.employment_type ?? 'FULL_TIME').toUpperCase() as FinancialProfile['employmentType']),
            riskTolerance: (String(data.risk_tolerance ?? 'MODERATE').toUpperCase() as FinancialProfile['riskTolerance']),
            investmentExperience: Number(data.investment_experience ?? 0),
            financialGoals: Array.isArray(data.financial_goals) ? (data.financial_goals as FinancialProfile['financialGoals']) : [],
            updatedAt: String(data.updated_at_client ?? data.updated_at ?? new Date().toISOString()),
          });
          setProfileCompleteness(Number(data.profile_completeness ?? 0));
          setProfileLayer(String(data.profile_layer ?? 'Identity & life stage'));
          setMissingFields(Array.isArray(data.missing_fields) ? data.missing_fields : []);
          setUnlockedCapabilities(Array.isArray(data.unlocked_capabilities) ? data.unlocked_capabilities : []);
          setNextPrompt(data.next_prompt ?? null);
        } else {
          setProfile(null);
          setProfileCompleteness(0);
          setProfileLayer('Identity & life stage');
          setMissingFields([]);
          setUnlockedCapabilities([]);
          setNextPrompt(null);
        }

        if (active) setLoading(false);
      };

      void loadProfile();
      return () => {
        active = false;
      };
    }, [firebaseUid, user?.email])
  );

  const monthlySurplus = useMemo(() => {
    if (!profile) return 0;
    return profile.monthlyIncome - profile.monthlyExpenses;
  }, [profile]);

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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Profile" subtitle="Your financial identity and preferences." />

        <View style={styles.completenessCard}>
          <View style={styles.completenessTopRow}>
            <View>
              <Text style={styles.completenessLabel}>Profile completeness</Text>
              <Text style={styles.completenessValue}>{profileCompleteness}%</Text>
            </View>
            <View style={styles.completenessRing}>
              <Text style={styles.completenessRingText}>{profileCompleteness}</Text>
            </View>
          </View>
          <View style={styles.completenessBarTrack}>
            <View style={[styles.completenessBarFill, { width: `${profileCompleteness}%` }]} />
          </View>
          <Text style={styles.completenessLayer}>{profileLayer}</Text>
          {nextPrompt ? <Text style={styles.nextPrompt}>{nextPrompt}</Text> : null}
          {missingFields.length > 0 && (
            <Text style={styles.missingFields}>Missing: {missingFields.slice(0, 4).join(', ')}{missingFields.length > 4 ? '...' : ''}</Text>
          )}
        </View>

        <View style={styles.heroCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.displayName?.charAt(0)?.toUpperCase() || 'U'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.displayName || user?.fullName || 'User'}</Text>
            <Text style={styles.phone}>{user?.phoneNumber || ''}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{user?.userType ? UserTypeLabels[user.userType] : 'Financial User'}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Personal</Text>
        <View style={styles.card}>
          <View style={styles.row}><Text style={styles.rowLabel}>Email</Text><Text style={styles.rowValue}>{user?.email || 'Not set'}</Text></View>
          <View style={styles.divider} />
          <View style={styles.row}><Text style={styles.rowLabel}>Risk Profile</Text><Text style={styles.rowValue}>{user?.riskTolerance ? RiskToleranceLabels[user.riskTolerance] : 'Not set'}</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Financial Snapshot</Text>
        <View style={styles.grid}>
          <View style={styles.statCard}><Text style={styles.statLabel}>Income</Text><Text style={styles.statValue}>{money(profile?.monthlyIncome ?? 0)}</Text></View>
          <View style={styles.statCard}><Text style={styles.statLabel}>Expenses</Text><Text style={styles.statValue}>{money(profile?.monthlyExpenses ?? 0)}</Text></View>
          <View style={styles.statCard}><Text style={styles.statLabel}>Savings</Text><Text style={styles.statValue}>{money(profile?.totalSavings ?? 0)}</Text></View>
          <View style={styles.statCard}><Text style={styles.statLabel}>Debt</Text><Text style={styles.statValue}>{money(profile?.existingLoans ?? 0)}</Text></View>
        </View>

        {profile && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Insights</Text>
            <Text style={styles.insight}>Monthly surplus: {money(monthlySurplus)}</Text>
            <Text style={styles.insight}>Employment: {EmploymentTypeLabels[profile.employmentType]}</Text>
            <Text style={styles.insight}>Investment experience: {profile.investmentExperience}/10</Text>
            <Text style={styles.insight}>Goals selected: {profile.financialGoals.length}</Text>
          </View>
        )}

        {profile && profile.financialGoals.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Goal Preferences</Text>
            <View style={styles.goalWrap}>
              {profile.financialGoals.map((g) => (
                <View key={g} style={styles.goalPill}><Text style={styles.goalText}>{FinancialGoalLabels[g]}</Text></View>
              ))}
            </View>
          </View>
        )}

        {unlockedCapabilities.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Unlocked Capabilities</Text>
            <View style={styles.goalWrap}>
              {unlockedCapabilities.map((item) => (
                <View key={item} style={styles.goalPill}><Text style={styles.goalText}>{item.replace(/_/g, ' ')}</Text></View>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.cta} onPress={() => nav.navigate('FinancialInput')}>
          <Text style={styles.ctaText}>Update Financial Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} disabled={isLoggingOut}>
          <Text style={styles.logoutText}>{isLoggingOut ? 'Logging out...' : 'Logout'}</Text>
        </TouchableOpacity>

        <View style={{ height: 96 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AIColors.background },
  content: { padding: AISpacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: AIColors.background },
  heroCard: {
    flexDirection: 'row',
    gap: AISpacing.md,
    alignItems: 'center',
    backgroundColor: AIColors.surface,
    borderWidth: 1,
    borderColor: AIColors.border,
    borderRadius: AIRadius.xl,
    padding: AISpacing.md,
    marginBottom: AISpacing.md,
    ...AIShadows.sm,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: AIColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...AITypography.displaySmall, color: AIColors.background },
  name: { ...AITypography.h2, color: AIColors.text, marginBottom: 2 },
  phone: { ...AITypography.bodySmall, color: AIColors.textSecondary, marginBottom: 8 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: AIColors.primaryDim,
    borderRadius: AIRadius.full,
    borderWidth: 1,
    borderColor: AIColors.borderGlow,
    paddingHorizontal: AISpacing.sm,
    paddingVertical: 4,
  },
  badgeText: { ...AITypography.labelSmall, color: AIColors.primary },
  sectionTitle: { ...AITypography.h3, color: AIColors.text, marginBottom: AISpacing.sm },
  card: {
    backgroundColor: AIColors.surface,
    borderWidth: 1,
    borderColor: AIColors.border,
    borderRadius: AIRadius.lg,
    padding: AISpacing.md,
    marginBottom: AISpacing.md,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { ...AITypography.bodySmall, color: AIColors.textSecondary },
  rowValue: { ...AITypography.bodySmall, color: AIColors.text, maxWidth: '65%', textAlign: 'right' },
  divider: { height: 1, backgroundColor: AIColors.border, marginVertical: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: AISpacing.sm, marginBottom: AISpacing.md },
  statCard: {
    width: '48%',
    backgroundColor: AIColors.surface,
    borderWidth: 1,
    borderColor: AIColors.border,
    borderRadius: AIRadius.lg,
    padding: AISpacing.sm,
  },
  statLabel: { ...AITypography.labelSmall, color: AIColors.textMuted, marginBottom: 4 },
  statValue: { ...AITypography.bodyLarge, color: AIColors.text },
  insight: { ...AITypography.bodySmall, color: AIColors.textSecondary, marginBottom: 6 },
  goalWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  goalPill: {
    backgroundColor: AIColors.backgroundSecondary,
    borderWidth: 1,
    borderColor: AIColors.border,
    borderRadius: AIRadius.full,
    paddingHorizontal: AISpacing.sm,
    paddingVertical: 5,
  },
  goalText: { ...AITypography.labelSmall, color: AIColors.textSecondary },
  cta: {
    backgroundColor: AIColors.primary,
    borderRadius: AIRadius.xl,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaText: { ...AITypography.button, color: AIColors.background },
  completenessCard: {
    backgroundColor: AIColors.surface,
    borderWidth: 1,
    borderColor: AIColors.borderGlow,
    borderRadius: AIRadius.xl,
    padding: AISpacing.md,
    marginBottom: AISpacing.md,
    ...AIShadows.sm,
  },
  completenessTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  completenessLabel: { ...AITypography.labelSmall, color: AIColors.textMuted, marginBottom: 2 },
  completenessValue: { ...AITypography.h1, color: AIColors.primary },
  completenessRing: { width: 52, height: 52, borderRadius: 26, borderWidth: 4, borderColor: AIColors.primary, alignItems: 'center', justifyContent: 'center' },
  completenessRingText: { ...AITypography.label, color: AIColors.primary },
  completenessBarTrack: { height: 8, borderRadius: 999, backgroundColor: AIColors.backgroundSecondary, marginTop: 12, overflow: 'hidden' },
  completenessBarFill: { height: 8, borderRadius: 999, backgroundColor: AIColors.primary },
  completenessLayer: { ...AITypography.labelSmall, color: AIColors.textSecondary, marginTop: 10 },
  nextPrompt: { ...AITypography.bodySmall, color: AIColors.textSecondary, marginTop: 6 },
  missingFields: { ...AITypography.bodySmall, color: AIColors.textMuted, marginTop: 6 },
  logoutBtn: {
    marginTop: AISpacing.sm,
    backgroundColor: AIColors.surface,
    borderWidth: 1,
    borderColor: AIColors.error,
    borderRadius: AIRadius.xl,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: {
    ...AITypography.button,
    color: AIColors.error,
  },
});
