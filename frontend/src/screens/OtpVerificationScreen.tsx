/**
 * OTP Verification Screen - Futuristic AI Financial Platform
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
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, OtpState } from '../types';
import { useAuthStore } from '../store/authStore';
import { AIColors, AISpacing, AIRadius, AIShadows, AITypography } from '../theme/aiTheme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'OtpVerification'>;
  route: RouteProp<RootStackParamList, 'OtpVerification'>;
};

const OTP_LENGTH = 6;

export default function OtpVerificationScreen({ navigation, route }: Props) {
  const { phoneNumber, verificationId } = route.params;
  const { 
    verifyOtp: verifyOtpAction, 
    resendOtp,
    updateEnteredOtp,
    otpState,
    otpError,
    authError, 
    clearError 
  } = useAuthStore();
  
  const isOtpLoading = otpState === OtpState.VERIFYING;
  const displayError = otpError || authError;
  
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [currentVerificationId, setCurrentVerificationId] = useState(verificationId);
  
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

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

    // Start timer
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    clearError();
    inputRefs.current[0]?.focus();
  }, []);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const pastedOtp = value.slice(0, OTP_LENGTH).split('');
      const newOtp = [...otp];
      pastedOtp.forEach((char, i) => {
        if (index + i < OTP_LENGTH) {
          newOtp[index + i] = char;
        }
      });
      setOtp(newOtp);
      inputRefs.current[Math.min(index + pastedOtp.length, OTP_LENGTH - 1)]?.focus();
    } else {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      if (value && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpString = otp.join('');
    if (otpString.length !== OTP_LENGTH) return;

    // Pulse animation
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    clearError();
    updateEnteredOtp(otpString);
    const result = await verifyOtpAction();
    if (result.success) {
      navigation.reset({
        index: 0,
        routes: [{ name: result.isNewUser ? 'ProfileSetup' : 'Dashboard' }],
      });
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    
    clearError();
    setOtp(Array(OTP_LENGTH).fill(''));
    setCanResend(false);
    setResendTimer(30);
    
    await resendOtp();
    inputRefs.current[0]?.focus();
  };

  const isComplete = otp.every((digit) => digit !== '');
  const maskedPhone = phoneNumber.replace(/(\+91)(\d{3})(\d{4})(\d{3})/, '$1 $2 $3 $4');

  return (
    <View style={styles.container}>
      {/* Background Elements */}
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
            {/* Title Section */}
            <View style={styles.titleSection}>
              <View style={styles.iconContainer}>
                <Text style={styles.shieldIcon}>◈</Text>
              </View>
              <Text style={styles.title}>Verify Your Number</Text>
              <Text style={styles.subtitle}>
                Enter the 6-digit code sent to
              </Text>
              <View style={styles.phoneBadge}>
                <Text style={styles.phoneText}>{maskedPhone}</Text>
              </View>
            </View>

            {/* Error */}
            {displayError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorIcon}>!</Text>
                <Text style={styles.errorText}>{displayError}</Text>
              </View>
            )}

            {/* OTP Input */}
            <Animated.View style={[styles.otpContainer, { transform: [{ scale: pulseAnim }] }]}>
              {otp.map((digit, index) => (
                <View key={index} style={styles.otpInputWrapper}>
                  <TextInput
                    ref={(ref) => (inputRefs.current[index] = ref)}
                    style={[
                      styles.otpInput,
                      digit && styles.otpInputFilled,
                    ]}
                    value={digit}
                    onChangeText={(value) => handleOtpChange(index, value)}
                    onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                  />
                  {index === 2 && <View style={styles.otpDash} />}
                </View>
              ))}
            </Animated.View>

            {/* Resend */}
            <View style={styles.resendSection}>
              {canResend ? (
                <TouchableOpacity onPress={handleResend} disabled={isOtpLoading}>
                  <Text style={styles.resendActiveText}>
                    Didn't receive code? <Text style={styles.resendLink}>Resend</Text>
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.resendText}>
                  Resend code in <Text style={styles.timerText}>{resendTimer}s</Text>
                </Text>
              )}
            </View>
          </Animated.View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.verifyButton,
                !isComplete && styles.verifyButtonDisabled,
              ]}
              onPress={handleVerify}
              disabled={!isComplete || isOtpLoading}
              activeOpacity={0.85}
            >
              {isOtpLoading ? (
                <ActivityIndicator color={AIColors.background} size="small" />
              ) : (
                <>
                  <Text style={[
                    styles.verifyButtonText,
                    !isComplete && styles.verifyButtonTextDisabled,
                  ]}>
                    Verify & Continue
                  </Text>
                  <Text style={[
                    styles.verifyButtonIcon,
                    !isComplete && styles.verifyButtonTextDisabled,
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
    marginBottom: AISpacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: AIRadius.xl,
    backgroundColor: AIColors.secondaryDim,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: AISpacing.lg,
    borderWidth: 1,
    borderColor: AIColors.secondary,
  },
  shieldIcon: {
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
  },
  phoneBadge: {
    marginTop: AISpacing.sm,
    paddingHorizontal: AISpacing.md,
    paddingVertical: AISpacing.xs,
    backgroundColor: AIColors.surface,
    borderRadius: AIRadius.full,
    borderWidth: 1,
    borderColor: AIColors.border,
  },
  phoneText: {
    ...AITypography.body,
    color: AIColors.text,
    fontWeight: '600',
    letterSpacing: 1,
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

  // OTP Input
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: AISpacing.xl,
    gap: AISpacing.sm,
  },
  otpInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  otpInput: {
    width: 48,
    height: 60,
    backgroundColor: AIColors.surface,
    borderRadius: AIRadius.lg,
    borderWidth: 1.5,
    borderColor: AIColors.border,
    ...AITypography.displaySmall,
    color: AIColors.text,
    textAlign: 'center',
  },
  otpInputFilled: {
    borderColor: AIColors.primary,
    backgroundColor: AIColors.primaryDim,
  },
  otpDash: {
    width: 12,
    height: 2,
    backgroundColor: AIColors.border,
    marginHorizontal: AISpacing.xs,
  },

  // Resend
  resendSection: {
    alignItems: 'center',
  },
  resendText: {
    ...AITypography.body,
    color: AIColors.textSecondary,
  },
  timerText: {
    color: AIColors.primary,
    fontWeight: '600',
  },
  resendActiveText: {
    ...AITypography.body,
    color: AIColors.textSecondary,
  },
  resendLink: {
    color: AIColors.primary,
    fontWeight: '600',
  },

  // Footer
  footer: {
    paddingHorizontal: AISpacing.xl,
    paddingVertical: AISpacing.lg,
    borderTopWidth: 1,
    borderTopColor: AIColors.border,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AIColors.primary,
    paddingVertical: AISpacing.lg,
    borderRadius: AIRadius.lg,
    ...AIShadows.glow,
  },
  verifyButtonDisabled: {
    backgroundColor: AIColors.surface,
    shadowOpacity: 0,
  },
  verifyButtonText: {
    ...AITypography.button,
    color: AIColors.background,
    fontWeight: '600',
  },
  verifyButtonTextDisabled: {
    color: AIColors.textMuted,
  },
  verifyButtonIcon: {
    fontSize: 18,
    color: AIColors.background,
    marginLeft: AISpacing.sm,
  },
});
