/**
 * OTP Verification Screen
 * User enters the 6-digit OTP received (logged to console for testing).
 * Verifies against the generated OTP and navigates accordingly.
 */

import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, OtpState } from '../types';
import { useAuthStore } from '../store/authStore';
import { Colors } from '../theme/colors';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'OtpVerification'>;
};

export default function OtpVerificationScreen({ navigation }: Props) {
  const {
    phoneNumber,
    enteredOtp,
    otpError,
    otpState,
    updateEnteredOtp,
    verifyOtp,
    resendOtp,
  } = useAuthStore();

  const isVerifying = otpState === OtpState.VERIFYING;
  const isSending = otpState === OtpState.SENDING;
  const isLoading = isVerifying || isSending;

  const handleVerifyOtp = async () => {
    const result = await verifyOtp();
    if (result.success) {
      if (result.isNewUser) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'ProfileSetup' }],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Dashboard' }],
        });
      }
    }
  };

  const handleResendOtp = async () => {
    await resendOtp();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verify OTP</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🔒</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>Verification Code</Text>
          <Text style={styles.subtitle}>We've sent a 6-digit code to</Text>
          <Text style={styles.phoneText}>+91 {phoneNumber}</Text>

          {/* Testing Hint */}
          <View style={styles.hintCard}>
            <Text style={styles.hintText}>
              💡 Check console/terminal for OTP (Filter: OTP GENERATED)
            </Text>
          </View>

          {/* OTP Input */}
          <View style={styles.inputSection}>
            <TextInput
              style={[styles.otpInput, otpError && styles.inputError]}
              value={enteredOtp}
              onChangeText={updateEnteredOtp}
              placeholder="Enter 6-digit OTP"
              placeholderTextColor={Colors.onSurfaceVariant}
              keyboardType="number-pad"
              maxLength={6}
              editable={!isLoading}
              textAlign="center"
            />

            {otpError && <Text style={styles.errorText}>{otpError}</Text>}
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            style={[
              styles.button,
              (enteredOtp.length !== 6 || isLoading) && styles.buttonDisabled,
            ]}
            onPress={handleVerifyOtp}
            disabled={enteredOtp.length !== 6 || isLoading}
          >
            {isVerifying ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={Colors.onPrimary} size="small" />
                <Text style={styles.buttonText}>Verifying...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Verify OTP</Text>
            )}
          </TouchableOpacity>

          {/* Resend Section */}
          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn't receive the code?</Text>
            <TouchableOpacity onPress={handleResendOtp} disabled={isLoading}>
              <Text
                style={[styles.resendButton, isLoading && styles.disabledText]}
              >
                {isSending ? 'Sending...' : 'Resend OTP'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 20,
    color: Colors.onPrimary,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.onPrimary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.onSurface,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 8,
  },
  phoneText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
    textAlign: 'center',
    marginTop: 4,
  },
  hintCard: {
    backgroundColor: Colors.secondaryContainer,
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  hintText: {
    fontSize: 12,
    color: Colors.onSecondaryContainer,
    textAlign: 'center',
  },
  inputSection: {
    marginTop: 32,
  },
  otpInput: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.secondaryLight,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 24,
    color: Colors.onSurface,
    letterSpacing: 8,
    fontWeight: '600',
  },
  inputError: {
    borderColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    backgroundColor: Colors.primaryLight,
    opacity: 0.7,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: Colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
  },
  resendText: {
    color: Colors.onSurfaceVariant,
    fontSize: 14,
  },
  resendButton: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  disabledText: {
    opacity: 0.5,
  },
});
