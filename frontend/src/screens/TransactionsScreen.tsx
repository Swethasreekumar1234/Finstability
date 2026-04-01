import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RootStackParamList, TabParamList } from '../types';
import { AIColors, AIRadius, AISpacing, AITypography } from '../theme/aiTheme';
import { GridBackdrop, ScreenHeader } from '../components/ui';
import { apiService, TransactionItem } from '../services/apiService';
import { useAuthStore } from '../store/authStore';

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Transactions'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const CATEGORIES = ['all', 'food', 'transport', 'shopping', 'entertainment', 'other'];

function rupees(value: number): string {
  return `\u20B9${Math.round(value).toLocaleString('en-IN')}`;
}

function currentMonth(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${m}`;
}

export default function TransactionsScreen({ navigation }: { navigation: NavigationProp }) {
  const firebaseUid = useAuthStore((s) => s.firebaseUid);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [month, setMonth] = useState(currentMonth());
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = firebaseUid || 'demo-user';

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.listTransactions(userId, month, category);
      setTransactions(data);
    } catch {
      setError('Unable to fetch transactions right now.');
    } finally {
      setLoading(false);
    }
  }, [category, month, userId]);

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [loadTransactions])
  );

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of transactions) {
      if (tx.type === 'income') income += tx.amount;
      else expense += tx.amount;
    }
    return { income, expense };
  }, [transactions]);

  return (
    <SafeAreaView style={styles.safe}>
      <GridBackdrop />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <ScreenHeader
          title="Transactions"
          subtitle="Track income, expenses, and statement imports."
          onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        />

        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Income</Text>
            <Text style={[styles.kpiValue, { color: AIColors.success }]}>{rupees(totals.income)}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Expenses</Text>
            <Text style={[styles.kpiValue, { color: AIColors.warning }]}>{rupees(totals.expense)}</Text>
          </View>
        </View>

        <View style={styles.filterCard}>
          <Text style={styles.label}>Month (YYYY-MM)</Text>
          <TextInput
            style={styles.input}
            value={month}
            onChangeText={setMonth}
            placeholder="2026-04"
            placeholderTextColor={AIColors.textMuted}
          />

          <Text style={styles.label}>Category</Text>
          <View style={styles.chipsRow}>
            {CATEGORIES.map((item) => {
              const active = category === item;
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setCategory(item)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.refreshButton} onPress={loadTransactions}>
            <Text style={styles.refreshText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('AddTransaction')}>
            <Text style={styles.primaryBtnText}>Add Transaction</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('UploadStatement')}>
            <Text style={styles.secondaryBtnText}>Upload Statement</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('SpendingInsights')}>
            <Text style={styles.secondaryBtnText}>Insights</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={AIColors.primary} />
          </View>
        ) : error ? (
          <View style={styles.centerBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : transactions.length === 0 ? (
          <View style={styles.centerBox}>
            <Text style={styles.emptyText}>No transactions found for these filters.</Text>
          </View>
        ) : (
          transactions.map((tx, index) => (
            <View key={`${tx.date}-${tx.merchant}-${index}`} style={styles.txCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.merchant}>{tx.merchant}</Text>
                <Text style={[styles.amount, tx.type === 'income' ? styles.income : styles.expense]}>
                  {tx.type === 'income' ? '+' : '-'}{rupees(tx.amount)}
                </Text>
              </View>
              <View style={styles.rowBetween}>
                <Text style={styles.meta}>{tx.date} • {tx.category}</Text>
                <Text style={styles.meta}>{tx.source}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AIColors.background },
  container: { flex: 1 },
  content: { padding: AISpacing.md, paddingBottom: 120 },
  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: AISpacing.md },
  kpiCard: {
    flex: 1,
    backgroundColor: AIColors.surface,
    borderWidth: 1,
    borderColor: AIColors.border,
    borderRadius: AIRadius.lg,
    padding: AISpacing.md,
  },
  kpiLabel: { ...AITypography.bodySmall, color: AIColors.textSecondary },
  kpiValue: { ...AITypography.h2, marginTop: 4 },
  filterCard: {
    backgroundColor: AIColors.surface,
    borderWidth: 1,
    borderColor: AIColors.border,
    borderRadius: AIRadius.xl,
    padding: AISpacing.md,
    marginBottom: AISpacing.md,
  },
  label: { ...AITypography.label, color: AIColors.text, marginBottom: 8, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: AIColors.border,
    borderRadius: AIRadius.md,
    backgroundColor: AIColors.backgroundSecondary,
    color: AIColors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: {
    borderWidth: 1,
    borderColor: AIColors.border,
    borderRadius: AIRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: AIColors.backgroundSecondary,
  },
  chipActive: {
    borderColor: AIColors.primary,
    backgroundColor: `${AIColors.primary}20`,
  },
  chipText: { ...AITypography.labelSmall, color: AIColors.textSecondary, textTransform: 'capitalize' },
  chipTextActive: { color: AIColors.primary },
  refreshButton: {
    marginTop: 12,
    backgroundColor: AIColors.primary,
    borderRadius: AIRadius.md,
    alignItems: 'center',
    paddingVertical: 10,
  },
  refreshText: { ...AITypography.button, color: AIColors.background },
  actionsRow: { marginBottom: AISpacing.md, gap: 10 },
  primaryBtn: {
    backgroundColor: AIColors.primary,
    borderRadius: AIRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnText: { ...AITypography.button, color: AIColors.background },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: AIColors.border,
    backgroundColor: AIColors.surface,
    borderRadius: AIRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: { ...AITypography.buttonSmall, color: AIColors.text },
  centerBox: {
    borderWidth: 1,
    borderColor: AIColors.border,
    backgroundColor: AIColors.surface,
    borderRadius: AIRadius.lg,
    padding: AISpacing.lg,
    alignItems: 'center',
  },
  errorText: { ...AITypography.body, color: AIColors.error },
  emptyText: { ...AITypography.body, color: AIColors.textSecondary },
  txCard: {
    backgroundColor: AIColors.surface,
    borderWidth: 1,
    borderColor: AIColors.border,
    borderRadius: AIRadius.lg,
    padding: AISpacing.md,
    marginBottom: 10,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  merchant: { ...AITypography.body, color: AIColors.text, flex: 1, marginRight: 8 },
  amount: { ...AITypography.h3 },
  income: { color: AIColors.success },
  expense: { color: AIColors.warning },
  meta: { ...AITypography.bodySmall, color: AIColors.textSecondary, textTransform: 'capitalize' },
});
