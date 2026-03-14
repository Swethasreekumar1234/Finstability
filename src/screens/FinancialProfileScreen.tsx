import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { AIColors, AIRadius, AISpacing, AITypography } from '../theme/aiTheme';

type Props = NativeStackScreenProps<RootStackParamList, 'FinancialProfile'>;

const profileRows = [
  { label: 'Monthly Income', value: 'Rs 80,000' },
  { label: 'Monthly Expenses', value: 'Rs 48,000' },
  { label: 'Total Savings', value: 'Rs 6,50,000' },
  { label: 'Existing Loans', value: 'Rs 3,20,000' },
  { label: 'Risk Profile', value: 'Balanced' },
  { label: 'Primary Goal', value: 'Emergency Fund + Home Down Payment' },
];

export default function FinancialProfileScreen({}: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Financial Profile</Text>
        <Text style={styles.subtitle}>Your personal money blueprint in one place.</Text>

        <View style={styles.profileCard}>
          {profileRows.map((row, idx) => (
            <View key={row.label}>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <Text style={styles.rowValue}>{row.value}</Text>
              </View>
              {idx < profileRows.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Snapshot Insights</Text>
        <View style={styles.insightCard}><Text style={styles.insightText}>Savings ratio is healthy, and can improve with automatic SIP top-ups.</Text></View>
        <View style={styles.insightCard}><Text style={styles.insightText}>Debt load is moderate; prioritize prepaying highest-interest loans first.</Text></View>
        <View style={styles.insightCard}><Text style={styles.insightText}>Your profile supports a hybrid strategy: emergency reserve + long-term equity.</Text></View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AIColors.background },
  content: { padding: AISpacing.lg, paddingBottom: AISpacing.xxl },
  title: { ...AITypography.h1, color: AIColors.text },
  subtitle: { ...AITypography.body, color: AIColors.textSecondary, marginTop: AISpacing.xs, marginBottom: AISpacing.lg },
  profileCard: {
    backgroundColor: AIColors.surface,
    borderRadius: AIRadius.xl,
    borderWidth: 1,
    borderColor: AIColors.border,
    padding: AISpacing.md,
    marginBottom: AISpacing.lg,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: AISpacing.sm, gap: AISpacing.md },
  rowLabel: { ...AITypography.body, color: AIColors.textSecondary, flex: 1 },
  rowValue: { ...AITypography.body, color: AIColors.text, flex: 1, textAlign: 'right' },
  divider: { height: 1, backgroundColor: AIColors.border },
  sectionTitle: { ...AITypography.h3, color: AIColors.text, marginBottom: AISpacing.sm },
  insightCard: {
    backgroundColor: AIColors.surface,
    borderRadius: AIRadius.lg,
    borderWidth: 1,
    borderColor: AIColors.border,
    padding: AISpacing.md,
    marginBottom: AISpacing.sm,
  },
  insightText: { ...AITypography.bodySmall, color: AIColors.textSecondary },
});
