import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { AIColors, AIRadius, AISpacing, AITypography } from '../theme/aiTheme';
import { GridBackdrop, ScreenHeader } from '../components/ui';
import { apiService, MonthlySummary } from '../services/apiService';
import { useAuthStore } from '../store/authStore';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'SpendingInsights'>;
};

function currentMonth(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${m}`;
}

function rupees(v: number): string {
  return `\u20B9${Math.round(v).toLocaleString('en-IN')}`;
}

export default function SpendingInsightsScreen({ navigation }: Props) {
  const firebaseUid = useAuthStore((s) => s.firebaseUid);
  const userId = firebaseUid || 'demo-user';
  const [month, setMonth] = useState(currentMonth());
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [health, setHealth] = useState<{ total_savings: number; expense_ratio: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [budgetCategory, setBudgetCategory] = useState('food');
  const [budgetAmount, setBudgetAmount] = useState('5000');

  const load = async () => {
    setLoading(true);
    try {
      const [sum, metrics] = await Promise.all([
        apiService.getMonthlySummary(userId, month),
        apiService.getHealthMetrics(userId, month),
      ]);
      setSummary(sum);
      setHealth(metrics);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const maxCategory = useMemo(() => {
    const values = Object.values(summary?.category_breakdown || {});
    return values.length ? Math.max(...values) : 1;
  }, [summary]);

  const saveBudget = async () => {
    const amount = parseFloat(budgetAmount);
    if (!amount || amount <= 0) return;
    await apiService.setBudget(userId, budgetCategory, amount);
    await load();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <GridBackdrop />
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          title="Spending Insights"
          subtitle="Category split, monthly trends, and overspending alerts."
          onBack={() => navigation.goBack()}
        />

        <View style={styles.filterCard}>
          <Text style={styles.label}>Month (YYYY-MM)</Text>
          <TextInput
            style={styles.input}
            value={month}
            onChangeText={setMonth}
            placeholder="2026-04"
            placeholderTextColor={AIColors.textMuted}
          />
          <TouchableOpacity style={styles.primaryBtn} onPress={load}>
            <Text style={styles.primaryBtnText}>Refresh Insights</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerBox}><ActivityIndicator color={AIColors.primary} /></View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Income vs Expense</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${Math.min(100, (summary?.total_income || 0) > 0 ? ((summary?.total_expenses || 0) / (summary?.total_income || 1)) * 100 : 0)}%` }]} />
              </View>
              <Text style={styles.metricText}>Income: {rupees(summary?.total_income || 0)}</Text>
              <Text style={styles.metricText}>Expenses: {rupees(summary?.total_expenses || 0)}</Text>
              <Text style={styles.metricText}>Savings: {rupees(summary?.savings || 0)}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Category Breakdown (Pie-style)</Text>
              {Object.entries(summary?.category_breakdown || {}).length === 0 ? (
                <Text style={styles.emptyText}>No expenses available for this month.</Text>
              ) : (
                Object.entries(summary?.category_breakdown || {}).map(([cat, value]) => (
                  <View key={cat} style={styles.categoryRow}>
                    <Text style={styles.categoryLabel}>{cat}</Text>
                    <View style={styles.categoryBarTrack}>
                      <View style={[styles.categoryBarFill, { width: `${(value / maxCategory) * 100}%` }]} />
                    </View>
                    <Text style={styles.categoryValue}>{rupees(value)}</Text>
                  </View>
                ))
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Overspending Alerts</Text>
              {(summary?.alerts || []).length === 0 ? (
                <Text style={styles.emptyText}>No overspending alerts. Great discipline.</Text>
              ) : (
                summary?.alerts.map((alert, idx) => (
                  <View key={`${alert}-${idx}`} style={styles.alertPill}>
                    <Text style={styles.alertText}>{alert}</Text>
                  </View>
                ))
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Set Category Budget</Text>
              <Text style={styles.label}>Category</Text>
              <TextInput
                style={styles.input}
                value={budgetCategory}
                onChangeText={setBudgetCategory}
                placeholder="food"
                placeholderTextColor={AIColors.textMuted}
              />
              <Text style={styles.label}>Monthly limit</Text>
              <TextInput
                style={styles.input}
                value={budgetAmount}
                onChangeText={setBudgetAmount}
                keyboardType="numeric"
                placeholder="5000"
                placeholderTextColor={AIColors.textMuted}
              />
              <TouchableOpacity style={styles.primaryBtn} onPress={saveBudget}>
                <Text style={styles.primaryBtnText}>Save Budget</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Financial Health Integration</Text>
              <Text style={styles.metricText}>Total Savings: {rupees(health?.total_savings || 0)}</Text>
              <Text style={styles.metricText}>Expense Ratio: {((health?.expense_ratio || 0) * 100).toFixed(1)}%</Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AIColors.background },
  content: { padding: AISpacing.md, paddingBottom: 100 },
  filterCard: {
    backgroundColor: AIColors.surface,
    borderWidth: 1,
    borderColor: AIColors.border,
    borderRadius: AIRadius.lg,
    padding: AISpacing.md,
    marginBottom: AISpacing.md,
  },
  card: {
    backgroundColor: AIColors.surface,
    borderWidth: 1,
    borderColor: AIColors.border,
    borderRadius: AIRadius.lg,
    padding: AISpacing.md,
    marginBottom: AISpacing.md,
  },
  cardTitle: { ...AITypography.h3, color: AIColors.text, marginBottom: 10 },
  label: { ...AITypography.labelSmall, color: AIColors.textSecondary, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: AIColors.border,
    backgroundColor: AIColors.backgroundSecondary,
    borderRadius: AIRadius.md,
    color: AIColors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  primaryBtn: {
    backgroundColor: AIColors.primary,
    borderRadius: AIRadius.md,
    alignItems: 'center',
    paddingVertical: 11,
  },
  primaryBtnText: { ...AITypography.button, color: AIColors.background },
  centerBox: {
    backgroundColor: AIColors.surface,
    borderRadius: AIRadius.lg,
    borderWidth: 1,
    borderColor: AIColors.border,
    padding: AISpacing.lg,
    alignItems: 'center',
  },
  metricText: { ...AITypography.body, color: AIColors.text, marginBottom: 4 },
  barTrack: {
    height: 14,
    borderRadius: AIRadius.full,
    backgroundColor: AIColors.backgroundSecondary,
    overflow: 'hidden',
    marginBottom: 10,
  },
  barFill: {
    height: '100%',
    backgroundColor: AIColors.warning,
  },
  categoryRow: { marginBottom: 10 },
  categoryLabel: { ...AITypography.labelSmall, color: AIColors.textSecondary, textTransform: 'capitalize' },
  categoryBarTrack: {
    marginTop: 4,
    height: 10,
    borderRadius: AIRadius.full,
    backgroundColor: AIColors.backgroundSecondary,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    backgroundColor: AIColors.primary,
  },
  categoryValue: { ...AITypography.bodySmall, color: AIColors.textSecondary, marginTop: 2 },
  alertPill: {
    backgroundColor: `${AIColors.warning}20`,
    borderWidth: 1,
    borderColor: `${AIColors.warning}55`,
    borderRadius: AIRadius.md,
    padding: 10,
    marginBottom: 8,
  },
  alertText: { ...AITypography.bodySmall, color: AIColors.warning },
  emptyText: { ...AITypography.bodySmall, color: AIColors.textMuted },
});
