/**
 * Profile Setup Screen - Futuristic AI Financial Platform
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  RootStackParamList,
  UserType,
  UserTypeLabels,
  RiskTolerance,
  RiskToleranceLabels,
} from '../types';
import { useAuthStore } from '../store/authStore';
import { AIColors, AISpacing, AIRadius, AIShadows, AITypography } from '../theme/aiTheme';
import { GlassCard, ProgressBar, SelectionCard } from '../components/ai';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ProfileSetup'>;
};

const userTypes = [
  { type: UserType.STUDENT, icon: '○', description: 'Learning to manage finances' },
  { type: UserType.WORKING_PROFESSIONAL, icon: '◇', description: 'Building wealth actively' },
  { type: UserType.RETIREE, icon: '□', description: 'Planning for retirement' },
  { type: UserType.SMALL_BUSINESS_OWNER, icon: '△', description: 'Managing business finances' },
];

const riskLevels = [
  { level: RiskTolerance.LOW, icon: '—', description: 'Prefer stability over high returns' },
  { level: RiskTolerance.MODERATE, icon: '≡', description: 'Balance between risk and safety' },
  { level: RiskTolerance.HIGH, icon: '↑', description: 'Comfortable with market volatility' },
];

export default function ProfileSetupScreen({ navigation }: Props) {
  const { 
    currentUser,
    fullName,
    selectedUserType,
    monthlyIncome,
    selectedRiskTolerance,
    updateFullName,
    updateUserType,
    updateMonthlyIncome,
    updateRiskTolerance,
    saveProfile,
    isProfileSaving,
    profileError,
  } = useAuthStore();
  
  const [step, setStep] = useState(1);
  const [localFullName, setLocalFullName] = useState(currentUser?.displayName || fullName || '');
  const [localEmail, setLocalEmail] = useState(currentUser?.email || '');
  const [localUserType, setLocalUserType] = useState<UserType | null>(selectedUserType);
  const [localMonthlyIncome, setLocalMonthlyIncome] = useState(monthlyIncome || '');
  const [localRiskTolerance, setLocalRiskTolerance] = useState<RiskTolerance | null>(selectedRiskTolerance);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const totalSteps = 4;
  const progress = step / totalSteps;

  useEffect(() => {
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
  }, [step]);

  const animateStepChange = () => {
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

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
      animateStepChange();
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      animateStepChange();
    }
  };

  const handleSubmit = async () => {
    if (!localUserType || !localRiskTolerance) return;
    
    // Update store state with local values
    updateFullName(localFullName);
    updateUserType(localUserType);
    updateMonthlyIncome(localMonthlyIncome);
    updateRiskTolerance(localRiskTolerance);
    
    // Small delay to ensure store is updated
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const success = await saveProfile();

    if (success) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Dashboard' }],
      });
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return localFullName.trim().length >= 2;
      case 2:
        return localUserType !== null;
      case 3:
        return localMonthlyIncome.trim().length > 0 && !isNaN(parseFloat(localMonthlyIncome));
      case 4:
        return localRiskTolerance !== null;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Animated.View
            style={[styles.stepContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          >
            <View style={styles.stepHeader}>
              <Text style={styles.stepIcon}>01</Text>
              <Text style={styles.stepTitle}>Personal Information</Text>
              <Text style={styles.stepSubtitle}>Let's get to know you better</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>FULL NAME</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={localFullName}
                  onChangeText={setLocalFullName}
                  placeholder="Enter your full name"
                  placeholderTextColor={AIColors.textMuted}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL (OPTIONAL)</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={localEmail}
                  onChangeText={setLocalEmail}
                  placeholder="Enter your email"
                  placeholderTextColor={AIColors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>
          </Animated.View>
        );

      case 2:
        return (
          <Animated.View
            style={[styles.stepContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          >
            <View style={styles.stepHeader}>
              <Text style={styles.stepIcon}>02</Text>
              <Text style={styles.stepTitle}>I am a...</Text>
              <Text style={styles.stepSubtitle}>This helps us personalize your experience</Text>
            </View>

            <View style={styles.optionsContainer}>
              {userTypes.map((item) => (
                <TouchableOpacity
                  key={item.type}
                  style={[
                    styles.optionCard,
                    localUserType === item.type && styles.optionCardSelected,
                  ]}
                  onPress={() => setLocalUserType(item.type)}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.optionIcon,
                    localUserType === item.type && styles.optionIconSelected
                  ]}>
                    <Text style={styles.optionEmoji}>{item.icon}</Text>
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={[
                      styles.optionTitle,
                      localUserType === item.type && styles.optionTitleSelected
                    ]}>
                      {UserTypeLabels[item.type]}
                    </Text>
                    <Text style={styles.optionDescription}>{item.description}</Text>
                  </View>
                  <View style={[
                    styles.radioOuter,
                    localUserType === item.type && styles.radioOuterSelected
                  ]}>
                    {localUserType === item.type && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        );

      case 3:
        return (
          <Animated.View
            style={[styles.stepContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          >
            <View style={styles.stepHeader}>
              <Text style={styles.stepIcon}>03</Text>
              <Text style={styles.stepTitle}>Monthly Income</Text>
              <Text style={styles.stepSubtitle}>Help us recommend budgets tailored to you</Text>
            </View>

            <View style={styles.incomeInputContainer}>
              <View style={styles.currencyBadge}>
                <Text style={styles.currencySymbol}>₹</Text>
              </View>
              <TextInput
                style={styles.incomeInput}
                value={localMonthlyIncome}
                onChangeText={setLocalMonthlyIncome}
                placeholder="0"
                placeholderTextColor={AIColors.textMuted}
                keyboardType="numeric"
              />
              <Text style={styles.incomeUnit}>/month</Text>
            </View>

            <View style={styles.incomeHints}>
              {['25,000', '50,000', '1,00,000', '2,00,000'].map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={styles.incomeHint}
                  onPress={() => setLocalMonthlyIncome(amount.replace(/,/g, ''))}
                >
                  <Text style={styles.incomeHintText}>₹{amount}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        );

      case 4:
        return (
          <Animated.View
            style={[styles.stepContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          >
            <View style={styles.stepHeader}>
              <Text style={styles.stepIcon}>04</Text>
              <Text style={styles.stepTitle}>Risk Tolerance</Text>
              <Text style={styles.stepSubtitle}>How comfortable are you with investment risks?</Text>
            </View>

            <View style={styles.optionsContainer}>
              {riskLevels.map((item) => (
                <TouchableOpacity
                  key={item.level}
                  style={[
                    styles.optionCard,
                    localRiskTolerance === item.level && styles.optionCardSelected,
                  ]}
                  onPress={() => setLocalRiskTolerance(item.level)}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.optionIcon,
                    localRiskTolerance === item.level && styles.optionIconSelected
                  ]}>
                    <Text style={styles.optionEmoji}>{item.icon}</Text>
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={[
                      styles.optionTitle,
                      localRiskTolerance === item.level && styles.optionTitleSelected
                    ]}>
                      {RiskToleranceLabels[item.level]}
                    </Text>
                    <Text style={styles.optionDescription}>{item.description}</Text>
                  </View>
                  <View style={[
                    styles.radioOuter,
                    localRiskTolerance === item.level && styles.radioOuterSelected
                  ]}>
                    {localRiskTolerance === item.level && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        );
    }
  };

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
              {step > 1 && (
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                  <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
              )}
              <View style={styles.headerTitles}>
                <Text style={styles.headerTitle}>Complete Your Profile</Text>
                <Text style={styles.headerSubtitle}>Help us personalize your experience</Text>
              </View>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>{step}/{totalSteps}</Text>
              </View>
            </View>

            <View style={styles.progressContainer}>
              <ProgressBar progress={progress} color={AIColors.primary} height={4} />
              <Text style={styles.progressLabel}>
                {progress === 1 ? 'Complete!' : 'Almost there!'}
              </Text>
            </View>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {profileError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorIcon}>!</Text>
                <Text style={styles.errorText}>{profileError}</Text>
              </View>
            )}

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
              disabled={!canProceed() || isProfileSaving}
              activeOpacity={0.85}
            >
              {isProfileSaving ? (
                <ActivityIndicator color={AIColors.background} size="small" />
              ) : (
                <>
                  <Text style={styles.continueButtonText}>
                    {step === totalSteps ? 'Get Started' : 'Continue'}
                  </Text>
                  <Text style={styles.continueButtonIcon}>→</Text>
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

  // Grid Pattern
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
    width: 40,
    height: 40,
    borderRadius: AIRadius.md,
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
  progressLabel: {
    ...AITypography.labelSmall,
    color: AIColors.primary,
    textAlign: 'right',
    marginTop: AISpacing.xs,
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
    fontSize: 32,
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

  // Error
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AIColors.errorDim,
    padding: AISpacing.md,
    borderRadius: AIRadius.lg,
    marginBottom: AISpacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorIcon: {
    fontSize: 16,
    marginRight: AISpacing.sm,
  },
  errorText: {
    ...AITypography.bodySmall,
    color: AIColors.error,
    flex: 1,
  },

  // Input
  inputGroup: {
    marginBottom: AISpacing.lg,
  },
  inputLabel: {
    ...AITypography.label,
    color: AIColors.textSecondary,
    marginBottom: AISpacing.sm,
  },
  inputContainer: {
    backgroundColor: AIColors.surface,
    borderRadius: AIRadius.lg,
    borderWidth: 1.5,
    borderColor: AIColors.border,
    paddingHorizontal: AISpacing.md,
  },
  input: {
    ...AITypography.bodyLarge,
    color: AIColors.text,
    paddingVertical: AISpacing.md,
  },

  // Options
  optionsContainer: {
    gap: AISpacing.sm,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AIColors.surface,
    borderRadius: AIRadius.lg,
    padding: AISpacing.md,
    borderWidth: 1.5,
    borderColor: AIColors.border,
  },
  optionCardSelected: {
    borderColor: AIColors.primary,
    backgroundColor: AIColors.primaryDim,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: AIRadius.md,
    backgroundColor: AIColors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: AISpacing.md,
  },
  optionIconSelected: {
    backgroundColor: AIColors.primaryDim,
  },
  optionEmoji: {
    fontSize: 24,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    ...AITypography.body,
    color: AIColors.text,
    fontWeight: '600',
  },
  optionTitleSelected: {
    color: AIColors.primary,
  },
  optionDescription: {
    ...AITypography.bodySmall,
    color: AIColors.textSecondary,
    marginTop: 2,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: AIColors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: AIColors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: AIColors.primary,
  },

  // Income Input
  incomeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AIColors.surface,
    borderRadius: AIRadius.xl,
    borderWidth: 1.5,
    borderColor: AIColors.border,
    paddingHorizontal: AISpacing.md,
    paddingVertical: AISpacing.sm,
  },
  currencyBadge: {
    width: 40,
    height: 40,
    borderRadius: AIRadius.md,
    backgroundColor: AIColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: AISpacing.sm,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '700',
    color: AIColors.background,
  },
  incomeInput: {
    flex: 1,
    ...AITypography.displaySmall,
    color: AIColors.text,
    paddingVertical: AISpacing.sm,
  },
  incomeUnit: {
    ...AITypography.body,
    color: AIColors.textMuted,
  },
  incomeHints: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AISpacing.sm,
    marginTop: AISpacing.lg,
  },
  incomeHint: {
    paddingHorizontal: AISpacing.md,
    paddingVertical: AISpacing.sm,
    backgroundColor: AIColors.surface,
    borderRadius: AIRadius.full,
    borderWidth: 1,
    borderColor: AIColors.border,
  },
  incomeHintText: {
    ...AITypography.bodySmall,
    color: AIColors.textSecondary,
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
  continueButtonIcon: {
    fontSize: 18,
    color: AIColors.background,
    marginLeft: AISpacing.sm,
  },
});
