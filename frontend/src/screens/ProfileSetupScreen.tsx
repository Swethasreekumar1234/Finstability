/**
 * Conversational Profile Setup Screen
 * Progressive onboarding using layered profile questions.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  FinancialGoal,
  FinancialGoalLabels,
  RiskTolerance,
  RiskToleranceLabels,
  RootStackParamList,
  UserType,
  UserTypeLabels,
} from '../types';
import { useAuthStore } from '../store/authStore';
import { AIColors, AIRadius, AISpacing, AITypography } from '../theme/aiTheme';
import { ProgressBar } from '../components/ai';
import { useLanguage } from '../i18n/LanguageContext';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ProfileSetup'>;
};

const TOTAL_STEPS = 5;

const userTypeChoices = [
  UserType.STUDENT,
  UserType.WORKING_PROFESSIONAL,
  UserType.SMALL_BUSINESS_OWNER,
  UserType.RETIREE,
];

const employmentChoices = [
  { label: 'Salaried', value: 'salaried' },
  { label: 'Self-employed', value: 'self_employed' },
  { label: 'Farmer', value: 'farmer' },
  { label: 'Student', value: 'student' },
  { label: 'Retired', value: 'retired' },
  { label: 'Unemployed', value: 'unemployed' },
];

const housingChoices = [
  { label: 'Own home', value: 'owned' },
  { label: 'Renting', value: 'rented' },
  { label: 'With family', value: 'living_with_family' },
  { label: 'Other', value: 'other' },
];

const ageBandChoices = [
  '18-24',
  '25-34',
  '35-44',
  '45-54',
  '55+',
];

const householdSizeChoices = [1, 2, 3, 4, 5, 6];
const earningMemberChoices = [1, 2, 3, 4];

const incomeRangeChoices = [
  { label: 'Below ₹25k', value: '0-25000', monthlyIncomeHint: '20000' },
  { label: '₹25k - ₹50k', value: '25000-50000', monthlyIncomeHint: '40000' },
  { label: '₹50k - ₹1L', value: '50000-100000', monthlyIncomeHint: '75000' },
  { label: 'Above ₹1L', value: '100000+', monthlyIncomeHint: '120000' },
];

const yesNoChoices = [
  { label: 'Yes', value: true },
  { label: 'No', value: false },
];

const genderChoices = [
  { label: 'Female', value: 'female' },
  { label: 'Male', value: 'male' },
  { label: 'Other', value: 'other' },
];

function inferAgeBand(age: number): string {
  if (age <= 24) return '18-24';
  if (age <= 34) return '25-34';
  if (age <= 44) return '35-44';
  if (age <= 54) return '45-54';
  return '55+';
}

function Chip({
  selected,
  label,
  onPress,
}: {
  selected: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
      activeOpacity={0.85}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function ProfileSetupScreen({ navigation }: Props) {
  const { t } = useLanguage();
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
  const [localCity, setLocalCity] = useState('');
  const [localState, setLocalState] = useState('Delhi');
  const [localAge, setLocalAge] = useState('30');
  const [localAgeBand, setLocalAgeBand] = useState<string>('25-34');
  const [localGender, setLocalGender] = useState<string | null>(null);
  const [localUserType, setLocalUserType] = useState<UserType | null>(selectedUserType);
  const [localEmploymentType, setLocalEmploymentType] = useState('salaried');
  const [localHouseholdSize, setLocalHouseholdSize] = useState(1);
  const [localHousingStatus, setLocalHousingStatus] = useState('owned');
  const [localIncomeRange, setLocalIncomeRange] = useState('25000-50000');
  const [localMonthlyIncome, setLocalMonthlyIncome] = useState(monthlyIncome || '40000');
  const [localIncomeRegular, setLocalIncomeRegular] = useState<boolean | null>(true);
  const [localEarningMembers, setLocalEarningMembers] = useState(1);
  const [localHasBankAccount, setLocalHasBankAccount] = useState<boolean | null>(true);
  const [localHasLand, setLocalHasLand] = useState<boolean | null>(false);
  const [localHasLifeInsurance, setLocalHasLifeInsurance] = useState<boolean | null>(false);
  const [localHasHealthInsurance, setLocalHasHealthInsurance] = useState<boolean | null>(false);
  const [localGoals, setLocalGoals] = useState<FinancialGoal[]>([]);
  const [localRiskTolerance, setLocalRiskTolerance] = useState<RiskTolerance | null>(selectedRiskTolerance);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(24);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 70,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();
  }, [step, t]);

  const progress = useMemo(() => step / TOTAL_STEPS, [step]);

  const stepUnlockText = useMemo(() => {
    if (step === 1) return t('profileSetup.unlockState');
    if (step === 2) return t('profileSetup.unlockLifeStage');
    if (step === 3) return t('profileSetup.unlockBudgeting');
    if (step === 4) return t('profileSetup.unlockInsurance');
    return t('profileSetup.unlockGoals');
  }, [step]);

  const canProceed = useMemo(() => {
    if (step === 1) {
      const ageNum = Number(localAge);
      return (
        localFullName.trim().length >= 2
        && localState.trim().length > 0
        && Number.isFinite(ageNum)
        && ageNum >= 18
        && ageNum <= 100
        && localGender !== null
      );
    }
    if (step === 2) return localUserType !== null && localEmploymentType.length > 0;
    if (step === 3) {
      return (
        localIncomeRange.length > 0 &&
        localMonthlyIncome.trim().length > 0 &&
        !isNaN(Number(localMonthlyIncome)) &&
        localHasBankAccount !== null &&
        localIncomeRegular !== null
      );
    }
    if (step === 4) return localHasLand !== null && localHasLifeInsurance !== null && localHasHealthInsurance !== null;
    return localGoals.length > 0 && localRiskTolerance !== null;
  }, [
    step,
    localFullName,
    localState,
    localAge,
    localGender,
    localUserType,
    localEmploymentType,
    localIncomeRange,
    localMonthlyIncome,
    localHasBankAccount,
    localIncomeRegular,
    localHasLand,
    localHasLifeInsurance,
    localHasHealthInsurance,
    localGoals,
    localRiskTolerance,
  ]);

  const inferredAge = useMemo(() => {
    const ageNum = Number(localAge);
    if (Number.isFinite(ageNum) && ageNum >= 18) {
      return ageNum;
    }
    if (localAgeBand === '18-24') return 22;
    if (localAgeBand === '25-34') return 30;
    if (localAgeBand === '35-44') return 39;
    if (localAgeBand === '45-54') return 49;
    return 58;
  }, [localAge, localAgeBand]);

  const toggleGoal = (goal: FinancialGoal) => {
    setLocalGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  };

  const nextStep = () => {
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
    }
  };

  const previousStep = () => {
    if (step > 1) {
      setStep((s) => s - 1);
    }
  };

  const handleSubmit = async () => {
    if (!localUserType || !localRiskTolerance) return;

    updateFullName(localFullName.trim());
    updateUserType(localUserType);
    updateMonthlyIncome(localMonthlyIncome);
    updateRiskTolerance(localRiskTolerance);

    await new Promise((resolve) => setTimeout(resolve, 80));

    const success = await saveProfile({
      city: localCity.trim(),
      state: localState.trim(),
      age: inferredAge,
      ageConfirmed: true,
      ageBand: inferAgeBand(inferredAge),
      gender: localGender || 'other',
      employmentType: localEmploymentType,
      occupation: localEmploymentType,
      householdSize: localHouseholdSize,
      housingStatus: localHousingStatus,
      incomeRange: localIncomeRange,
      incomeRegular: localIncomeRegular ?? true,
      earningMembers: localEarningMembers,
      hasBankAccount: localHasBankAccount ?? true,
      hasLand: localHasLand ?? false,
      financialGoals: localGoals,
      hasLifeInsurance: localHasLifeInsurance ?? false,
      hasHealthInsurance: localHasHealthInsurance ?? false,
      hasPpf: false,
      hasFd: false,
      hasMutualFunds: false,
      hasGoldInvestments: false,
    });

    if (success) {
      navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
    }
  };

  const renderStepContent = () => {
    if (step === 1) {
      return (
        <>
          <Text style={styles.questionTitle}>{t('profileSetup.callName')}</Text>
          <Text style={styles.questionSubtitle}>{t('profileSetup.callNameDesc')}</Text>
          <TextInput
            style={styles.input}
            value={localFullName}
            onChangeText={setLocalFullName}
            placeholder={t('profileSetup.yourName')}
            placeholderTextColor={AIColors.textMuted}
            autoCapitalize="words"
          />

          <Text style={styles.fieldLabel}>{t('profileSetup.city')}</Text>
          <TextInput
            style={styles.input}
            value={localCity}
            onChangeText={setLocalCity}
            placeholder={t('profileSetup.cityPlaceholder')}
            placeholderTextColor={AIColors.textMuted}
            autoCapitalize="words"
          />

          <Text style={styles.fieldLabel}>{t('profileSetup.state')}</Text>
          <TextInput
            style={styles.input}
            value={localState}
            onChangeText={setLocalState}
            placeholder={t('profileSetup.statePlaceholder')}
            placeholderTextColor={AIColors.textMuted}
            autoCapitalize="words"
          />

          <Text style={styles.fieldLabel}>{t('profileSetup.ageBand')}</Text>
          <TextInput
            style={styles.input}
            value={localAge}
            onChangeText={setLocalAge}
            keyboardType="numeric"
            placeholder={t('profileSetup.agePlaceholder')}
            placeholderTextColor={AIColors.textMuted}
          />

          <Text style={styles.fieldLabel}>{t('profileSetup.gender')}</Text>
          <View style={styles.chipWrap}>
            {genderChoices.map((item) => (
              <Chip
                key={item.value}
                label={item.label}
                selected={localGender === item.value}
                onPress={() => setLocalGender(item.value)}
              />
            ))}
          </View>

          <Text style={styles.fieldLabel}>Age band</Text>
          <View style={styles.chipWrap}>
            {ageBandChoices.map((item) => (
              <Chip key={item} label={item} selected={localAgeBand === item} onPress={() => setLocalAgeBand(item)} />
            ))}
          </View>
        </>
      );
    }

    if (step === 2) {
      return (
        <>
          <Text style={styles.questionTitle}>What best describes you today?</Text>
          <Text style={styles.questionSubtitle}>This helps us match life-stage relevant schemes.</Text>

          <View style={styles.chipWrap}>
            {userTypeChoices.map((item) => (
              <Chip
                key={item}
                label={UserTypeLabels[item]}
                selected={localUserType === item}
                onPress={() => setLocalUserType(item)}
              />
            ))}
          </View>

          <Text style={styles.fieldLabel}>Employment type</Text>
          <View style={styles.chipWrap}>
            {employmentChoices.map((item) => (
              <Chip
                key={item.value}
                label={item.label}
                selected={localEmploymentType === item.value}
                onPress={() => setLocalEmploymentType(item.value)}
              />
            ))}
          </View>

          <Text style={styles.fieldLabel}>Household size</Text>
          <View style={styles.chipWrap}>
            {householdSizeChoices.map((count) => (
              <Chip
                key={count}
                label={`${count}`}
                selected={localHouseholdSize === count}
                onPress={() => setLocalHouseholdSize(count)}
              />
            ))}
          </View>

          <Text style={styles.fieldLabel}>Housing</Text>
          <View style={styles.chipWrap}>
            {housingChoices.map((item) => (
              <Chip
                key={item.value}
                label={item.label}
                selected={localHousingStatus === item.value}
                onPress={() => setLocalHousingStatus(item.value)}
              />
            ))}
          </View>
        </>
      );
    }

    if (step === 3) {
      return (
        <>
          <Text style={styles.questionTitle}>Tell us about your monthly cash flow</Text>
          <Text style={styles.questionSubtitle}>Ranges are enough. We avoid unnecessary precision.</Text>

          <Text style={styles.fieldLabel}>Income range</Text>
          <View style={styles.chipWrap}>
            {incomeRangeChoices.map((item) => (
              <Chip
                key={item.value}
                label={item.label}
                selected={localIncomeRange === item.value}
                onPress={() => {
                  setLocalIncomeRange(item.value);
                  setLocalMonthlyIncome(item.monthlyIncomeHint);
                }}
              />
            ))}
          </View>

          <Text style={styles.fieldLabel}>Approx monthly income (optional exact)</Text>
          <TextInput
            style={styles.input}
            value={localMonthlyIncome}
            onChangeText={setLocalMonthlyIncome}
            keyboardType="numeric"
            placeholder="e.g. 40000"
            placeholderTextColor={AIColors.textMuted}
          />

          <Text style={styles.fieldLabel}>Is your income regular?</Text>
          <View style={styles.chipWrap}>
            {yesNoChoices.map((item) => (
              <Chip
                key={`income-${String(item.value)}`}
                label={item.label}
                selected={localIncomeRegular === item.value}
                onPress={() => setLocalIncomeRegular(item.value)}
              />
            ))}
          </View>

          <Text style={styles.fieldLabel}>Do you have a bank account?</Text>
          <View style={styles.chipWrap}>
            {yesNoChoices.map((item) => (
              <Chip
                key={`bank-${String(item.value)}`}
                label={item.label}
                selected={localHasBankAccount === item.value}
                onPress={() => setLocalHasBankAccount(item.value)}
              />
            ))}
          </View>

          <Text style={styles.fieldLabel}>Number of earning members</Text>
          <View style={styles.chipWrap}>
            {earningMemberChoices.map((count) => (
              <Chip
                key={count}
                label={`${count}`}
                selected={localEarningMembers === count}
                onPress={() => setLocalEarningMembers(count)}
              />
            ))}
          </View>
        </>
      );
    }

    if (step === 4) {
      return (
        <>
          <Text style={styles.questionTitle}>Assets and protection snapshot</Text>
          <Text style={styles.questionSubtitle}>These answers improve net-worth and safety-net recommendations.</Text>

          <Text style={styles.fieldLabel}>Do you own agricultural land?</Text>
          <View style={styles.chipWrap}>
            {yesNoChoices.map((item) => (
              <Chip
                key={`land-${String(item.value)}`}
                label={item.label}
                selected={localHasLand === item.value}
                onPress={() => setLocalHasLand(item.value)}
              />
            ))}
          </View>

          <Text style={styles.fieldLabel}>Do you have life insurance?</Text>
          <View style={styles.chipWrap}>
            {yesNoChoices.map((item) => (
              <Chip
                key={`life-${String(item.value)}`}
                label={item.label}
                selected={localHasLifeInsurance === item.value}
                onPress={() => setLocalHasLifeInsurance(item.value)}
              />
            ))}
          </View>

          <Text style={styles.fieldLabel}>Do you have health insurance?</Text>
          <View style={styles.chipWrap}>
            {yesNoChoices.map((item) => (
              <Chip
                key={`health-${String(item.value)}`}
                label={item.label}
                selected={localHasHealthInsurance === item.value}
                onPress={() => setLocalHasHealthInsurance(item.value)}
              />
            ))}
          </View>
        </>
      );
    }

    return (
      <>
        <Text style={styles.questionTitle}>{t('profileSetup.goals')}</Text>
        <Text style={styles.questionSubtitle}>{t('profileSetup.goalsDesc')}</Text>

        <View style={styles.chipWrap}>
          {Object.values(FinancialGoal).map((goal) => (
            <Chip
              key={goal}
              label={FinancialGoalLabels[goal]}
              selected={localGoals.includes(goal)}
              onPress={() => toggleGoal(goal)}
            />
          ))}
        </View>

        <Text style={styles.fieldLabel}>{t('profileSetup.riskComfort')}</Text>
        <View style={styles.chipWrap}>
          {Object.values(RiskTolerance).map((risk) => (
            <Chip
              key={risk}
              label={RiskToleranceLabels[risk]}
              selected={localRiskTolerance === risk}
              onPress={() => setLocalRiskTolerance(risk)}
            />
          ))}
        </View>
      </>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.header}>
            <View style={styles.headerTop}>
              {step > 1 ? (
                <TouchableOpacity onPress={previousStep} style={styles.backButton}>
                  <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.backPlaceholder} />
              )}
              <View style={styles.titleBlock}>
                <Text style={styles.headerTitle}>{t('profileSetup.title')}</Text>
                <Text style={styles.headerSubtitle}>{t('profileSetup.subtitle', { step, total: TOTAL_STEPS })}</Text>
              </View>
            </View>
            <ProgressBar progress={progress} color={AIColors.primary} height={5} />
            <Text style={styles.unlockText}>{stepUnlockText}</Text>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {profileError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{profileError}</Text>
              </View>
            ) : null}

            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
              {renderStepContent()}
            </Animated.View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.continueButton, !canProceed && styles.continueButtonDisabled]}
              disabled={!canProceed || isProfileSaving}
              onPress={step < TOTAL_STEPS ? nextStep : handleSubmit}
              activeOpacity={0.85}
            >
              {isProfileSaving ? (
                <ActivityIndicator color={AIColors.background} size="small" />
              ) : (
                <Text style={styles.continueText}>{step < TOTAL_STEPS ? t('profileSetup.continue') : t('profileSetup.finish')}</Text>
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
  header: {
    paddingHorizontal: AISpacing.xl,
    paddingTop: AISpacing.md,
    paddingBottom: AISpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: AIColors.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: AISpacing.sm,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: AIRadius.md,
    borderWidth: 1,
    borderColor: AIColors.border,
    backgroundColor: AIColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: AISpacing.md,
  },
  backPlaceholder: {
    width: 36,
    height: 36,
    marginRight: AISpacing.md,
  },
  backIcon: {
    fontSize: 18,
    color: AIColors.text,
  },
  titleBlock: {
    flex: 1,
  },
  headerTitle: {
    ...AITypography.h2,
    color: AIColors.text,
  },
  headerSubtitle: {
    ...AITypography.bodySmall,
    color: AIColors.textSecondary,
  },
  unlockText: {
    ...AITypography.labelSmall,
    color: AIColors.primary,
    marginTop: AISpacing.xs,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: AISpacing.xl,
    paddingVertical: AISpacing.lg,
    paddingBottom: 120,
  },
  errorBanner: {
    backgroundColor: AIColors.errorDim,
    borderColor: AIColors.error,
    borderWidth: 1,
    borderRadius: AIRadius.md,
    padding: AISpacing.sm,
    marginBottom: AISpacing.md,
  },
  errorText: {
    ...AITypography.bodySmall,
    color: AIColors.error,
  },
  questionTitle: {
    ...AITypography.h1,
    color: AIColors.text,
    marginBottom: AISpacing.xs,
  },
  questionSubtitle: {
    ...AITypography.body,
    color: AIColors.textSecondary,
    marginBottom: AISpacing.md,
  },
  fieldLabel: {
    ...AITypography.label,
    color: AIColors.textSecondary,
    marginBottom: AISpacing.xs,
    marginTop: AISpacing.md,
  },
  input: {
    borderRadius: AIRadius.md,
    borderWidth: 1,
    borderColor: AIColors.border,
    backgroundColor: AIColors.surface,
    color: AIColors.text,
    paddingHorizontal: AISpacing.md,
    paddingVertical: AISpacing.sm,
    ...AITypography.body,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: AIRadius.full,
    borderWidth: 1,
    borderColor: AIColors.border,
    backgroundColor: AIColors.surface,
    paddingHorizontal: AISpacing.md,
    paddingVertical: 8,
  },
  chipSelected: {
    borderColor: AIColors.primary,
    backgroundColor: AIColors.primaryDim,
  },
  chipText: {
    ...AITypography.labelSmall,
    color: AIColors.textSecondary,
  },
  chipTextSelected: {
    color: AIColors.primary,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: AIColors.border,
    paddingHorizontal: AISpacing.xl,
    paddingVertical: AISpacing.md,
  },
  continueButton: {
    backgroundColor: AIColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: AIRadius.lg,
    paddingVertical: 14,
  },
  continueButtonDisabled: {
    opacity: 0.45,
  },
  continueText: {
    ...AITypography.button,
    color: AIColors.background,
  },
});
