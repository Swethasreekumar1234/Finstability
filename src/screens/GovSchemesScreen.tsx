/**
 * Schemes Tab - Government schemes matched to user profile
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FinancialProfile } from '../types';
import { useAuthStore } from '../store/authStore';
import { AIColors, AISpacing, AIRadius } from '../theme/aiTheme';
import { getFinancialRecommendations, GovernmentScheme } from '../services/recommendationEngine';

const FINANCIAL_PROFILE_KEY = 'financial_profile';

const CATEGORY_COLORS: Record<string, string> = {
  finance_subsidy: AIColors.primary,
  agriculture: '#4ADE80',
  housing: AIColors.secondary,
  insurance: AIColors.warning,
  women: '#F472B6',
  education: '#A78BFA',
};

function categoryColor(cat: string): string {
  return (CATEGORY_COLORS as any)[cat] ?? AIColors.textMuted;
}

export default function GovSchemesScreen() {
  const { currentUser: user } = useAuthStore();
  const [schemes, setSchemes] = useState<GovernmentScheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    (async () => {
      try {
        const data = await AsyncStorage.getItem(FINANCIAL_PROFILE_KEY);
        const profile: FinancialProfile | undefined = data ? JSON.parse(data) : undefined;
        if (user) {
          const recs = getFinancialRecommendations(
            user.userType,
            profile?.monthlyIncome ?? user.monthlyIncome ?? 0,
            profile?.riskTolerance ?? user.riskTolerance,
            profile?.financialGoals ?? [],
            profile
          );
          setSchemes(recs.schemes);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={AIColors.primary} />
      </View>
    );
  }

  if (!schemes.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No Schemes Found</Text>
        <Text style={styles.emptyText}>Complete your profile to see matching schemes.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <Text style={styles.pageTitle}>Government Schemes</Text>
          <Text style={styles.pageSubtitle}>{schemes.length} schemes matched to your profile</Text>
          {schemes.map((scheme, i) => {
            const color = categoryColor(scheme.category);
            const isOpen = expanded === scheme.scheme_name;
            return (
              <TouchableOpacity
                key={scheme.scheme_name}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => setExpanded(isOpen ? null : scheme.scheme_name)}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.catBadge, { backgroundColor: color + '20' }]}>
                    <Text style={[styles.catText, { color }]}>
                      {scheme.category.replace(/_/g, ' ').toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.indexText}>{i + 1}/{schemes.length}</Text>
                </View>
                <Text style={styles.schemeName}>{scheme.scheme_name}</Text>
                <Text style={styles.schemeMinistry}>{scheme.ministry}</Text>
                <Text style={styles.schemeDesc} numberOfLines={isOpen ? undefined : 2}>
                  {scheme.description}
                </Text>
                {isOpen && (
                  <View style={styles.expandedContent}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Eligibility</Text>
                      <Text style={styles.detailText}>{scheme.eligibility}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Benefits</Text>
                      <Text style={styles.detailText}>{scheme.benefits}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>How to Apply</Text>
                      <Text style={styles.detailText}>{scheme.application_process}</Text>
                    </View>
                    {Boolean(scheme.application_link) && (
                      <TouchableOpacity
                        style={[styles.applyBtn, { backgroundColor: color }]}
                        onPress={() => Linking.openURL(scheme.application_link)}
                      >
                        <Text style={styles.applyBtnText}>Apply Now</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                <Text style={styles.expandHint}>{isOpen ? 'Show less' : 'View details'}</Text>
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AIColors.background },
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: AIColors.background, padding: 24,
  },
  scroll: { paddingHorizontal: AISpacing.lg, paddingTop: AISpacing.lg, paddingBottom: 96 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: AIColors.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: AIColors.textSecondary, textAlign: 'center', lineHeight: 20 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: AIColors.text, marginBottom: 4 },
  pageSubtitle: { fontSize: 14, color: AIColors.textSecondary, marginBottom: 16 },
  card: {
    backgroundColor: AIColors.surface, borderRadius: AIRadius.xl,
    padding: AISpacing.md, borderWidth: 1, borderColor: AIColors.border, marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  catBadge: { borderRadius: AIRadius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  catText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  indexText: { fontSize: 11, color: AIColors.textMuted },
  schemeName: { fontSize: 15, fontWeight: '700', color: AIColors.text, marginBottom: 3 },
  schemeMinistry: { fontSize: 12, color: AIColors.primary, marginBottom: 6 },
  schemeDesc: { fontSize: 13, color: AIColors.textSecondary, lineHeight: 19 },
  expandedContent: {
    marginTop: 12, borderTopWidth: 1, borderTopColor: AIColors.border, paddingTop: 12,
  },
  detailRow: { marginBottom: 10 },
  detailLabel: {
    fontSize: 11, fontWeight: '700', color: AIColors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3,
  },
  detailText: { fontSize: 13, color: AIColors.text, lineHeight: 18 },
  applyBtn: {
    borderRadius: AIRadius.lg, paddingVertical: 10,
    alignItems: 'center', marginTop: 8,
  },
  applyBtnText: { fontSize: 14, fontWeight: '700', color: AIColors.background },
  expandHint: { fontSize: 11, color: AIColors.primary, marginTop: 8, textAlign: 'right' },
});
