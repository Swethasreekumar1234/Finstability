import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList, FinancialProfile, FinancialGoalLabels, FinancialGoalIcons } from '../types';
import { useAuthStore } from '../store/authStore';
import { AIColors, AISpacing, AIRadius } from '../theme/aiTheme';
import { ProgressBar } from '../components/ai';
import { getFinancialRecommendations } from '../services/recommendationEngine';

const FINANCIAL_PROFILE_KEY = 'financial_profile';
type StackNav = NativeStackNavigationProp<RootStackParamList>;

function formatCurrency(n: number): string {
  if (n >= 10000000) return '\u20B9' + (n / 10000000).toFixed(1) + 'Cr';
  if (n >= 100000) return '\u20B9' + (n / 100000).toFixed(1) + 'L';
  if (n >= 1000) return '\u20B9' + (n / 1000).toFixed(1) + 'K';
  return '\u20B9' + n.toLocaleString();
}

export function calculateHealthScore(profile: FinancialProfile | null): number {
  if (!profile) return 0;
  let score = 50;
  const savingsRate = profile.monthlyIncome > 0
    ? (profile.totalSavings / (profile.monthlyIncome * 12)) * 100 : 0;
  if (savingsRate >= 20) score += 15;
  else if (savingsRate >= 10) score += 10;
  else score += savingsRate / 2;
  const dti = profile.monthlyIncome > 0 ? profile.existingLoans / profile.monthlyIncome : 0;
  if (dti <= 0.3) score += 15;
  else if (dti <= 0.5) score += 10;
  else score -= (dti - 0.5) * 20;
  if (profile.financialGoals.length >= 3) score += 10;
  else if (profile.financialGoals.length >= 1) score += 5;
  score += profile.investmentExperience * 2;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export default function DashboardScreen() {
  const stackNav = useNavigation<StackNav>();
  const { currentUser: user, logout } = useAuthStore();
  const [profile, setProfile] = useState<FinancialProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tipText, setTipText] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useFocusEffect(useCallback(() => {
    loadProfile();
  }, [user]));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await AsyncStorage.getItem(FINANCIAL_PROFILE_KEY);
      if (data) {
        const p: FinancialProfile = JSON.parse(data);
        setProfile(p);
        if (user) {
          const recs = getFinancialRecommendations(
            user.userType, p.monthlyIncome || user.monthlyIncome || 0,
            p.riskTolerance || user.riskTolerance, p.financialGoals || [], p
          );
          if (recs.tips.length > 0) setTipText(recs.tips[0]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () =>
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => {
          await logout();
          stackNav.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={AIColors.primary} />
      </View>
    );
  }

  const score = calculateHealthScore(profile);
  const scoreColor = score >= 70 ? AIColors.success : score >= 40 ? AIColors.warning : AIColors.error;
  const scoreLabel = score >= 70 ? 'Excellent' : score >= 40 ? 'Good' : 'Needs Work';

  const STAT_CARDS = [
    { label: 'Monthly Income',   value: formatCurrency(profile?.monthlyIncome || user?.monthlyIncome || 0), color: AIColors.primary },
    { label: 'Total Savings',    value: formatCurrency(profile?.totalSavings || 0),    color: AIColors.secondary },
    { label: 'Monthly Expenses', value: formatCurrency(profile?.monthlyExpenses || 0), color: AIColors.warning },
    { label: 'Existing Loans',   value: formatCurrency(profile?.existingLoans || 0),   color: AIColors.error },
  ];

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {user?.displayName?.charAt(0)?.toUpperCase() || '?'}
                  </Text>
                  <View style={styles.onlineDot} />
                </View>
                <View>
                  <Text style={styles.welcomeText}>Welcome back</Text>
                  <Text style={styles.userName}>{user?.displayName || 'User'}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
                <Text style={styles.signOutIcon}>{'\u23FB'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tipBanner}>
              <View style={styles.tipBannerIcon}>
                <Text style={{ color: AIColors.background, fontSize: 14 }}>{'\u25C6'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tipBannerLabel}>{tipText ? 'AI INSIGHT' : 'GET STARTED'}</Text>
                <Text style={styles.tipBannerText} numberOfLines={2}>
                  {tipText || 'Complete your financial profile for personalized insights'}
                </Text>
              </View>
            </View>

            <View style={styles.healthCard}>
              <View style={styles.healthCardHeader}>
                <Text style={styles.healthCardTitle}>Financial Health Score</Text>
                <View style={[styles.scoreBadge, { backgroundColor: scoreColor + '22' }]}>
                  <Text style={[styles.scoreBadgeText, { color: scoreColor }]}>{scoreLabel}</Text>
                </View>
              </View>
              <View style={styles.scoreRow}>
                <Text style={[styles.scoreNumber, { color: scoreColor }]}>{score}</Text>
                <Text style={styles.scoreMax}>/100</Text>
              </View>
              <ProgressBar progress={score / 100} color={scoreColor} height={6} />
              <Text style={styles.scoreCaption}>Based on income, savings, debt, and goals</Text>
            </View>

            <View style={styles.statsGrid}>
              {STAT_CARDS.map((s) => (
                <View key={s.label} style={styles.statCard}>
                  <Text style={styles.statLabel}>{s.label.toUpperCase()}</Text>
                  <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                </View>
              ))}
            </View>

            {profile?.financialGoals && profile.financialGoals.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Financial Goals</Text>
                <View style={styles.goalsRow}>
                  {profile.financialGoals.map((g) => (
                    <View key={g} style={styles.goalPill}>
                      <Text style={styles.goalPillText}>
                        {FinancialGoalIcons[g]} {FinancialGoalLabels[g]}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.ctaBtn} onPress={() => stackNav.navigate('FinancialInput')}>
              <View style={{ flex: 1 }}>
                <Text style={styles.ctaBtnTitle}>Update Financial Profile</Text>
                <Text style={styles.ctaBtnSub}>Keep your data current for better insights</Text>
              </View>
              <Text style={styles.ctaBtnArrow}>{'\u2192'}</Text>
            </TouchableOpacity>

            <View style={{ height: 24 }} />
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      {/* Floating AI Chat Button */}
      <TouchableOpacity
        style={styles.fabAI}
        onPress={() => stackNav.navigate('AIChat')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabAIIcon}>✦</Text>
        <Text style={styles.fabAILabel}>Ask Fin</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AIColors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: AIColors.background },
  scroll: { paddingHorizontal: AISpacing.lg, paddingTop: AISpacing.md, paddingBottom: 96 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: AISpacing.lg,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: AIColors.primary, justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: AIColors.background },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: 5,
    backgroundColor: AIColors.success, borderWidth: 2, borderColor: AIColors.background,
  },
  welcomeText: { fontSize: 12, color: AIColors.textSecondary },
  userName: { fontSize: 17, fontWeight: '700', color: AIColors.text },
  signOutBtn: {
    width: 38, height: 38, borderRadius: AIRadius.md,
    backgroundColor: AIColors.surface,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: AIColors.border,
  },
  signOutIcon: { fontSize: 18, color: AIColors.textMuted },

  tipBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: AIColors.primary + '15',
    borderRadius: AIRadius.lg, padding: AISpacing.md,
    borderWidth: 1, borderColor: AIColors.primary + '30',
    marginBottom: AISpacing.md, gap: 10,
  },
  tipBannerIcon: {
    width: 32, height: 32, borderRadius: AIRadius.md,
    backgroundColor: AIColors.primary, justifyContent: 'center', alignItems: 'center',
  },
  tipBannerLabel: { fontSize: 11, color: AIColors.primary, fontWeight: '700', marginBottom: 2, letterSpacing: 0.5 },
  tipBannerText: { fontSize: 13, color: AIColors.text, lineHeight: 18 },

  healthCard: {
    backgroundColor: AIColors.surface, borderRadius: AIRadius.xl,
    padding: AISpacing.lg, borderWidth: 1, borderColor: AIColors.border, marginBottom: AISpacing.md,
  },
  healthCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  healthCardTitle: { fontSize: 16, fontWeight: '700', color: AIColors.text },
  scoreBadge: { borderRadius: AIRadius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  scoreBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
  scoreNumber: { fontSize: 52, fontWeight: '800', lineHeight: 60 },
  scoreMax: { fontSize: 16, color: AIColors.textSecondary, marginLeft: 4 },
  scoreCaption: { fontSize: 12, color: AIColors.textSecondary, marginTop: 6 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: AISpacing.md },
  statCard: {
    flex: 1, minWidth: '46%',
    backgroundColor: AIColors.surface, borderRadius: AIRadius.lg,
    padding: AISpacing.md, borderWidth: 1, borderColor: AIColors.border,
  },
  statLabel: { fontSize: 10, color: AIColors.textSecondary, letterSpacing: 0.5, marginBottom: 6 },
  statValue: { fontSize: 20, fontWeight: '700' },

  section: { marginBottom: AISpacing.md },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: AIColors.text, marginBottom: 10 },
  goalsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  goalPill: {
    backgroundColor: AIColors.surface, borderRadius: AIRadius.full,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: AIColors.border,
  },
  goalPillText: { fontSize: 12, color: AIColors.text },

  ctaBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: AIColors.primary, borderRadius: AIRadius.xl,
    padding: AISpacing.md, gap: 10,
  },
  ctaBtnTitle: { fontSize: 15, fontWeight: '700', color: AIColors.background },
  ctaBtnSub: { fontSize: 12, color: AIColors.background + 'CC', marginTop: 2 },
  ctaBtnArrow: { fontSize: 20, color: AIColors.background, fontWeight: '700' },

  fabAI: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: AIColors.primary,
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: AIColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  fabAIIcon: { fontSize: 16, color: AIColors.background },
  fabAILabel: { fontSize: 14, fontWeight: '700', color: AIColors.background },
});
