import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { AIColors, AIRadius, AISpacing, AITypography } from '../theme/aiTheme';

type Props = NativeStackScreenProps<RootStackParamList, 'GovSchemes'>;

const schemes = [
  { name: 'PM Jan Dhan Yojana', benefit: 'Zero-balance account and direct benefit transfer support.', link: 'https://www.india.gov.in/my-government/schemes' },
  { name: 'Atal Pension Yojana', benefit: 'Guaranteed pension for unorganized sector workers.', link: 'https://www.india.gov.in/my-government/schemes' },
  { name: 'PM Suraksha Bima Yojana', benefit: 'Affordable accidental insurance cover.', link: 'https://www.india.gov.in/my-government/schemes' },
  { name: 'Sukanya Samriddhi Yojana', benefit: 'High-interest savings for girl child future planning.', link: 'https://www.india.gov.in/my-government/schemes' },
];

export default function GovSchemesScreen({}: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Government Schemes</Text>
        <Text style={styles.subtitle}>Quick discoverability for high-impact Indian financial programs.</Text>

        {schemes.map((item) => (
          <View style={styles.schemeCard} key={item.name}>
            <View style={styles.badge}><Text style={styles.badgeText}>Gov</Text></View>
            <Text style={styles.schemeName}>{item.name}</Text>
            <Text style={styles.schemeBenefit}>{item.benefit}</Text>
            <Text style={styles.schemeLink}>{item.link}</Text>
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
  schemeCard: {
    backgroundColor: AIColors.surface,
    borderRadius: AIRadius.xl,
    borderWidth: 1,
    borderColor: AIColors.border,
    padding: AISpacing.md,
    marginBottom: AISpacing.sm,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: AIColors.secondaryDim,
    borderRadius: AIRadius.full,
    paddingHorizontal: AISpacing.sm,
    paddingVertical: 4,
    marginBottom: AISpacing.sm,
  },
  badgeText: { ...AITypography.labelSmall, color: AIColors.secondary },
  schemeName: { ...AITypography.h3, color: AIColors.text, marginBottom: AISpacing.xs },
  schemeBenefit: { ...AITypography.bodySmall, color: AIColors.textSecondary, marginBottom: AISpacing.sm },
  schemeLink: { ...AITypography.bodySmall, color: AIColors.primary },
});
