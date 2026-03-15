/**
 * Profile Tab - User financial profile overview
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FinancialProfile, RootStackParamList,
  UserTypeLabels, RiskToleranceLabels, EmploymentTypeLabels,
  FinancialGoalLabels, FinancialGoalIcons,
} from '../types';
import { useAuthStore } from '../store/authStore';
import { AIColors, AISpacing, AIRadius } from '../theme/aiTheme';

const FINANCIAL_PROFILE_KEY = 'financial_profile';
type StackNav = NativeStackNavigationProp<RootStackParamList>;

function fmt(n: number): string {
  if (n >= 100000) return '\u20B9' + (n / 100000).toFixed(1) + 'L';
  if (n >= 1000) return '\u20B9' + (n / 1000).toFixed(1) + 'K';
  return '\u20B9' + n.toLocaleString();
}

export default function FinancialProfileScreen() {
  const nav = useNavigation<StackNav>();
  const { currentUser: user } = useAuthStore();
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

  const PERSONAL_ROWS = [
    { label: 'Name',          value: user?.displayName || user?.fullName || 'Not set' },
    { label: 'Phone',         value: user?.phoneNumber || 'Not set' },
    { label: 'Email',         value: user?.email || 'Not set' },
    { label: 'Profile Type',  value: user?.userType ? UserTypeLabels[user.userType] : 'Not set' },
    { label: 'Risk Appetite', value: user?.riskTolerance ? RiskToleranceLabels[user.riskTolerance] : 'Not set' },
  ];

  const FINANCE_ROWS = profile ? [
    { label: 'Monthly Income',    value: fmt(profile.monthlyIncome),   color: AIColors.primary },
    { label: 'Monthly Expenses',  value: fmt(profile.monthlyExpenses),  color: AIColors.warning },
    { label: 'Total Savings',     value: fmt(profile.totalSavings),     color: AIColors.success },
    { label: 'Existing Loans',    value: fmt(profile.existingLoans),    color: AIColors.error },
    { label: 'Employment',        value: EmploymentTypeLabels[profile.employmentType], color: AIColors.secondary },
    { label: 'Invest. Experience',value: profile.investmentExperience + '/10', color: AIColors.warning },
  ] : [];

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.profileHeader}>
            <View style={styles.bigAvatar}>
              <Text style={styles.bigAvatarText}>
                {user?.displayName?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
            <Text style={styles.displayName}>{user?.displayName || 'User'}</Text>
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>
                {user?.userType ? UserTypeLabels[user.userType] : 'Unknown type'}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Personal Info</Text>
          <View style={styles.infoCard}>
            {PERSONAL_ROWS.map((row, i) => (
              <View key={row.label}>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  <Text style={styles.rowValue} numberOfLines={1}>{row.value}</Text>
                </View>
                {i < PERSONAL_ROWS.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>

          {profile ? (
            <>
              <Text style={styles.sectionTitle}>Financial Snapshot</Text>
              <View style={styles.finGrid}>
                {FINANCE_ROWS.map((r) => (
                  <View key={r.label} style={styles.finCard}>
                    <Text style={styles.finLabel}>{r.label.toUpperCase()}</Text>
                    <Text style={[styles.finValue, { color: r.color }]}>{r.value}</Text>
                  </View>
                ))}
              </View>

              {profile.financialGoals.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Financial Goals</Text>
                  <View style={styles.goalsGrid}>
                    {profile.financialGoals.map((g) => (
                      <View key={g} style={styles.goalCard}>
                        <Text style={styles.goalIcon}>{FinancialGoalIcons[g]}</Text>
                        <Text style={styles.goalLabel}>{FinancialGoalLabels[g]}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              <Text style={styles.updatedAt}>
                Last updated: {new Date(profile.updatedAt).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </Text>
            </>
          ) : (
            <View style={styles.noProfile}>
              <Text style={styles.noProfileText}>No financial profile yet.</Text>
            </View>
          )}

          <TouchableOpacity style={styles.editBtn} onPress={() => nav.navigate('FinancialInput')}>
            <Text style={styles.editBtnText}>Edit Financial Profile</Text>
          </TouchableOpacity>

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

  profileHeader: { alignItems: 'center', marginBottom: 24 },
  bigAvatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: AIColors.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
    borderWidth: 3, borderColor: AIColors.primary + '50',
  },
  bigAvatarText: { fontSize: 32, fontWeight: '800', color: AIColors.background },
  displayName: { fontSize: 22, fontWeight: '800', color: AIColors.text, marginBottom: 8 },
  typeBadge: {
    backgroundColor: AIColors.primary + '18',
    borderRadius: AIRadius.full, paddingHorizontal: 12, paddingVertical: 4,
    borderWidth: 1, borderColor: AIColors.primary + '30',
  },
  typeText: { fontSize: 12, color: AIColors.primary, fontWeight: '600' },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: AIColors.text, marginBottom: 10 },

  infoCard: {
    backgroundColor: AIColors.surface, borderRadius: AIRadius.xl,
    borderWidth: 1, borderColor: AIColors.border, overflow: 'hidden', marginBottom: 20,
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: AISpacing.md, paddingVertical: 12,
  },
  rowLabel: { fontSize: 14, color: AIColors.textSecondary },
  rowValue: { fontSize: 14, fontWeight: '600', color: AIColors.text, maxWidth: '55%', textAlign: 'right' },
  divider: { height: 1, backgroundColor: AIColors.border, marginHorizontal: AISpacing.md },

  finGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  finCard: {
    flex: 1, minWidth: '46%',
    backgroundColor: AIColors.surface, borderRadius: AIRadius.lg,
    padding: AISpacing.md, borderWidth: 1, borderColor: AIColors.border,
  },
  finLabel: { fontSize: 10, color: AIColors.textSecondary, letterSpacing: 0.5, marginBottom: 6 },
  finValue: { fontSize: 18, fontWeight: '700' },

  goalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  goalCard: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: AIColors.surface, borderRadius: AIRadius.lg,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: AIColors.border,
  },
  goalIcon: { fontSize: 16, color: AIColors.primary },
  goalLabel: { fontSize: 12, color: AIColors.text, fontWeight: '500' },

  updatedAt: { fontSize: 11, color: AIColors.textMuted, textAlign: 'center', marginBottom: 16 },

  noProfile: { alignItems: 'center', padding: 24 },
  noProfileText: { fontSize: 14, color: AIColors.textSecondary },

  editBtn: {
    backgroundColor: AIColors.surface, borderRadius: AIRadius.xl,
    padding: AISpacing.md, alignItems: 'center',
    borderWidth: 1, borderColor: AIColors.primary + '40',
  },
  editBtnText: { fontSize: 14, fontWeight: '700', color: AIColors.primary },
});
