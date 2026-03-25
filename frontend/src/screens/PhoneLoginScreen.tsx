/**
 * Phone Login Screen - Futuristic AI Financial Platform
 * Apple/Stripe inspired dark theme with glassmorphism
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, OtpState } from '../types';
import { useAuthStore } from '../store/authStore';
import { AIColors, AISpacing, AIRadius, AIShadows, AITypography } from '../theme/aiTheme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PhoneLogin'>;
};

export default function PhoneLoginScreen({ navigation }: Props) {
  const { 
    phoneNumber: storePhoneNumber,
    updatePhoneNumber: setStorePhone,
    sendOtp: sendOtpAction,
    otpState,
    verificationId,
    authError, 
    phoneError,
    clearError 
  } = useAuthStore();
  const [phoneNumber, setPhoneNumber] = useState(storePhoneNumber);
  const [isFocused, setIsFocused] = useState(false);

  const isOtpLoading = otpState === OtpState.SENDING;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.8,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    clearError();
  }, []);

  const formatPhoneNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    setPhoneNumber(cleaned.slice(0, 10));
    setStorePhone(cleaned.slice(0, 10));
  };

  const handleSendOtp = async () => {
    if (phoneNumber.length !== 10) return;
    
    clearError();
    const success = await sendOtpAction();
    if (success && verificationId) {
      navigation.navigate('OtpVerification', {
        phoneNumber: `+91${phoneNumber}`,
        verificationId: verificationId,
      });
    }
  };

  // Navigate when OTP is sent and we have verificationId
  useEffect(() => {
    if (otpState === OtpState.SENT && verificationId) {
      navigation.navigate('OtpVerification', {
        phoneNumber: `+91${phoneNumber}`,
        verificationId: verificationId,
      });
    }
  }, [otpState, verificationId]);

  const displayError = phoneError || authError;

  const isValid = phoneNumber.length === 10;

  return (
    <View style={styles.container}>
      {/* Background Elements */}
      <View style={styles.gridPattern}>
        {[...Array(15)].map((_, i) => (
          <View key={`h-${i}`} style={[styles.gridLine, styles.gridHorizontal, { top: i * 60 }]} />
        ))}
      </View>
      <Animated.View style={[styles.glowOrb, { opacity: glowAnim }]} />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
          </View>

          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Icon and Title */}
            <View style={styles.titleSection}>
              <View style={styles.iconContainer}>
                <Text style={styles.phoneIcon}>◎</Text>
              </View>
              <Text style={styles.title}>Enter Your Phone</Text>
              <Text style={styles.subtitle}>
                We'll send you a verification code to confirm your identity
              </Text>
            </View>

            {/* Phone Input */}
            <View style={styles.inputSection}>
              {displayError && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorIcon}>!</Text>
                  <Text style={styles.errorText}>{displayError}</Text>
                </View>
              )}

              <Text style={styles.inputLabel}>MOBILE NUMBER</Text>
              <View style={[
                styles.inputContainer,
                isFocused && styles.inputContainerFocused,
              ]}>
                <View style={styles.countryCode}>
                  <Text style={styles.flag}>🇮🇳</Text>
                  <Text style={styles.countryCodeText}>+91</Text>
                </View>
                <View style={styles.inputDivider} />
                <TextInput
                  style={styles.input}
                  value={phoneNumber}
                  onChangeText={formatPhoneNumber}
                  placeholder="9876543210"
                  placeholderTextColor={AIColors.textMuted}
                  keyboardType="phone-pad"
                  maxLength={10}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                />
                {isValid && (
                  <View style={styles.validBadge}>
                    <Text style={styles.validIcon}>✓</Text>
                  </View>
                )}
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoIcon}>🔒</Text>
                <Text style={styles.infoText}>
                  Your number is secure and will only be used for verification
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.continueButton,
                !isValid && styles.continueButtonDisabled,
              ]}
              onPress={handleSendOtp}
              disabled={!isValid || isOtpLoading}
              activeOpacity={0.85}
            >
              {isOtpLoading ? (
                <ActivityIndicator color={AIColors.background} size="small" />
              ) : (
                <>
                  <Text style={[
                    styles.continueButtonText,
                    !isValid && styles.continueButtonTextDisabled,
                  ]}>
                    Send Verification Code
                  </Text>
                  <Text style={[
                    styles.continueButtonIcon,
                    !isValid && styles.continueButtonTextDisabled,
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
  glowOrb: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: AIColors.primary,
    opacity: 0.1,
  },

  // Header
  header: {
    paddingHorizontal: AISpacing.xl,
    paddingTop: AISpacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: AIRadius.lg,
    backgroundColor: AIColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AIColors.border,
  },
  backIcon: {
    fontSize: 20,
    color: AIColors.text,
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: AISpacing.xl,
    paddingTop: AISpacing.xxl,
  },

  // Title Section
  titleSection: {
    alignItems: 'center',
    marginBottom: AISpacing.xxl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: AIRadius.xl,
    backgroundColor: AIColors.primaryDim,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: AISpacing.lg,
    borderWidth: 1,
    borderColor: AIColors.primary,
  },
  phoneIcon: {
    fontSize: 36,
  },
  title: {
    ...AITypography.h1,
    color: AIColors.text,
    marginBottom: AISpacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...AITypography.body,
    color: AIColors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: AISpacing.lg,
  },

  // Input Section
  inputSection: {
    flex: 1,
  },
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
  inputLabel: {
    ...AITypography.label,
    color: AIColors.textSecondary,
    marginBottom: AISpacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AIColors.surface,
    borderRadius: AIRadius.xl,
    borderWidth: 1.5,
    borderColor: AIColors.border,
    paddingHorizontal: AISpacing.md,
    marginBottom: AISpacing.lg,
  },
  inputContainerFocused: {
    borderColor: AIColors.primary,
    backgroundColor: AIColors.surfaceLight,
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: AISpacing.md,
  },
  flag: {
    fontSize: 20,
    marginRight: AISpacing.xs,
  },
  countryCodeText: {
    ...AITypography.bodyLarge,
    color: AIColors.text,
    fontWeight: '600',
  },
  inputDivider: {
    width: 1,
    height: 24,
    backgroundColor: AIColors.border,
    marginRight: AISpacing.md,
  },
  input: {
    flex: 1,
    ...AITypography.displaySmall,
    color: AIColors.text,
    paddingVertical: AISpacing.lg,
    letterSpacing: 2,
  },
  validBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: AIColors.primaryDim,
    justifyContent: 'center',
    alignItems: 'center',
  },
  validIcon: {
    color: AIColors.primary,
    fontWeight: '700',
  },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AIColors.surface,
    padding: AISpacing.md,
    borderRadius: AIRadius.lg,
    borderWidth: 1,
    borderColor: AIColors.border,
  },
  infoIcon: {
    fontSize: 16,
    marginRight: AISpacing.sm,
  },
  infoText: {
    ...AITypography.bodySmall,
    color: AIColors.textSecondary,
    flex: 1,
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
