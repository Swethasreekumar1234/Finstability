/**
 * Phone Login Screen
 * Entry point for authentication flow.
 * User enters their 10-digit phone number to receive an OTP.
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
  navigation: NativeStackNavigationProp<RootStackParamList, 'PhoneLogin'>;
};

export default function PhoneLoginScreen({ navigation }: Props) {
  const {
    phoneNumber,
    phoneError,
    otpState,
    updatePhoneNumber,
    sendOtp,
    resetAuthState,
  } = useAuthStore();

  const isLoading = otpState === OtpState.SENDING;

  React.useEffect(() => {
    resetAuthState();
  }, []);

  const handleSendOtp = async () => {
    const success = await sendOtp();
    if (success) {
      navigation.navigate('OtpVerification');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Finstability</Text>
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
            <Text style={styles.icon}>📱</Text>
          </View>

          {/* Welcome Text */}
          <Text style={styles.title}>Welcome to Finstability</Text>
          <Text style={styles.subtitle}>Your personal finance companion</Text>

          {/* Phone Input Section */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Enter your phone number</Text>

            <View style={styles.phoneInputContainer}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>+91</Text>
              </View>
              <TextInput
                style={[styles.phoneInput, phoneError && styles.inputError]}
                value={phoneNumber}
                onChangeText={updatePhoneNumber}
                placeholder="10-digit mobile number"
                placeholderTextColor={Colors.onSurfaceVariant}
                keyboardType="phone-pad"
                maxLength={10}
                editable={!isLoading}
              />
            </View>

            {phoneError && <Text style={styles.errorText}>{phoneError}</Text>}
          </View>

          {/* Send OTP Button */}
          <TouchableOpacity
            style={[
              styles.button,
              (!phoneNumber || isLoading) && styles.buttonDisabled,
            ]}
            onPress={handleSendOtp}
            disabled={!phoneNumber || isLoading}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={Colors.onPrimary} size="small" />
                <Text style={styles.buttonText}>Sending OTP...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Send OTP</Text>
            )}
          </TouchableOpacity>

          {/* Info Text */}
          <Text style={styles.infoText}>
            We'll send you a 6-digit verification code
          </Text>

          {/* Terms */}
          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
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
    paddingHorizontal: 24,
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
  inputSection: {
    marginTop: 48,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.onSurface,
    marginBottom: 8,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.secondaryLight,
  },
  countryCode: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRightWidth: 1,
    borderRightColor: Colors.secondaryLight,
  },
  countryCodeText: {
    fontSize: 16,
    color: Colors.onSurface,
    fontWeight: '500',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.onSurface,
  },
  inputError: {
    borderColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    marginTop: 8,
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
  infoText: {
    textAlign: 'center',
    color: Colors.onSurfaceVariant,
    fontSize: 14,
    marginTop: 16,
  },
  termsContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 24,
    marginTop: 24,
  },
  termsText: {
    textAlign: 'center',
    color: Colors.onSurfaceVariant,
    fontSize: 12,
  },
});
