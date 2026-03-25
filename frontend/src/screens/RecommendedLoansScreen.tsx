import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AIColors, AIRadius, AISpacing, AITypography } from '../theme/aiTheme';

const loans = [
  { name: 'Education Loan', range: '8.5% - 11.5%', why: 'Useful for higher studies with longer tenures.' },
  { name: 'Home Loan', range: '8.4% - 10.2%', why: 'Lowest secured rate for long-term asset creation.' },
  { name: 'MSME Business Loan', range: '10% - 16%', why: 'Supports working capital and expansion goals.' },
  { name: 'Personal Loan', range: '11% - 22%', why: 'Best only for urgent short-term requirements.' },
];

export default function RecommendedLoansScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Recommended Loans</Text>
        <Text style={styles.subtitle}>Compare borrowing options by use-case and typical rate bands.</Text>

        {loans.map((loan) => (
          <View key={loan.name} style={styles.loanCard}>
            <View style={styles.loanHeader}>
              <Text style={styles.loanName}>{loan.name}</Text>
              <Text style={styles.loanRate}>{loan.range}</Text>
            </View>
            <Text style={styles.loanWhy}>{loan.why}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AIColors.background },
  content: { padding: AISpacing.lg, paddingBottom: AISpacing.xxl },
  title: { ...AITypography.h1, color: AIColors.text },
  subtitle: { ...AITypography.body, color: AIColors.textSecondary, marginTop: AISpacing.xs, marginBottom: AISpacing.lg },
  loanCard: {
    backgroundColor: AIColors.surface,
    borderRadius: AIRadius.xl,
    borderWidth: 1,
    borderColor: AIColors.border,
    padding: AISpacing.md,
    marginBottom: AISpacing.sm,
  },
  loanHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: AISpacing.xs },
  loanName: { ...AITypography.h3, color: AIColors.text, flex: 1 },
  loanRate: { ...AITypography.label, color: AIColors.warning },
  loanWhy: { ...AITypography.bodySmall, color: AIColors.textSecondary },
});
