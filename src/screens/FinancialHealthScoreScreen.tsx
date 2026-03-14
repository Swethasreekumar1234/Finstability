import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { AIColors, AIRadius, AISpacing, AITypography } from '../theme/aiTheme';

type Props = NativeStackScreenProps<RootStackParamList, 'FinancialHealthScore'>;

export default function FinancialHealthScoreScreen({}: Props) {
  const score = 74;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Financial Health Score</Text>
        <Text style={styles.subtitle}>A simple scorecard for your current financial momentum.</Text>

        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Current Score</Text>
          <Text style={styles.score}>{score}</Text>
          <Text style={styles.outOf}>out of 100</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${score}%` }]} />
          </View>
          <Text style={styles.scoreHint}>Strong stability. You can improve faster by reducing debt and auto-investing monthly.</Text>
        </View>

        <Text style={styles.sectionTitle}>Score Breakdown</Text>
        <View style={styles.metricCard}>
          <Text style={styles.metricTitle}>Savings Discipline</Text>
          <Text style={styles.metricValue}>18/25</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricTitle}>Debt Management</Text>
          <Text style={styles.metricValue}>14/25</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricTitle}>Emergency Preparedness</Text>
          <Text style={styles.metricValue}>20/25</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricTitle}>Investment Consistency</Text>
          <Text style={styles.metricValue}>22/25</Text>
        </View>

        <Text style={styles.sectionTitle}>Next Best Actions</Text>
        <View style={styles.tipCard}><Text style={styles.tipText}>Increase emergency fund to 6 months of expenses.</Text></View>
        <View style={styles.tipCard}><Text style={styles.tipText}>Keep loan EMI below 30% of monthly income.</Text></View>
        <View style={styles.tipCard}><Text style={styles.tipText}>Set SIP date to just after salary credit day.</Text></View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AIColors.background },
  content: { padding: AISpacing.lg, paddingBottom: AISpacing.xxl },
  title: { ...AITypography.h1, color: AIColors.text },
  subtitle: { ...AITypography.body, color: AIColors.textSecondary, marginTop: AISpacing.xs, marginBottom: AISpacing.lg },
  scoreCard: {
    backgroundColor: AIColors.surface,
    borderRadius: AIRadius.xl,
    borderWidth: 1,
    borderColor: AIColors.border,
    padding: AISpacing.lg,
    marginBottom: AISpacing.lg,
  },
  scoreLabel: { ...AITypography.label, color: AIColors.textSecondary },
  score: { ...AITypography.displayLarge, color: AIColors.primary, marginTop: AISpacing.sm },
  outOf: { ...AITypography.bodySmall, color: AIColors.textMuted, marginBottom: AISpacing.md },
  progressTrack: { height: 10, borderRadius: 999, backgroundColor: AIColors.surfaceLight, overflow: 'hidden', marginBottom: AISpacing.md },
  progressFill: { height: '100%', backgroundColor: AIColors.primary, borderRadius: 999 },
  scoreHint: { ...AITypography.bodySmall, color: AIColors.textSecondary },
  sectionTitle: { ...AITypography.h3, color: AIColors.text, marginBottom: AISpacing.sm, marginTop: AISpacing.sm },
  metricCard: {
    backgroundColor: AIColors.surface,
    borderRadius: AIRadius.lg,
    borderWidth: 1,
    borderColor: AIColors.border,
    padding: AISpacing.md,
    marginBottom: AISpacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricTitle: { ...AITypography.body, color: AIColors.text },
  metricValue: { ...AITypography.body, color: AIColors.primary },
  tipCard: {
    backgroundColor: AIColors.surface,
    borderRadius: AIRadius.lg,
    borderWidth: 1,
    borderColor: AIColors.border,
    padding: AISpacing.md,
    marginBottom: AISpacing.sm,
  },
  tipText: { ...AITypography.bodySmall, color: AIColors.textSecondary },
});
