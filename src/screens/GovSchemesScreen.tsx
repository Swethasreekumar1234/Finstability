import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FinancialProfile } from '../types';
import { useAuthStore } from '../store/authStore';
import { AIColors, AISpacing, AIRadius } from '../theme/aiTheme';
import { getFinancialRecommendations, GovernmentScheme } from '../services/recommendationEngine';
import { getAISchemeRecommendations, checkBackendHealth, BackendScheme } from '../services/backendService';

const FINANCIAL_PROFILE_KEY = 'financial_profile';

const USER_TYPE_TO_OCCUPATION: Record<string, string> = {
  STUDENT: 'student',
  WORKING_PROFESSIONAL: 'salaried',
  RETIREE: 'retired',
  SMALL_BUSINESS_OWNER: 'self-employed',
};

function toGovernmentScheme(s: BackendScheme): GovernmentScheme {
  return {
    scheme_name: s.scheme_name,
    ministry: 'Government of India',
    description: s.benefits,
    eligibility: s.why_eligible,
    benefits: s.benefits,
    application_process: 'Visit the official website to apply.',
    application_link: s.application_link,
    category: 'finance_subsidy',
  };
}

export default function GovSchemesScreen() {
  const { currentUser: user } = useAuthStore();
  const [schemes, setSchemes] = useState<GovernmentScheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [usingAI, setUsingAI] = useState(false);

  useFocusEffect(useCallback(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await AsyncStorage.getItem(FINANCIAL_PROFILE_KEY);
        const profile: FinancialProfile | undefined = data ? JSON.parse(data) : undefined;

        if (user) {
          const backendHealthy = await checkBackendHealth();

          if (backendHealthy) {
            const aiSchemes = await getAISchemeRecommendations({
              age: 25,
              gender: 'other',
              income: (profile?.monthlyIncome ?? user.monthlyIncome ?? 0) * 12,
              occupation: USER_TYPE_TO_OCCUPATION[user.userType] ?? 'salaried',
              state: 'India',
            });

            if (aiSchemes.length > 0) {
              setSchemes(aiSchemes.map(toGovernmentScheme));
              setUsingAI(true);
              return;
            }
          }

          const recs = getFinancialRecommendations(
            user.userType,
            profile?.monthlyIncome ?? user.monthlyIncome ?? 0,
            profile?.riskTolerance ?? user.riskTolerance,
            profile?.financialGoals ?? [],
            profile
          );
          setSchemes(recs.schemes);
          setUsingAI(false);
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
        <Text style={styles.loadingText}>Finding schemes for you...</Text>
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
          <View style={styles.badgeRow}>
            <Text style={styles.pageSubtitle}>{schemes.length} schemes matched to your profile</Text>
            {usingAI && (
              <View style={styles.aiBadge}>
                <Text style={styles.aiBadgeText}>✦ AI Powered</Text>
              </View>
            )}
          </View>

          {schemes.map((scheme, i) => {
            const isOpen = expanded === scheme.scheme_name;
            return (
              <TouchableOpacity
                key={scheme.scheme_name}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => setExpanded(isOpen ? null : scheme.scheme_name)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.catBadge}>
                    <Text style={styles.catText}>GOV SCHEME</Text>
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
                      <Text style={styles.detailLabel}>Why You Qualify</Text>
                      <Text style={styles.detailText}>{scheme.eligibility}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Benefits</Text>
                      <Text style={styles.detailText}>{scheme.benefits}</Text>
                    </View>
                    {!usingAI && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>How to Apply</Text>
                        <Text style={styles.detailText}>{scheme.application_process}</Text>
                      </View>
                    )}
                    {Boolean(scheme.application_link) && (
                      <TouchableOpacity
                        style={styles.applyBtn}
                        onPress={() => Linking.openURL(scheme.application_link)}
                      >
                        <Text style={styles.applyBtnText}>Apply Now →</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                <Text style={styles.expandHint}>{isOpen ? 'Show less ↑' : 'View details ↓'}</Text>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: AIColors.background, padding: 24 },
  loadingText: { fontSize: 14, color: AIColors.textSecondary, marginTop: 12 },
  scroll: { paddingHorizontal: AISpacing.lg, paddingTop: AISpacing.lg, paddingBottom: 96 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: AIColors.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: AIColors.textSecondary, textAlign: 'center', lineHeight: 20 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: AIColors.text, marginBottom: 4 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  pageSubtitle: { fontSize: 14, color: AIColors.textSecondary },
  aiBadge: { backgroundColor: AIColors.primary + '20', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: AIColors.primary + '40' },
  aiBadgeText: { fontSize: 11, fontWeight: '700', color: AIColors.primary },
  card: { backgroundColor: AIColors.surface, borderRadius: AIRadius.xl, padding: AISpacing.md, borderWidth: 1, borderColor: AIColors.border, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  catBadge: { backgroundColor: AIColors.primary + '20', borderRadius: AIRadius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  catText: { fontSize: 10, fontWeight: '700', color: AIColors.primary, letterSpacing: 0.5 },
  indexText: { fontSize: 11, color: AIColors.textMuted },
  schemeName: { fontSize: 15, fontWeight: '700', color: AIColors.text, marginBottom: 3 },
  schemeMinistry: { fontSize: 12, color: AIColors.primary, marginBottom: 6 },
  schemeDesc: { fontSize: 13, color: AIColors.textSecondary, lineHeight: 19 },
  expandedContent: { marginTop: 12, borderTopWidth: 1, borderTopColor: AIColors.border, paddingTop: 12 },
  detailRow: { marginBottom: 10 },
  detailLabel: { fontSize: 11, fontWeight: '700', color: AIColors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  detailText: { fontSize: 13, color: AIColors.text, lineHeight: 18 },
  applyBtn: { backgroundColor: AIColors.primary, borderRadius: AIRadius.lg, paddingVertical: 10, alignItems: 'center', marginTop: 8 },
  applyBtnText: { fontSize: 14, fontWeight: '700', color: AIColors.background },
  expandHint: { fontSize: 11, color: AIColors.primary, marginTop: 8, textAlign: 'right' },
});
