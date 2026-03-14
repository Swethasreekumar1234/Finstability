import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { AIColors, AIRadius, AISpacing, AITypography } from '../theme/aiTheme';

type Props = NativeStackScreenProps<RootStackParamList, 'InvestmentRecommendations'>;

const ideas = [
  { name: 'Index Funds', risk: 'Moderate', plan: 'Long-term core portfolio with low cost and broad diversification.' },
  { name: 'PPF + EPF Blend', risk: 'Low', plan: 'Stable debt-oriented backbone with tax efficiency.' },
  { name: 'Flexi-cap Mutual Funds', risk: 'Moderate to High', plan: 'Managed exposure across market caps for growth.' },
  { name: 'Gold ETF Allocation', risk: 'Low to Moderate', plan: 'Hedge 5-10% to reduce portfolio volatility.' },
];

export default function InvestmentRecommendationsScreen({}: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Investment Recommendations</Text>
        <Text style={styles.subtitle}>Curated ideas to balance growth, safety, and liquidity.</Text>

        {ideas.map((idea) => (
          <View key={idea.name} style={styles.ideaCard}>
            <View style={styles.ideaTop}>
              <Text style={styles.ideaName}>{idea.name}</Text>
              <View style={styles.riskBadge}><Text style={styles.riskBadgeText}>{idea.risk}</Text></View>
            </View>
            <Text style={styles.ideaPlan}>{idea.plan}</Text>
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
  ideaCard: {
    backgroundColor: AIColors.surface,
    borderRadius: AIRadius.xl,
    borderWidth: 1,
    borderColor: AIColors.border,
    padding: AISpacing.md,
    marginBottom: AISpacing.sm,
  },
  ideaTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: AISpacing.xs, gap: AISpacing.sm },
  ideaName: { ...AITypography.h3, color: AIColors.text, flex: 1 },
  riskBadge: {
    backgroundColor: AIColors.successDim,
    borderRadius: AIRadius.full,
    paddingHorizontal: AISpacing.sm,
    paddingVertical: 4,
  },
  riskBadgeText: { ...AITypography.labelSmall, color: AIColors.success },
  ideaPlan: { ...AITypography.bodySmall, color: AIColors.textSecondary },
});
