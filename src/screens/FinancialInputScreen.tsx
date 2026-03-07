/**
 * Financial Input Screen - Futuristic AI Financial Platform
 * Apple/Stripe inspired dark theme with glassmorphism
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  RootStackParamList,
  FinancialProfile,
  FinancialGoal,
  FinancialGoalLabels,
  FinancialGoalIcons,
  EmploymentType,
  RiskTolerance,
  RiskToleranceLabels,
} from '../types';
import { AIColors, AISpacing, AIRadius, AIShadows, AITypography } from '../theme/aiTheme';
import { GlassCard, ProgressBar } from '../components/ai';

const { width } = Dimensions.get('window');
const FINANCIAL_PROFILE_KEY = 'financial_profile';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'FinancialInput'>;
};

const employmentTypes = [
  { type: EmploymentType.FULL_TIME, label: 'Full-Time', icon: '◇' },
  { type: EmploymentType.PART_TIME, label: 'Part-Time', icon: '○' },
  { type: EmploymentType.SELF_EMPLOYED, label: 'Self-Employed', icon: '△' },
  { type: EmploymentType.FREELANCER, label: 'Freelancer', icon: '□' },
  { type: EmploymentType.UNEMPLOYED, label: 'Not Working', icon: '▽' },
  { type: EmploymentType.RETIRED, label: 'Retired', icon: '◎' },
];

const financialGoals = Object.values(FinancialGoal);

export default function FinancialInputScreen({ navigation }: Props) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [existingLoans, setExistingLoans] = useState('');
  const [totalSavings, setTotalSavings] = useState('');
  const [monthlyExpenses, setMonthlyExpenses] = useState('');
  const [selectedGoals, setSelectedGoals] = useState<FinancialGoal[]>([]);
  const [riskTolerance, setRiskTolerance] = useState<RiskTolerance>(RiskTolerance.MODERATE);
  const [employmentType, setEmploymentType] = useState<EmploymentType>(EmploymentType.FULL_TIME);
  const [investmentExperience, setInvestmentExperience] = useState(5);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const totalSteps = 4;
  const progress = step / totalSteps;

  useEffect(() => {
    loadExistingProfile();
    animateStep();
  }, []);

  const animateStep = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const loadExistingProfile = async () => {
    try {
      setIsLoading(true);
      const data = await AsyncStorage.getItem(FINANCIAL_PROFILE_KEY);
      if (data) {
        const profile: FinancialProfile = JSON.parse(data);
        setMonthlyIncome(profile.monthlyIncome?.toString() || '');
        setExistingLoans(profile.existingLoans?.toString() || '');
        setTotalSavings(profile.totalSavings?.toString() || '');
        setMonthlyExpenses(profile.monthlyExpenses?.toString() || '');
        setSelectedGoals(profile.financialGoals || []);
        setRiskTolerance(profile.riskTolerance || RiskTolerance.MODERATE);
        setEmploymentType(profile.employmentType || EmploymentType.FULL_TIME);
        setInvestmentExperience(profile.investmentExperience || 5);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
      animateStep();
    } else {
      handleSave();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      animateStep();
    } else {
      navigation.goBack();
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const profile: FinancialProfile = {
        monthlyIncome: parseFloat(monthlyIncome) || 0,
        existingLoans: parseFloat(existingLoans) || 0,
        totalSavings: parseFloat(totalSavings) || 0,
        monthlyExpenses: parseFloat(monthlyExpenses) || 0,
        financialGoals: selectedGoals,
        riskTolerance,
        employmentType,
        investmentExperience,
        updatedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(FINANCIAL_PROFILE_KEY, JSON.stringify(profile));
      navigation.goBack();
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleGoal = (goal: FinancialGoal) => {
    setSelectedGoals(prev =>
      prev.includes(goal)
        ? prev.filter(g => g !== goal)
        : [...prev, goal]
    );
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return monthlyIncome.trim().length > 0 && !isNaN(parseFloat(monthlyIncome));
      case 2:
        return true;
      case 3:
        return selectedGoals.length > 0;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '₹0';
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
    if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
    return `₹${num.toLocaleString()}`;
  };

  const renderCurrencyInput = (
    label: string,
    value: string,
    onChange: (text: string) => void,
    placeholder: string,
    icon: string
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.currencyInputContainer}>
        <View style={styles.currencyIcon}>
          <Text style={styles.currencyEmoji}>{icon}</Text>
        </View>
        <View style={styles.currencyBadge}>
          <Text style={styles.currencySymbol}>₹</Text>
        </View>
        <TextInput
          style={styles.currencyInput}
          value={value}
          onChangeText={(text) => onChange(text.replace(/[^0-9]/g, ''))}
          placeholder={placeholder}
          placeholderTextColor={AIColors.textMuted}
          keyboardType="numeric"
        />
        {value && (
          <Text style={styles.formattedValue}>{formatCurrency(value)}</Text>
        )}
      </View>
    </View>
  );

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Animated.View style={[styles.stepContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepIcon}>01</Text>
              <Text style={styles.stepTitle}>Income & Assets</Text>
              <Text style={styles.stepSubtitle}>Tell us about your financial inflow</Text>
            </View>

            {renderCurrencyInput(
              'MONTHLY INCOME',
              monthlyIncome,
              setMonthlyIncome,
              '50000',
              '◇'
            )}

            {renderCurrencyInput(
              'TOTAL SAVINGS',
              totalSavings,
              setTotalSavings,
              '100000',
              '□'
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMPLOYMENT TYPE</Text>
              <View style={styles.employmentGrid}>
                {employmentTypes.map((item) => (
                  <TouchableOpacity
                    key={item.type}
                    style={[
                      styles.employmentChip,
                      employmentType === item.type && styles.employmentChipSelected,
                    ]}
                    onPress={() => setEmploymentType(item.type)}
                  >
                    <Text style={styles.employmentIcon}>{item.icon}</Text>
                    <Text style={[
                      styles.employmentLabel,
                      employmentType === item.type && styles.employmentLabelSelected,
                    ]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Animated.View>
        );

      case 2:
        return (
          <Animated.View style={[styles.stepContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepIcon}>02</Text>
              <Text style={styles.stepTitle}>Expenses & Liabilities</Text>
              <Text style={styles.stepSubtitle}>Help us understand your obligations</Text>
            </View>

            {renderCurrencyInput(
              'MONTHLY EXPENSES',
              monthlyExpenses,
              setMonthlyExpenses,
              '30000',
              '○'
            )}

            {renderCurrencyInput(
              'EXISTING LOANS',
              existingLoans,
              setExistingLoans,
              '0',
              '▽'
            )}

            <GlassCard style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Net Monthly Savings</Text>
                <Text style={[
                  styles.summaryValue,
                  { color: (parseFloat(monthlyIncome) || 0) - (parseFloat(monthlyExpenses) || 0) >= 0 
                    ? AIColors.success 
                    : AIColors.error 
                  }
                ]}>
                  {formatCurrency(String((parseFloat(monthlyIncome) || 0) - (parseFloat(monthlyExpenses) || 0)))}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Savings Rate</Text>
                <Text style={styles.summaryValue}>
                  {monthlyIncome && parseFloat(monthlyIncome) > 0
                    ? `${(((parseFloat(monthlyIncome) - (parseFloat(monthlyExpenses) || 0)) / parseFloat(monthlyIncome)) * 100).toFixed(0)}%`
                    : '0%'
                  }
                </Text>
              </View>
            </GlassCard>
          </Animated.View>
        );

      case 3:
        return (
          <Animated.View style={[styles.stepContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepIcon}>03</Text>
              <Text style={styles.stepTitle}>Financial Goals</Text>
              <Text style={styles.stepSubtitle}>What are you saving for? (Select all that apply)</Text>
            </View>

            <View style={styles.goalsGrid}>
              {financialGoals.map((goal) => (
                <TouchableOpacity
                  key={goal}
                  style={[
                    styles.goalCard,
                    selectedGoals.includes(goal) && styles.goalCardSelected,
                  ]}
                  onPress={() => toggleGoal(goal)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.goalIcon}>{FinancialGoalIcons[goal]}</Text>
                  <Text style={[
                    styles.goalLabel,
                    selectedGoals.includes(goal) && styles.goalLabelSelected,
                  ]}>
                    {FinancialGoalLabels[goal]}
                  </Text>
                  {selectedGoals.includes(goal) && (
                    <View style={styles.goalCheck}>
                      <Text style={styles.goalCheckIcon}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.selectedCount}>
              {selectedGoals.length} goal{selectedGoals.length !== 1 ? 's' : ''} selected
            </Text>
          </Animated.View>
        );

      case 4:
        return (
          <Animated.View style={[styles.stepContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepIcon}>04</Text>
              <Text style={styles.stepTitle}>Risk & Experience</Text>
              <Text style={styles.stepSubtitle}>How do you approach investments?</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>RISK TOLERANCE</Text>
              <View style={styles.riskOptions}>
                {[RiskTolerance.LOW, RiskTolerance.MODERATE, RiskTolerance.HIGH].map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.riskOption,
                      riskTolerance === level && styles.riskOptionSelected,
                    ]}
                    onPress={() => setRiskTolerance(level)}
                  >
                    <Text style={[
                      styles.riskOptionIcon,
                      riskTolerance === level && styles.riskOptionIconSelected,
                    ]}>
                      {level === RiskTolerance.LOW ? '—' : level === RiskTolerance.MODERATE ? '≡' : '↑'}
                    </Text>
                    <Text style={[
                      styles.riskOptionLabel,
                      riskTolerance === level && styles.riskOptionLabelSelected,
                    ]}>
                      {RiskToleranceLabels[level]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.sliderHeader}>
                <Text style={styles.inputLabel}>INVESTMENT EXPERIENCE</Text>
                <Text style={styles.experienceValue}>{investmentExperience}/10</Text>
              </View>
              <View style={styles.experienceScale}>
                {[...Array(10)].map((_, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.experienceDot,
                      i < investmentExperience && styles.experienceDotActive,
                    ]}
                    onPress={() => setInvestmentExperience(i + 1)}
                  />
                ))}
              </View>
              <View style={styles.experienceLabels}>
                <Text style={styles.experienceLabelText}>Beginner</Text>
                <Text style={styles.experienceLabelText}>Expert</Text>
              </View>
            </View>

            <GlassCard variant="glow" style={styles.finalSummary}>
              <Text style={styles.finalSummaryTitle}>📋 Profile Summary</Text>
              <View style={styles.finalSummaryGrid}>
                <View style={styles.finalSummaryItem}>
                  <Text style={styles.finalSummaryLabel}>Income</Text>
                  <Text style={styles.finalSummaryValue}>{formatCurrency(monthlyIncome)}/mo</Text>
                </View>
                <View style={styles.finalSummaryItem}>
                  <Text style={styles.finalSummaryLabel}>Savings</Text>
                  <Text style={styles.finalSummaryValue}>{formatCurrency(totalSavings)}</Text>
                </View>
                <View style={styles.finalSummaryItem}>
                  <Text style={styles.finalSummaryLabel}>Goals</Text>
                  <Text style={styles.finalSummaryValue}>{selectedGoals.length}</Text>
                </View>
                <View style={styles.finalSummaryItem}>
                  <Text style={styles.finalSummaryLabel}>Risk</Text>
                  <Text style={styles.finalSummaryValue}>{RiskToleranceLabels[riskTolerance]}</Text>
                </View>
              </View>
            </GlassCard>
          </Animated.View>
        );
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AIColors.primary} />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Background Grid */}
      <View style={styles.gridPattern}>
        {[...Array(15)].map((_, i) => (
          <View key={`h-${i}`} style={[styles.gridLine, styles.gridHorizontal, { top: i * 60 }]} />
        ))}
      </View>

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                <Text style={styles.backIcon}>←</Text>
              </TouchableOpacity>
              <View style={styles.headerTitles}>
                <Text style={styles.headerTitle}>Financial Profile</Text>
                <Text style={styles.headerSubtitle}>AI-powered analysis</Text>
              </View>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>{step}/{totalSteps}</Text>
              </View>
            </View>

            <View style={styles.progressContainer}>
              <ProgressBar progress={progress} color={AIColors.primary} height={4} />
            </View>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {renderStep()}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.continueButton,
                !canProceed() && styles.continueButtonDisabled,
              ]}
              onPress={handleNext}
              disabled={!canProceed() || isSaving}
              activeOpacity={0.85}
            >
              {isSaving ? (
                <ActivityIndicator color={AIColors.background} size="small" />
              ) : (
                <>
                  <Text style={[
                    styles.continueButtonText,
                    !canProceed() && styles.continueButtonTextDisabled
                  ]}>
                    {step === totalSteps ? 'Save Profile' : 'Continue'}
                  </Text>
                  <Text style={[
                    styles.continueButtonIcon,
                    !canProceed() && styles.continueButtonTextDisabled
                  ]}>→</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
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
    opacity: 0.2,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AIColors.background,
  },
  loadingText: {
    ...AITypography.body,
    color: AIColors.textSecondary,
    marginTop: AISpacing.md,
  },

  // Header
  header: {
    paddingHorizontal: AISpacing.xl,
    paddingTop: AISpacing.md,
    paddingBottom: AISpacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: AIColors.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: AISpacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: AIRadius.lg,
    backgroundColor: AIColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: AISpacing.md,
    borderWidth: 1,
    borderColor: AIColors.border,
  },
  backIcon: {
    fontSize: 20,
    color: AIColors.text,
  },
  headerTitles: {
    flex: 1,
  },
  headerTitle: {
    ...AITypography.h2,
    color: AIColors.text,
  },
  headerSubtitle: {
    ...AITypography.bodySmall,
    color: AIColors.textSecondary,
    marginTop: 2,
  },
  stepBadge: {
    paddingHorizontal: AISpacing.md,
    paddingVertical: AISpacing.xs,
    backgroundColor: AIColors.primaryDim,
    borderRadius: AIRadius.full,
  },
  stepBadgeText: {
    ...AITypography.label,
    color: AIColors.primary,
  },
  progressContainer: {
    marginTop: AISpacing.sm,
  },

  // Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: AISpacing.xl,
    paddingVertical: AISpacing.xl,
  },
  stepContent: {
    flex: 1,
  },
  stepHeader: {
    marginBottom: AISpacing.xl,
  },
  stepIcon: {
    fontSize: 36,
    marginBottom: AISpacing.sm,
  },
  stepTitle: {
    ...AITypography.h1,
    color: AIColors.text,
    marginBottom: AISpacing.xs,
  },
  stepSubtitle: {
    ...AITypography.body,
    color: AIColors.textSecondary,
  },

  // Input Group
  inputGroup: {
    marginBottom: AISpacing.xl,
  },
  inputLabel: {
    ...AITypography.label,
    color: AIColors.textSecondary,
    marginBottom: AISpacing.sm,
  },

  // Currency Input
  currencyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AIColors.surface,
    borderRadius: AIRadius.xl,
    borderWidth: 1.5,
    borderColor: AIColors.border,
    paddingHorizontal: AISpacing.md,
    paddingVertical: AISpacing.sm,
  },
  currencyIcon: {
    width: 40,
    height: 40,
    borderRadius: AIRadius.md,
    backgroundColor: AIColors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: AISpacing.sm,
  },
  currencyEmoji: {
    fontSize: 18,
  },
  currencyBadge: {
    backgroundColor: AIColors.primary,
    paddingHorizontal: AISpacing.sm,
    paddingVertical: AISpacing.xs,
    borderRadius: AIRadius.md,
    marginRight: AISpacing.sm,
  },
  currencySymbol: {
    ...AITypography.body,
    color: AIColors.background,
    fontWeight: '700',
  },
  currencyInput: {
    flex: 1,
    ...AITypography.h2,
    color: AIColors.text,
    paddingVertical: AISpacing.sm,
  },
  formattedValue: {
    ...AITypography.body,
    color: AIColors.textSecondary,
  },

  // Employment Grid
  employmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AISpacing.sm,
  },
  employmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AIColors.surface,
    paddingHorizontal: AISpacing.md,
    paddingVertical: AISpacing.sm,
    borderRadius: AIRadius.full,
    borderWidth: 1.5,
    borderColor: AIColors.border,
    gap: AISpacing.xs,
  },
  employmentChipSelected: {
    borderColor: AIColors.primary,
    backgroundColor: AIColors.primaryDim,
  },
  employmentIcon: {
    fontSize: 14,
  },
  employmentLabel: {
    ...AITypography.bodySmall,
    color: AIColors.textSecondary,
  },
  employmentLabelSelected: {
    color: AIColors.primary,
  },

  // Summary Card
  summaryCard: {
    marginTop: AISpacing.md,
    padding: AISpacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: AISpacing.sm,
  },
  summaryLabel: {
    ...AITypography.body,
    color: AIColors.textSecondary,
  },
  summaryValue: {
    ...AITypography.h3,
    color: AIColors.text,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: AIColors.border,
  },

  // Goals Grid
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AISpacing.sm,
    marginBottom: AISpacing.lg,
  },
  goalCard: {
    width: (width - AISpacing.xl * 2 - AISpacing.sm * 2) / 3,
    aspectRatio: 1,
    backgroundColor: AIColors.surface,
    borderRadius: AIRadius.lg,
    borderWidth: 1.5,
    borderColor: AIColors.border,
    justifyContent: 'center',
    alignItems: 'center',
    padding: AISpacing.sm,
    position: 'relative',
  },
  goalCardSelected: {
    borderColor: AIColors.primary,
    backgroundColor: AIColors.primaryDim,
  },
  goalIcon: {
    fontSize: 24,
    marginBottom: AISpacing.xs,
  },
  goalLabel: {
    ...AITypography.labelSmall,
    color: AIColors.textSecondary,
    textAlign: 'center',
  },
  goalLabelSelected: {
    color: AIColors.primary,
  },
  goalCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: AIColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalCheckIcon: {
    fontSize: 12,
    color: AIColors.background,
    fontWeight: '700',
  },
  selectedCount: {
    ...AITypography.body,
    color: AIColors.textSecondary,
    textAlign: 'center',
  },

  // Risk Options
  riskOptions: {
    flexDirection: 'row',
    gap: AISpacing.sm,
  },
  riskOption: {
    flex: 1,
    backgroundColor: AIColors.surface,
    borderRadius: AIRadius.lg,
    borderWidth: 1.5,
    borderColor: AIColors.border,
    padding: AISpacing.md,
    alignItems: 'center',
  },
  riskOptionSelected: {
    borderColor: AIColors.primary,
    backgroundColor: AIColors.primaryDim,
  },
  riskOptionIcon: {
    fontSize: 28,
    marginBottom: AISpacing.sm,
  },
  riskOptionIconSelected: {},
  riskOptionLabel: {
    ...AITypography.bodySmall,
    color: AIColors.textSecondary,
    textAlign: 'center',
  },
  riskOptionLabelSelected: {
    color: AIColors.primary,
    fontWeight: '600',
  },

  // Experience Scale
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AISpacing.sm,
  },
  experienceValue: {
    ...AITypography.h3,
    color: AIColors.primary,
  },
  experienceScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: AISpacing.sm,
  },
  experienceDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: AIColors.surface,
    borderWidth: 2,
    borderColor: AIColors.border,
  },
  experienceDotActive: {
    backgroundColor: AIColors.primary,
    borderColor: AIColors.primary,
  },
  experienceLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  experienceLabelText: {
    ...AITypography.labelSmall,
    color: AIColors.textMuted,
  },

  // Final Summary
  finalSummary: {
    marginTop: AISpacing.lg,
  },
  finalSummaryTitle: {
    ...AITypography.h3,
    color: AIColors.text,
    marginBottom: AISpacing.md,
  },
  finalSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AISpacing.md,
  },
  finalSummaryItem: {
    width: '45%',
    backgroundColor: AIColors.surfaceLight,
    borderRadius: AIRadius.md,
    padding: AISpacing.sm,
  },
  finalSummaryLabel: {
    ...AITypography.labelSmall,
    color: AIColors.textSecondary,
    marginBottom: 4,
  },
  finalSummaryValue: {
    ...AITypography.body,
    color: AIColors.text,
    fontWeight: '600',
  },

  // Footer
  footer: {
    paddingHorizontal: AISpacing.xl,
    paddingVertical: AISpacing.lg,
    borderTopWidth: 1,
    borderTopColor: AIColors.border,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AIColors.primary,
    paddingVertical: AISpacing.lg,
    borderRadius: AIRadius.lg,
    ...AIShadows.glow,
  },
  continueButtonDisabled: {
    backgroundColor: AIColors.surface,
    shadowOpacity: 0,
  },
  continueButtonText: {
    ...AITypography.button,
    color: AIColors.background,
    fontWeight: '600',
  },
  continueButtonTextDisabled: {
    color: AIColors.textMuted,
  },
  continueButtonIcon: {
    fontSize: 18,
    color: AIColors.background,
    marginLeft: AISpacing.sm,
  },
});
