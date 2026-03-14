import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { AIColors, AIRadius, AISpacing, AITypography } from '../theme/aiTheme';

type Props = NativeStackScreenProps<RootStackParamList, 'Tips'>;

const tips = [
  'Automate 20% of salary into savings and investment buckets on day 1.',
  'Keep 3-6 months of expenses in a high-liquidity emergency account.',
  'Review subscriptions every month and trim low-value expenses.',
  'Use a 50-30-20 budgeting baseline and tune it by your goals.',
  'Pay credit card dues in full to avoid high-interest compounding.',
  'Increase SIP by 10% annually to stay ahead of inflation.',
];

export default function TipsScreen({}: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Financial Tips</Text>
        <Text style={styles.subtitle}>Small daily money habits that create long-term stability.</Text>

        {tips.map((tip, index) => (
          <View key={tip} style={styles.tipCard}>
            <View style={styles.tipIndex}><Text style={styles.tipIndexText}>{index + 1}</Text></View>
            <Text style={styles.tipText}>{tip}</Text>
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
  tipCard: {
    backgroundColor: AIColors.surface,
    borderRadius: AIRadius.xl,
    borderWidth: 1,
    borderColor: AIColors.border,
    padding: AISpacing.md,
    marginBottom: AISpacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AISpacing.md,
  },
  tipIndex: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: AIColors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  tipIndexText: { ...AITypography.label, color: AIColors.primary },
  tipText: { ...AITypography.body, color: AIColors.textSecondary, flex: 1 },
});
