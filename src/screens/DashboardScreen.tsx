/**
 * Dashboard Screen - Futuristic AI Financial Platform
 * Apple/Stripe inspired dark theme with glassmorphism
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  RootStackParamList,
  UserTypeLabels,
  RiskToleranceLabels,
  FinancialProfile,
  FinancialGoalLabels,
  FinancialGoalIcons,
} from '../types';
import { useAuthStore } from '../store/authStore';
import {
  AIColors,
  AISpacing,
  AIRadius,
  AIShadows,
  AITypography,
} from '../theme/aiTheme';
import { GlassCard, ProgressBar } from '../components/ai';
import {
  getFinancialRecommendations,
  FinancialRecommendations,
} from '../services/recommendationEngine';

const { width } = Dimensions.get('window');
const FINANCIAL_PROFILE_KEY = 'financial_profile';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;
};

export default function DashboardScreen({ navigation }: Props) {
  const { currentUser: user, isProfileSaving: isLoading, logout } = useAuthStore();
  const [financialProfile, setFinancialProfile] = useState<FinancialProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [recommendations, setRecommendations] = useState<FinancialRecommendations | null>(null);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(0.3)).current;
  const cardAnims = useRef([...Array(4)].map(() => new Animated.Value(0))).current;

  // Reload profile when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadFinancialProfile();
    }, [user])
  );

  useEffect(() => {
    startAnimations();
  }, []);

  const startAnimations = () => {
    // Main content fade in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Staggered card animations
    cardAnims.forEach((anim, index) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      }).start();
    });
  };

  const loadFinancialProfile = async () => {
    try {
      setLoadingProfile(true);
      const data = await AsyncStorage.getItem(FINANCIAL_PROFILE_KEY);
      if (data) {
        const profile = JSON.parse(data);
        setFinancialProfile(profile);
        
        // Generate personalized recommendations
        if (user) {
          const recs = getFinancialRecommendations(
            user.userType,
            profile.monthlyIncome || user.monthlyIncome || 0,
            profile.riskTolerance || user.riskTolerance,
            profile.financialGoals || [],
            profile
          );
          setRecommendations(recs);
        }
      } else if (user) {
        // Generate recommendations based on user profile only
        const recs = getFinancialRecommendations(
          user.userType,
          user.monthlyIncome || 0,
          user.riskTolerance,
          [],
          undefined
        );
        setRecommendations(recs);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
        },
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount.toLocaleString()}`;
  };

  const calculateHealthScore = (): number => {
    if (!financialProfile) return 0;
    let score = 50;
    
    const savingsRate = financialProfile.monthlyIncome > 0 
      ? (financialProfile.totalSavings / (financialProfile.monthlyIncome * 12)) * 100 
      : 0;
    if (savingsRate >= 20) score += 15;
    else if (savingsRate >= 10) score += 10;
    else score += savingsRate / 2;
    
    const debtToIncome = financialProfile.monthlyIncome > 0
      ? financialProfile.existingLoans / financialProfile.monthlyIncome
      : 0;
    if (debtToIncome <= 0.3) score += 15;
    else if (debtToIncome <= 0.5) score += 10;
    else score -= (debtToIncome - 0.5) * 20;

    if (financialProfile.financialGoals.length >= 3) score += 10;
    else if (financialProfile.financialGoals.length >= 1) score += 5;

    score += financialProfile.investmentExperience * 2;
    
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  if (isLoading || loadingProfile) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingLogo}>
          <Text style={styles.loadingSymbol}>₹</Text>
        </View>
        <Text style={styles.loadingTitle}>FINSTABILITY</Text>
        <ActivityIndicator size="large" color={AIColors.primary} style={styles.spinner} />
        <Text style={styles.loadingText}>Loading your financial data...</Text>
      </View>
    );
  }

  const healthScore = calculateHealthScore();
  const healthColor = healthScore >= 70 ? AIColors.success : healthScore >= 40 ? AIColors.warning : AIColors.error;

  return (
    <View style={styles.container}>
      {/* Background Grid */}
      <View style={styles.gridPattern}>
        {[...Array(20)].map((_, i) => (
          <View key={`h-${i}`} style={[styles.gridLine, styles.gridHorizontal, { top: i * 50 }]} />
        ))}
      </View>

      {/* Glow Orbs */}
      <Animated.View style={[styles.glowOrb, styles.glowOrbPrimary, { opacity: pulseAnim }]} />
      <Animated.View style={[styles.glowOrb, styles.glowOrbSecondary, { opacity: pulseAnim }]} />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.avatarContainer}>
                  <Text style={styles.avatarText}>
                    {user?.displayName?.charAt(0) || '?'}
                  </Text>
                  <View style={styles.avatarOnline} />
                </View>
                <View style={styles.headerInfo}>
                  <Text style={styles.welcomeText}>Welcome back</Text>
                  <Text style={styles.userName}>{user?.displayName || 'User'}</Text>
                </View>
              </View>
              <View style={styles.headerRight}>
                <TouchableOpacity style={styles.notificationButton}>
                  <Text style={styles.notificationIcon}>🔔</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                  <Text style={styles.signOutIcon}>⏻</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* AI Insight Banner */}
            <TouchableOpacity style={styles.aiBanner} activeOpacity={0.8}>
              <View style={styles.aiBannerIcon}>
                <Text style={styles.aiIcon}>◆</Text>
              </View>
              <View style={styles.aiBannerContent}>
                <Text style={styles.aiBannerTitle}>AI Financial Insight</Text>
                <Text style={styles.aiBannerText}>
                  {financialProfile 
                    ? `Your savings rate is ${financialProfile.monthlyIncome > 0 
                        ? ((financialProfile.totalSavings / (financialProfile.monthlyIncome * 6)) * 100).toFixed(0) 
                        : 0}% of 6-month income`
                    : 'Complete your profile for personalized insights'}
                </Text>
              </View>
              <Text style={styles.aiBannerArrow}>→</Text>
            </TouchableOpacity>

            {/* Health Score Card */}
            <Animated.View style={[styles.healthCard, { opacity: cardAnims[0], transform: [{ scale: cardAnims[0].interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] }]}>
              <View style={styles.healthHeader}>
                <Text style={styles.healthTitle}>Financial Health Score</Text>
                <View style={[styles.healthBadge, { backgroundColor: `${healthColor}20` }]}>
                  <Text style={[styles.healthBadgeText, { color: healthColor }]}>
                    {healthScore >= 70 ? 'Excellent' : healthScore >= 40 ? 'Good' : 'Needs Work'}
                  </Text>
                </View>
              </View>
              <View style={styles.healthScoreContainer}>
                <Text style={[styles.healthScore, { color: healthColor }]}>{healthScore}</Text>
                <Text style={styles.healthScoreMax}>/100</Text>
              </View>
              <ProgressBar progress={healthScore / 100} color={healthColor} height={6} />
              <Text style={styles.healthDescription}>
                Based on your income, savings, debt, and financial goals
              </Text>
            </Animated.View>

            {/* Quick Stats Grid */}
            <View style={styles.statsGrid}>
              <Animated.View style={[styles.statCard, { opacity: cardAnims[1], transform: [{ translateY: cardAnims[1].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
                <View style={[styles.statIcon, { backgroundColor: AIColors.primaryDim }]}>
                  <Text style={styles.statEmoji}>↗</Text>
                </View>
                <Text style={styles.statLabel}>Monthly Income</Text>
                <Text style={[styles.statValue, { color: AIColors.primary }]}>
                  {formatCurrency(financialProfile?.monthlyIncome || user?.monthlyIncome || 0)}
                </Text>
              </Animated.View>

              <Animated.View style={[styles.statCard, { opacity: cardAnims[1], transform: [{ translateY: cardAnims[1].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
                <View style={[styles.statIcon, { backgroundColor: AIColors.secondaryDim }]}>
                  <Text style={styles.statEmoji}>◫</Text>
                </View>
                <Text style={styles.statLabel}>Total Savings</Text>
                <Text style={[styles.statValue, { color: AIColors.secondary }]}>
                  {formatCurrency(financialProfile?.totalSavings || 0)}
                </Text>
              </Animated.View>

              <Animated.View style={[styles.statCard, { opacity: cardAnims[2], transform: [{ translateY: cardAnims[2].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
                <View style={[styles.statIcon, { backgroundColor: AIColors.warningDim }]}>
                  <Text style={styles.statEmoji}>▽</Text>
                </View>
                <Text style={styles.statLabel}>Monthly Expenses</Text>
                <Text style={[styles.statValue, { color: AIColors.warning }]}>
                  {formatCurrency(financialProfile?.monthlyExpenses || 0)}
                </Text>
              </Animated.View>

              <Animated.View style={[styles.statCard, { opacity: cardAnims[2], transform: [{ translateY: cardAnims[2].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
                <View style={[styles.statIcon, { backgroundColor: AIColors.errorDim }]}>
                  <Text style={styles.statEmoji}>□</Text>
                </View>
                <Text style={styles.statLabel}>Existing Loans</Text>
                <Text style={[styles.statValue, { color: AIColors.error }]}>
                  {formatCurrency(financialProfile?.existingLoans || 0)}
                </Text>
              </Animated.View>
            </View>

            {/* Financial Goals */}
            {financialProfile?.financialGoals && financialProfile.financialGoals.length > 0 && (
              <Animated.View style={[styles.goalsSection, { opacity: cardAnims[3] }]}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionIcon}>◆</Text>
                  <Text style={styles.sectionTitle}>Financial Goals</Text>
                </View>
                <View style={styles.goalsGrid}>
                  {financialProfile.financialGoals.slice(0, 4).map((goal, index) => (
                    <View key={goal} style={styles.goalPill}>
                      <Text style={styles.goalEmoji}>{FinancialGoalIcons[goal]}</Text>
                      <Text style={styles.goalText}>{FinancialGoalLabels[goal]}</Text>
                    </View>
                  ))}
                </View>
              </Animated.View>
            )}

            {/* Profile Overview */}
            <View style={styles.profileSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>○</Text>
                <Text style={styles.sectionTitle}>Profile Overview</Text>
              </View>
              
              <GlassCard style={styles.profileCard}>
                <View style={styles.profileRow}>
                  <Text style={styles.profileLabel}>Profile Type</Text>
                  <View style={styles.profileValueContainer}>
                    <Text style={styles.profileValue}>
                      {user?.userType ? UserTypeLabels[user.userType] : 'Not set'}
                    </Text>
                  </View>
                </View>
                <View style={styles.profileDivider} />
                <View style={styles.profileRow}>
                  <Text style={styles.profileLabel}>Risk Tolerance</Text>
                  <View style={styles.profileValueContainer}>
                    <Text style={styles.profileValue}>
                      {user?.riskTolerance ? RiskToleranceLabels[user.riskTolerance] : 'Not set'}
                    </Text>
                  </View>
                </View>
                <View style={styles.profileDivider} />
                <View style={styles.profileRow}>
                  <Text style={styles.profileLabel}>Experience Level</Text>
                  <View style={styles.profileValueContainer}>
                    <Text style={styles.profileValue}>
                      {financialProfile?.investmentExperience || 0}/10
                    </Text>
                  </View>
                </View>
              </GlassCard>
            </View>

            {/* AI Recommendations Preview */}
            {recommendations && (
              <View style={styles.recommendationsSection}>
                {/* All Government Schemes */}
                {recommendations.schemes.length > 0 && (
                  <>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionIcon}>◇</Text>
                      <Text style={styles.sectionTitle}>Government Schemes For You</Text>
                    </View>
                    <Text style={styles.sectionSubtitle}>{recommendations.schemes.length} schemes matched to your profile</Text>
                    {recommendations.schemes.map((scheme, index) => (
                      <View key={`scheme-${index}`} style={styles.recCard}>
                        <View style={styles.recCardHeader}>
                          <View style={[styles.recBadge, { backgroundColor: AIColors.primaryDim }]}>
                            <Text style={[styles.recBadgeText, { color: AIColors.primary }]}>{scheme.category.toUpperCase()}</Text>
                          </View>
                          <Text style={styles.recCardIndex}>{index + 1}/{recommendations.schemes.length}</Text>
                        </View>
                        <Text style={styles.recCardTitle}>{scheme.scheme_name}</Text>
                        <Text style={styles.recCardDesc}>{scheme.description}</Text>
                        <View style={styles.recCardDetails}>
                          <Text style={styles.recCardDetailLabel}>Benefits:</Text>
                          <Text style={styles.recCardDetailText}>{scheme.benefits}</Text>
                        </View>
                        <View style={styles.recCardDetails}>
                          <Text style={styles.recCardDetailLabel}>Eligibility:</Text>
                          <Text style={styles.recCardDetailText}>{scheme.eligibility}</Text>
                        </View>
                      </View>
                    ))}
                  </>
                )}

                {/* All Loan Options */}
                {recommendations.loans.length > 0 && (
                  <>
                    <View style={[styles.sectionHeader, { marginTop: AISpacing.xl }]}>
                      <Text style={styles.sectionIcon}>□</Text>
                      <Text style={styles.sectionTitle}>Recommended Loans</Text>
                    </View>
                    <Text style={styles.sectionSubtitle}>{recommendations.loans.length} loan types suited for you</Text>
                    {recommendations.loans.map((loan, index) => (
                      <View key={`loan-${index}`} style={styles.recCard}>
                        <View style={styles.recCardHeader}>
                          <View style={[styles.recBadge, { backgroundColor: AIColors.secondaryDim }]}>
                            <Text style={[styles.recBadgeText, { color: AIColors.secondary }]}>{loan.type.toUpperCase()}</Text>
                          </View>
                          <Text style={[styles.recRate, { color: AIColors.secondary }]}>{loan.interestRange}</Text>
                        </View>
                        <Text style={styles.recCardTitle}>{loan.name}</Text>
                        <Text style={styles.recCardDesc}>{loan.description}</Text>
                        <View style={styles.recCardDetails}>
                          <Text style={styles.recCardDetailLabel}>Max Amount:</Text>
                          <Text style={styles.recCardDetailText}>{loan.maxAmount}</Text>
                        </View>
                        <View style={styles.recCardDetails}>
                          <Text style={styles.recCardDetailLabel}>Features:</Text>
                          <Text style={styles.recCardDetailText}>{loan.features.join(', ')}</Text>
                        </View>
                      </View>
                    ))}
                  </>
                )}

                {/* All Investment Options */}
                {recommendations.investments.length > 0 && (
                  <>
                    <View style={[styles.sectionHeader, { marginTop: AISpacing.xl }]}>
                      <Text style={styles.sectionIcon}>△</Text>
                      <Text style={styles.sectionTitle}>Investment Recommendations</Text>
                    </View>
                    <Text style={styles.sectionSubtitle}>{recommendations.investments.length} investment options for your goals</Text>
                    {recommendations.investments.map((inv, index) => (
                      <View key={`inv-${index}`} style={styles.recCard}>
                        <View style={styles.recCardHeader}>
                          <View style={[styles.recBadge, { backgroundColor: AIColors.successDim }]}>
                            <Text style={[styles.recBadgeText, { color: AIColors.success }]}>{inv.riskLevel} RISK</Text>
                          </View>
                          <Text style={[styles.recRate, { color: AIColors.success }]}>{inv.expectedReturns}</Text>
                        </View>
                        <Text style={styles.recCardTitle}>{inv.name}</Text>
                        <Text style={styles.recCardDesc}>{inv.description}</Text>
                        <View style={styles.recCardRow}>
                          <View style={styles.recCardDetails}>
                            <Text style={styles.recCardDetailLabel}>Min Investment:</Text>
                            <Text style={styles.recCardDetailText}>{inv.minInvestment}</Text>
                          </View>
                          <View style={styles.recCardDetails}>
                            <Text style={styles.recCardDetailLabel}>Lock-in:</Text>
                            <Text style={styles.recCardDetailText}>{inv.lockInPeriod}</Text>
                          </View>
                        </View>
                        {inv.taxBenefits && (
                          <View style={styles.taxBadge}>
                            <Text style={styles.taxBadgeText}>✓ Tax Benefits Available</Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </>
                )}

                {/* AI Tips */}
                {recommendations.tips.length > 0 && (
                  <>
                    <View style={[styles.sectionHeader, { marginTop: AISpacing.xl }]}>
                      <Text style={styles.sectionIcon}>◆</Text>
                      <Text style={styles.sectionTitle}>Personalized Tips</Text>
                    </View>
                    {recommendations.tips.map((tip, index) => (
                      <View key={`tip-${index}`} style={styles.tipCard}>
                        <Text style={styles.tipNumber}>{index + 1}</Text>
                        <Text style={styles.tipText}>{tip}</Text>
                      </View>
                    ))}
                  </>
                )}
              </View>
            )}

            {/* Action Button */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('FinancialInput')}
              activeOpacity={0.85}
            >
              <View style={styles.actionButtonGlow} />
              <Text style={styles.actionButtonIcon}>▷</Text>
              <View style={styles.actionButtonContent}>
                <Text style={styles.actionButtonTitle}>Update Financial Profile</Text>
                <Text style={styles.actionButtonSubtitle}>Keep your data current for better insights</Text>
              </View>
              <Text style={styles.actionButtonArrow}>→</Text>
            </TouchableOpacity>

            {/* Logout Button */}
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleSignOut}
              activeOpacity={0.85}
            >
              <Text style={styles.logoutIcon}>⏻</Text>
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Powered by AI • Last updated: Just now</Text>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AIColors.background,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: AISpacing.xxl,
  },
  content: {
    paddingHorizontal: AISpacing.lg,
  },

  // Background
  gridPattern: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: AIColors.border,
  },
  gridHorizontal: {
    left: 0,
    right: 0,
    height: 1,
    opacity: 0.15,
  },
  glowOrb: {
    position: 'absolute',
    borderRadius: 999,
  },
  glowOrbPrimary: {
    top: -200,
    right: -150,
    width: 400,
    height: 400,
    backgroundColor: AIColors.primary,
  },
  glowOrbSecondary: {
    bottom: 100,
    left: -200,
    width: 350,
    height: 350,
    backgroundColor: AIColors.secondary,
    opacity: 0.1,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AIColors.background,
  },
  loadingLogo: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: AIColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: AISpacing.md,
    ...AIShadows.glow,
  },
  loadingSymbol: {
    fontSize: 40,
    fontWeight: '700',
    color: AIColors.background,
  },
  loadingTitle: {
    ...AITypography.h3,
    color: AIColors.primary,
    letterSpacing: 4,
    marginBottom: AISpacing.xl,
  },
  spinner: {
    marginBottom: AISpacing.md,
  },
  loadingText: {
    ...AITypography.bodySmall,
    color: AIColors.textSecondary,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: AISpacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: AIColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: AISpacing.md,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: AIColors.background,
  },
  avatarOnline: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: AIColors.success,
    borderWidth: 2,
    borderColor: AIColors.background,
  },
  headerInfo: {
    justifyContent: 'center',
  },
  welcomeText: {
    ...AITypography.bodySmall,
    color: AIColors.textSecondary,
  },
  userName: {
    ...AITypography.h3,
    color: AIColors.text,
  },
  headerRight: {
    flexDirection: 'row',
    gap: AISpacing.sm,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: AIRadius.md,
    backgroundColor: AIColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AIColors.border,
  },
  notificationIcon: {
    fontSize: 18,
  },
  signOutButton: {
    width: 44,
    height: 44,
    borderRadius: AIRadius.md,
    backgroundColor: AIColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AIColors.border,
  },
  signOutIcon: {
    fontSize: 18,
    color: AIColors.textSecondary,
  },

  // AI Banner
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AIColors.primaryDim,
    padding: AISpacing.md,
    borderRadius: AIRadius.xl,
    borderWidth: 1,
    borderColor: AIColors.primary,
    marginBottom: AISpacing.lg,
  },
  aiBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: AIRadius.md,
    backgroundColor: AIColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: AISpacing.md,
  },
  aiIcon: {
    fontSize: 20,
  },
  aiBannerContent: {
    flex: 1,
  },
  aiBannerTitle: {
    ...AITypography.label,
    color: AIColors.primary,
    marginBottom: 2,
  },
  aiBannerText: {
    ...AITypography.bodySmall,
    color: AIColors.text,
  },
  aiBannerArrow: {
    fontSize: 18,
    color: AIColors.primary,
    marginLeft: AISpacing.sm,
  },

  // Health Card
  healthCard: {
    backgroundColor: AIColors.surface,
    borderRadius: AIRadius.xl,
    padding: AISpacing.lg,
    borderWidth: 1,
    borderColor: AIColors.border,
    marginBottom: AISpacing.lg,
    ...AIShadows.md,
  },
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AISpacing.md,
  },
  healthTitle: {
    ...AITypography.h3,
    color: AIColors.text,
  },
  healthBadge: {
    paddingHorizontal: AISpacing.sm,
    paddingVertical: AISpacing.xs,
    borderRadius: AIRadius.full,
  },
  healthBadgeText: {
    ...AITypography.labelSmall,
  },
  healthScoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: AISpacing.md,
  },
  healthScore: {
    ...AITypography.displayLarge,
  },
  healthScoreMax: {
    ...AITypography.h2,
    color: AIColors.textMuted,
    marginLeft: 4,
  },
  healthDescription: {
    ...AITypography.bodySmall,
    color: AIColors.textSecondary,
    marginTop: AISpacing.md,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AISpacing.md,
    marginBottom: AISpacing.lg,
  },
  statCard: {
    width: (width - AISpacing.lg * 2 - AISpacing.md) / 2,
    backgroundColor: AIColors.surface,
    borderRadius: AIRadius.xl,
    padding: AISpacing.md,
    borderWidth: 1,
    borderColor: AIColors.border,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: AIRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: AISpacing.sm,
  },
  statEmoji: {
    fontSize: 18,
  },
  statLabel: {
    ...AITypography.labelSmall,
    color: AIColors.textSecondary,
    marginBottom: AISpacing.xs,
  },
  statValue: {
    ...AITypography.h2,
  },

  // Goals Section
  goalsSection: {
    marginBottom: AISpacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: AISpacing.md,
  },
  sectionIcon: {
    fontSize: 18,
    marginRight: AISpacing.sm,
  },
  sectionTitle: {
    ...AITypography.h3,
    color: AIColors.text,
  },
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AISpacing.sm,
  },
  goalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AIColors.surface,
    paddingHorizontal: AISpacing.md,
    paddingVertical: AISpacing.sm,
    borderRadius: AIRadius.full,
    borderWidth: 1,
    borderColor: AIColors.border,
    gap: AISpacing.xs,
  },
  goalEmoji: {
    fontSize: 14,
  },
  goalText: {
    ...AITypography.bodySmall,
    color: AIColors.text,
  },

  // Profile Section
  profileSection: {
    marginBottom: AISpacing.lg,
  },
  profileCard: {
    padding: AISpacing.md,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: AISpacing.sm,
  },
  profileLabel: {
    ...AITypography.body,
    color: AIColors.textSecondary,
  },
  profileValueContainer: {
    backgroundColor: AIColors.surfaceLight,
    paddingHorizontal: AISpacing.sm,
    paddingVertical: AISpacing.xs,
    borderRadius: AIRadius.md,
  },
  profileValue: {
    ...AITypography.body,
    color: AIColors.text,
    fontWeight: '600',
  },
  profileDivider: {
    height: 1,
    backgroundColor: AIColors.border,
  },

  // Action Button
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AIColors.surface,
    padding: AISpacing.md,
    borderRadius: AIRadius.xl,
    borderWidth: 1.5,
    borderColor: AIColors.primary,
    marginBottom: AISpacing.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  actionButtonGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: AIColors.primaryDim,
    opacity: 0.3,
  },
  actionButtonIcon: {
    fontSize: 24,
    marginRight: AISpacing.md,
  },
  actionButtonContent: {
    flex: 1,
  },
  actionButtonTitle: {
    ...AITypography.body,
    color: AIColors.text,
    fontWeight: '600',
  },
  actionButtonSubtitle: {
    ...AITypography.bodySmall,
    color: AIColors.textSecondary,
    marginTop: 2,
  },
  actionButtonArrow: {
    fontSize: 20,
    color: AIColors.primary,
  },

  // Recommendations Section
  recommendationsSection: {
    marginBottom: AISpacing.lg,
  },
  recCard: {
    backgroundColor: AIColors.surface,
    borderRadius: AIRadius.xl,
    padding: AISpacing.md,
    borderWidth: 1,
    borderColor: AIColors.border,
    marginBottom: AISpacing.sm,
  },
  recCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AISpacing.xs,
  },
  recBadge: {
    paddingHorizontal: AISpacing.sm,
    paddingVertical: 4,
    borderRadius: AIRadius.md,
  },
  recBadgeText: {
    ...AITypography.labelSmall,
    fontSize: 10,
    fontWeight: '700',
  },
  recRate: {
    ...AITypography.label,
    fontWeight: '600',
  },
  recCardTitle: {
    ...AITypography.body,
    fontWeight: '600',
    color: AIColors.text,
    marginBottom: 4,
  },
  recCardDesc: {
    ...AITypography.bodySmall,
    color: AIColors.textSecondary,
    marginBottom: AISpacing.sm,
  },
  recCardIndex: {
    ...AITypography.labelSmall,
    color: AIColors.textMuted,
  },
  recCardDetails: {
    marginTop: AISpacing.xs,
  },
  recCardDetailLabel: {
    ...AITypography.labelSmall,
    color: AIColors.textMuted,
    marginBottom: 2,
  },
  recCardDetailText: {
    ...AITypography.bodySmall,
    color: AIColors.textSecondary,
  },
  recCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: AISpacing.xs,
  },
  sectionSubtitle: {
    ...AITypography.bodySmall,
    color: AIColors.textSecondary,
    marginBottom: AISpacing.md,
    marginTop: -AISpacing.xs,
  },
  taxBadge: {
    backgroundColor: AIColors.successDim,
    paddingHorizontal: AISpacing.sm,
    paddingVertical: 4,
    borderRadius: AIRadius.md,
    marginTop: AISpacing.sm,
    alignSelf: 'flex-start',
  },
  taxBadgeText: {
    ...AITypography.labelSmall,
    color: AIColors.success,
    fontSize: 11,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: AIColors.primaryDim,
    padding: AISpacing.md,
    borderRadius: AIRadius.lg,
    borderWidth: 1,
    borderColor: AIColors.primary,
    marginTop: AISpacing.sm,
  },
  tipNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: AIColors.primary,
    color: AIColors.background,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '700',
    marginRight: AISpacing.md,
    fontSize: 12,
  },
  tipIcon: {
    fontSize: 16,
    color: AIColors.primary,
    marginRight: AISpacing.sm,
  },
  tipText: {
    flex: 1,
    ...AITypography.bodySmall,
    color: AIColors.text,
  },

  // Logout Button
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AIColors.surface,
    padding: AISpacing.md,
    borderRadius: AIRadius.xl,
    borderWidth: 1,
    borderColor: AIColors.error,
    marginBottom: AISpacing.lg,
  },
  logoutIcon: {
    fontSize: 18,
    color: AIColors.error,
    marginRight: AISpacing.sm,
  },
  logoutText: {
    ...AITypography.body,
    color: AIColors.error,
    fontWeight: '600',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: AISpacing.lg,
  },
  footerText: {
    ...AITypography.labelSmall,
    color: AIColors.textMuted,
  },
});
