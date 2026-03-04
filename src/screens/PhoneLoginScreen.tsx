/**
 * Phone Login Screen
 * Phone number entry for Firebase OTP authentication.
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
      {/* reCAPTCHA container for web - invisible */}
      <View nativeID="recaptcha-container" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Phone Login</Text>
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

          {/* Title */}
          <Text style={styles.title}>Enter Phone Number</Text>
          <Text style={styles.subtitle}>
            We'll send you a 6-digit OTP for verification
          </Text>

          {/* Phone Input Section */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Mobile Number</Text>

            <View style={[
              styles.phoneInputContainer,
              phoneError && styles.inputContainerError
            ]}>
              <View style={styles.countryCode}>
                <Text style={styles.flag}>🇮🇳</Text>
                <Text style={styles.countryCodeText}>+91</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                value={phoneNumber}
                onChangeText={updatePhoneNumber}
                placeholder="Enter 10-digit number"
                placeholderTextColor={Colors.onSurfaceVariant}
                keyboardType="phone-pad"
                maxLength={10}
                editable={!isLoading}
                autoFocus
              />
            </View>

            {phoneError && <Text style={styles.errorText}>{phoneError}</Text>}
          </View>

          {/* Test Mode Notice */}
          <View style={styles.noticeCard}>
            <Text style={styles.noticeIcon}>💡</Text>
            <View style={styles.noticeContent}>
              <Text style={styles.noticeTitle}>Test Mode</Text>
              <Text style={styles.noticeText}>
                For Expo Go: Use OTP "123456" to verify{'\n'}
                Real SMS requires EAS development build
              </Text>
            </View>
          </View>

          {/* Send OTP Button */}
          <TouchableOpacity
            style={[
              styles.button,
              (phoneNumber.length !== 10 || isLoading) && styles.buttonDisabled,
            ]}
            onPress={handleSendOtp}
            disabled={phoneNumber.length !== 10 || isLoading}
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
    paddingTop: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: Colors.onSurface,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  inputSection: {
    marginTop: 32,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.onSurface,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.secondaryLight,
  },
  inputContainerError: {
    borderColor: Colors.error,
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRightWidth: 1,
    borderRightColor: Colors.secondaryLight,
    gap: 8,
  },
  flag: {
    fontSize: 20,
  },
  countryCodeText: {
    fontSize: 16,
    color: Colors.onSurface,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 18,
    color: Colors.onSurface,
    letterSpacing: 1,
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    marginTop: 8,
  },
  noticeCard: {
    flexDirection: 'row',
    backgroundColor: Colors.secondaryContainer,
    borderRadius: 12,
    padding: 14,
    marginTop: 24,
  },
  noticeIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  noticeContent: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.onSecondaryContainer,
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 12,
    color: Colors.onSecondaryContainer,
    lineHeight: 18,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
  },
  buttonDisabled: {
    backgroundColor: Colors.primaryLight,
    opacity: 0.6,
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
});
